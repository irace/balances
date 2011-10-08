var app = require('express').createServer();

app.get('/', function(req, res){
  res.send('Hello, world!');
});

var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});