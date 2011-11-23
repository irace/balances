var express = require('express')
  , Authenticator = require('./auth.js').Authenticator;

var app = express.createServer();

app.configure(function() {
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/views');
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret'}));
    app.use(express.static(__dirname + '/public'));
});

var graph;

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    var FacebookGraph = require('./graph-mock.js').FacebookGraph;
    graph = new FacebookGraph();
});

app.configure('production', function() {
    app.use(express.errorHandler());
    var FacebookGraph = require('./graph.js').FacebookGraph;
    graph = new FacebookGraph();
});

app.get('/', authorize, function(request, response) {
    request.user.getBalances(function(balances) {
        response.render('balances', {
            locals: {
                balances: balances
            }
        });
    });
});

app.get('/person/:id', authorize, function(request, response) {
    provider.findPersonByFacebookId(request.params.id, function(person) {
        request.user.getBalanceAndTransactionsWithPerson(person, function(result) {
            response.render('person', {
                locals: {
                    user: request.user,
                    person: person,
                    balance: result.balance,
                    transactions: result.transactions
                }
            });
        });
    });
});

// Middleware function for retrieving user object from cookie
function authorize(request, response, next) {
    if (!authenticator.isAuthenticated(request)) {
        response.render('login');
        return;
    }

    authenticator.authorize(request, function(err) {
        if (err) {
            response.render('error', {
                error: err
            });

            return;
        }

        next();
    });
}

var port = process.env.PORT || 3000;

var provider;
var authenticator;

require('./provider.js').connect(process.env.BALANCES_DB_HOST, process.env.BALANCES_DB_PORT,
    process.env.BALANCES_DB_NAME, process.env.BALANCES_DB_USER, process.env.BALANCES_DB_PASSWORD, function(p) {
        provider = p;
        authenticator = new Authenticator(provider, graph);

        app.listen(port, function() {
            console.log("Listening on port " + port);
        });
    });