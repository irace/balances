var _ = require('underscore')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Schema

// TODO: Possible to make these immutable?
// TODO: Add default date
var TransactionSchema = new Schema({
    comment         : { type: String, trim: true }
  , amount          : { type: Number, required: true }
  , from            : { type: ObjectId, ref: 'Person', required: true }
  , to              : { type: ObjectId, ref: 'Person', required: true }
  , date            : Date
});

var PersonSchema = new Schema({
    name            : { type: String, required: true }
  , facebook_id     : { type: Number, required: true, index: { unique: true } }
});

TransactionSchema.method({
    valueToPerson: function(person) {
        if (person.facebook_id.valueOf() === this.to.facebook_id.valueOf()) { // TODO: Implement an 'equals' method
            return this.amount * -1;
        } else {
            return this.amount;
        }
    }
});

PersonSchema.method({
    // TODO: Sort by date
    getTransactions: function(callback) {
        Transaction
            .find({ $or: [{ to: this._id }, { from: this._id }]})
            .populate('to')
            .populate('from')
            .run(function(err, transactions) {
                callback(transactions)
            });
    },
    getBalanceAndTransactionsWithPerson: function(person, callback) {
        var user = this;

        Transaction
            .find({ $or: [{ to: person._id, from: user._id }, { to: user._id, from: person._id }]})
            .populate('to')
            .populate('from')
            .run(function(err, transactions) {
                callback({
                    transactions: transactions,
                    balance: balanceForTransactions(transactions, user)
                })
            });
    },
    getBalances: function(callback) {
        var user = this;

        function counterparty(transaction) {
            if (user.facebook_id.valueOf() === transaction.to.facebook_id.valueOf()) { // TODO: Implement an 'equals' method
                return transaction.from;
            } else {
                return transaction.to;
            }
        }

        this.getTransactions(function(transactions) {
            var balances = _(transactions)
                .chain()
                .groupBy(function(transaction) {
                     return counterparty(transaction).facebook_id;
                })
                .values()
                .map(function(transactions) {
                    return {
                        counterparty: counterparty(_.first(transactions)),
                        amount: balanceForTransactions(transactions, user)
                    };
                })
                .value();

            callback(balances);
        })
    }
});

// Helper functions

function balanceForTransactions(transactions, person) {
    return _(transactions)
        .chain()
        .reduce(function(sum, transaction) {
            return sum + transaction.valueToPerson(person);
        }, 0).value();
}

// API

var Provider = function() {};
    
Provider.prototype.findPersonByFacebookId = function(id, callback) {
    Person.findOne({ facebook_id: id }, function(err, person) {
        callback(person);
    });
};

Provider.prototype.newPerson = function(object) {
    var person = new Person(object);
    person.save(function(err) {
        if (err) {
            console.log(err);
        } else {
           console.log('Person created: ' + person); // TODO: Implement a 'toString' method
       }
    });

    return person;
};

Provider.prototype.newTransaction = function(object) {
    var transaction = new Transaction(object);
    transaction.save(function(err) {
       if (err) {
           console.log(err);
       } else {
           console.log('Transaction created: ' + transaction); // TODO: Implement a 'toString' method
       }
    });

    return transaction;
};

Provider.prototype.findAllPersons = function(callback) {
    Person.find({}, function(err, persons) {
        callback(persons);
    });
};

var Transaction;
var Person;

exports.connect = function(host, port, db_name, user, password, callback) {
    mongoose.connect('mongodb://' + user + ':' + password + '@' + host + ':' + port + '/' + db_name, function(err) {
        Transaction = mongoose.model('Transaction', TransactionSchema);
        Person = mongoose.model('Person', PersonSchema);

        callback(new Provider());
    });
};