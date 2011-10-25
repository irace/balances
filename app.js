var express = require('express');
var https = require('https');
var mongodb = require('mongodb');

var app = express.createServer();
app.set('view engine', 'ejs');
app.use("/public", express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.session({secret: 'secret'}));

var db_server = new mongodb.Server(process.env.DEBTS_MONGODB_HOST, 10078);
var db_client = new mongodb.Db(process.env.DEBTS_MONGODB_NAME, db_server);
db_client.open(function(err, db) {
    db.authenticate(process.env.DEBTS_MONGODB_USER, process.env.DEBTS_MONGODB_PASSWORD, function() {
        console.log('Connected and authenticated to database');
    });
});

function view(name) {
    return __dirname + '/views/' + name;
}

function lookup_fb_user(cookie, callback) {
    // Request a user object from Facebook's Open Graph API, using the given cookie
    https.get({
        host: 'graph.facebook.com', path: '/me?' + cookie
    }, function(fb_response) {
        if (fb_response.statusCode === 200) {
            fb_response.on('data', function(data) {
                callback(JSON.parse(data));
            });
        } else {
            callback(null);
        }
    });
}

function lookup_db_user(email_address, callback) {
    // Find the user with the given email address in the database
    db_client.collection('Users', function(err, collection) {
        collection.findOne({email: email_address}, function(err, db_user) {
            callback(db_user);
        });
    });
}

// Middleware function for retrieving user object from cookie
function authorize(request, response, next) {
    var lookup_db_user_from_session_user_email = function() {
        // Find the user in database with the same email address as the Facebook user in the session
        lookup_db_user(request.session.fb_user.email, function(db_user) {
            if (db_user) {
                console.log('User is authorized');
                request.db_user = db_user; // Found a user with the email address - store it on the request
                next(); // Pass control to the next route handler
            } else { // No user in the database for the given email address
                console.log('User is not authorized');
                response.render(view('error'));
            }
        });
    };

    if (request.session.fb_user) { // Facebook user is already stored in the session
        lookup_db_user_from_session_user_email();
    } else {
        var cookie = request.cookies['fbs_' + process.env.DEBTS_FACEBOOK_APP_ID];

        if (cookie) {
            lookup_fb_user(cookie, function(fb_user) {
                if (fb_user) {
                    console.log('User is ' + fb_user.email);
                    request.session.fb_user = fb_user; // Store Facebook user in the session

                    lookup_db_user_from_session_user_email();
                } else { // Received an error from the Facebook API request
                    console.log('Unable to retrieve user from Facebook');
                    response.render(view('error'));
                }
            });
        } else { // User does not currently have a Facebook cookie
            console.log('User is not logged in');
            response.render(view('login'));
        }
    }
}

app.get('/', authorize, function(request, response) {
    console.log('DB user ID: ' + request.db_user._id);
    console.log('FB user first name: ' + request.session.fb_user.first_name);

    response.render(view('index'));
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("Listening on port " + port);
});