var _ = require('underscore')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

// Schema

// TODO: Possible to make these immutable?
var TransactionSchema = new Schema({
    comment         : { type: String, required: true, trim: true }
  , amount          : { type: Number, required: true }
  , from            : { type: ObjectId, ref: 'Person', required: true }
  , to              : { type: ObjectId, ref: 'Person', required: true }
  , date            : { type: Date, default: Date.now }
  , paid            : { type: Boolean, default: false }
});

var PersonSchema = new Schema({
    name            : { type: String, required: true }
  , facebook_id     : { type: Number, required: true, index: { unique: true } }
});

TransactionSchema.method({
    isCreatedByPerson: function(person) {
        return person.facebook_id.valueOf() === this.from.facebook_id.valueOf(); // TODO: Implement an 'equals' method
    },
    valueToPerson: function(person) {
        if (this.isCreatedByPerson(person)) {
            return this.amount;
        } else {
            return this.amount * -1;
        }
    },
    counterparty: function(person) {
        if (!this.isCreatedByPerson(person)) {
            return this.from;
        } else {
            return this.to;
        }
    }
});

PersonSchema.method({
    getTransactions: function(callback) {
        Transaction
            .find({ $or: [{ to: this._id }, { from: this._id }]})
            .sort('date', 'descending')
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
            .sort('date', 'descending')
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

        this.getTransactions(function(transactions) {
            var balances = _(transactions)
                .chain()
                .groupBy(function(transaction) {
                     return transaction.counterparty(user).facebook_id;
                })
                .values()
                .map(function(transactions) {
                    return {
                        counterparty: _.first(transactions).counterparty(user),
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
        .filter(function(transaction) {
            return !transaction.get('paid');
        }).reduce(function(sum, transaction) {
            return sum + transaction.valueToPerson(person);
        }, 0)
        .value();
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

Provider.prototype.findTransactionById = function(transaction_id, callback) {
    Transaction
        .findById(transaction_id)
        .populate('to')
        .populate('from')
        .run(function(err, transaction) {
            callback(transaction);
        });
};

Provider.prototype.payTransaction = function(transaction, callback) {
    transaction.set('paid', true);
    transaction.save();
    callback();
};

Provider.prototype.deleteTransaction = function(transaction, callback) {
    transaction.remove();
    callback();
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