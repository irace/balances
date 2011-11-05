var express = require('express')
  , https = require('https');

var app = express.createServer();
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.use(express.cookieParser());
app.use(express.session({secret: 'secret'}));
app.use(express.static(__dirname + '/public'));

// TODO: Cleanup Facebook API usage
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

// Middleware function for retrieving user object from cookie
function authorize(request, response, next) {
    var lookup_db_user_from_session_user_email = function() {
        // Find the user in database with the same email address as the Facebook user in the session
        provider.findPersonByFacebookId(request.session.fb_user.id, function(db_user) {
            if (db_user) {
                console.log('User is authorized');
                request.db_user = db_user; // Found a user with the email address - store it on the request
                next(); // Pass control to the next route handler
            } else { // No user in the database for the given email address
                console.log('User is not authorized');
                response.render('error'); // TODO: Create this
            }
        });
    };

    if (request.session.fb_user) { // Facebook user is already stored in the session
        lookup_db_user_from_session_user_email();
    } else {
        var cookie = request.cookies['fbs_' + process.env.BALANCES_FACEBOOK_APP_ID];

        if (cookie) {
            lookup_fb_user(cookie, function(fb_user) {
                if (fb_user) {
                    console.log('User is ' + fb_user.email);
                    request.session.fb_user = fb_user; // Store Facebook user in the session

                    lookup_db_user_from_session_user_email();
                } else { // Received an error from the Facebook API request
                    console.log('Unable to retrieve user from Facebook');
                    response.render('error'); // TODO: Create this
                }
            });
        } else { // User does not currently have a Facebook cookie
            console.log('User is not logged in');
            response.render('login');
        }
    }
}

app.get('/', authorize, function(request, response) {
    request.db_user.getBalances(function(balances) {
        response.render('balances', {
            locals: {
                balances: balances
            }
        });
    });
});

app.get('/person/:id', authorize, function(request, response) {
    provider.findPersonByFacebookId(request.params.id, function(person) {
        response.render('person', {
            locals: {
                person: person
            }
        });
    });
});

var port = process.env.PORT || 3000;

var provider;

require('./provider.js').connect(process.env.BALANCES_DB_HOST, process.env.BALANCES_DB_PORT,
    process.env.BALANCES_DB_NAME, process.env.BALANCES_DB_USER, process.env.BALANCES_DB_PASSWORD, function(p) {
        provider = p;

        app.listen(port, function() {
            console.log("Listening on port " + port);
        });
    });