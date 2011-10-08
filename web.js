var express = require('express');
var https = require('https');

var app = express.createServer();
app.register('.html', require('ejs')); // Files ending with ".html" should use EJS templating engine
app.use(express.cookieParser());
app.set('view options', {
    layout: false // Don't use a layout for now
});

app.get('/', function(request, response) {
    console.log("User requested '/'");
    var facebookCookie = request.cookies['fbs_133133700120767'];

    if (facebookCookie) {
        https.get({
            host: 'graph.facebook.com',
            path: '/me?' + facebookCookie
        }, function(fbResponse) {
            if (fbResponse.statusCode === 200) {
                response.render(__dirname + '/index.html');
            } else {
                response.render(__dirname + '/error.html');
            }
        });
    } else {
        response.render(__dirname + '/login.html');
    }
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("Listening on " + port);
});