var express = require('express'), https = require('https');

var app = express.createServer();
app.set('view engine', 'ejs');
app.use(express.cookieParser());
app.use("/static", express.static(__dirname + '/static'));

app.get('/', function(request, response) {
    var cookie = request.cookies['fbs_133133700120767'];

    if (cookie) {
        https.get({
            host: 'graph.facebook.com',
            path: '/me?' + cookie
        }, function(fbResponse) {
            if (fbResponse.statusCode === 200) {
                response.render(template('index'));
            } else {
                response.render(template('error'));
            }
        });
    } else {
        response.render(template('login'));
    }
});

function template(name) {
    return __dirname + '/templates/' + name;
}

var port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("Listening on: " + port);
});