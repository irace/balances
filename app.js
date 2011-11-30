var express         = require('express')
  , Authenticator   = require('./auth.js').Authenticator
  , _               = require('underscore')
  , dateFormat      = require('dateformat');

// Setup

var app = express.createServer(
    express.cookieParser()
  , express.bodyParser()
  , express.session({secret: 'secret'})
  , express.static(__dirname + '/public')
);

app.configure(function() {
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/views');
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

// Routing

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
                    person: person,
                    balance: result.balance,
                    transactions: result.transactions
                }
            });
        });
    });
});

app.get('/person/:id/add', authorize, function(request, response) {
    getPersonOptions(request.user.facebook_id, function(person_options) {
        response.render('add', {
            locals : {
                person_options: person_options,
                selected_person_id: parseInt(request.params.id)
            }
        });
    });
});

app.get('/add', authorize, function(request, response) {
    getPersonOptions(request.user.facebook_id, function(person_options) {
        response.render('add', {
            locals : {
                person_options: person_options
            }
        });
    });
});

function getPersonOptions(user_facebook_id, callback) {
    provider.findAllPersons(function(persons) {
        var filtered_persons = _(persons).filter(function(person) {
            return person.facebook_id.valueOf() !== user_facebook_id.valueOf()
        });

        callback(filtered_persons);
    });
}

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

    response.redirect('/');
});

app.get('/edit/:id', authorize, function(request, response) {
    provider.findTransactionById(request.params.id, function(transaction) {
        response.render('edit', {
            locals: {
                transaction: transaction
            }
        })
    });
});

app.get('/delete/:id', authorize, function(request, response) {
    // TODO: Only person owed money can delete

    provider.deleteTransactionById(request.params.id, function() {
        response.redirect('/');
    });
});

app.get('/pay/:id', authorize, function(request, response) {
    // TODO: Only person owed money can mark as paid

    provider.payTransactionById(request.params.id, function() {
        response.redirect('/');
    });
});

// View helpers

app.helpers({
    dateFormat: dateFormat
});

app.dynamicHelpers({
    currentUser: function(request, response) {
        return request.user;
    }
});

// Middleware functions

function authorize(request, response, next) {
    if (!authenticator.isAuthenticated(request)) {
        return response.render('login');
    }

    return authenticator.authorize(request, function(err) {
        if (err) {
            return response.render('error', {
                locals: {
                    error: err
                }
            });
        }

        return next();
    });
}

// Startup

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