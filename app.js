var express         = require('express')
  , Authenticator   = require('./auth.js').Authenticator
  , _               = require('underscore');

var app = express.createServer();

app.configure(function() {
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/views');
    app.use(express.cookieParser());
    app.use(express.bodyParser());
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

app.get('/person/:id/add', authorize, function(request, response) {
    provider.findAllPersons(function(persons) {
        response.render('add', {
            locals : {
                person_options: _(persons).filter(function(person) {
                    return person.facebook_id.valueOf() !== request.user.facebook_id.valueOf()
                }),
                selected_person_id: parseInt(request.params.id)
            }
        });
    });
});

// TODO: Add API point to allow for adding balance without specifying a user first

app.post('/add', authorize, function(request, response) {
    var createTransactionWithPersonWithFacebookId = function(facebook_id) {
        provider.findPersonByFacebookId(facebook_id, function(person) {
            provider.newTransaction({
                amount: request.body.amount,
                from: request.user._id,
                to: person._id,
                comment: request.body.comments
            });
        });
    };

    if (_(request.body.person).isArray()) {
        _(request.body.person).each(createTransactionWithPersonWithFacebookId);
    } else {
        createTransactionWithPersonWithFacebookId(request.body.person);
    }

    response.redirect('home');
});

function authorize(request, response, next) {
    if (!authenticator.isAuthenticated(request)) {
        return response.render('login');
    }

    return authenticator.authorize(request, function(err) {
        if (err) {
            return response.render('error', {
                error: err
            });
        }

        return next();
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