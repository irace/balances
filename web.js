var app = require('express').createServer();
app.register('.html', require('ejs')); // Files ending with ".html" should use EJS templating engine

app.set('view options', {
    layout: false // Don't use a layout for now
});

app.get('/', function(request, response) {
    response.render(__dirname + '/index.html');
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
    console.log("Listening on " + port);
});