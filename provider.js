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

//TransactionSchema.method({
//   valueToPerson: function(person) {
//       if (person.facebook_id.valueOf() === this.to.facebook_id.valueOf()) {
//           return this.amount;
//       } else {
//           return this.amount * -1;
//       }
//   }
//});

PersonSchema.method({
    getTransactions: function(callback) {
        Transaction
            .find({ $or: [{ to: this._id }, { from: this._id }]})
            .populate('to')
            .populate('from')
            .run(function(err, transactions) {
                callback(transactions)
            });
    },
    getBalances: function(callback) {
        var person = this;

        function counterparty(transaction) {
            if (person.facebook_id.valueOf() === transaction.to.facebook_id.valueOf()) { // TODO: Implement an 'equals' method
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
                    var amount = _(transactions)
                        .chain()
                        //.pluck('amount')
                        .reduce(function(sum, transaction) {
                            return sum + valueToPerson(person, transaction);
                        }, 0).value();

                    return {
                        counterparty: counterparty(_.first(transactions)),
                        amount: amount
                    };
                })
                .value();

            callback(balances);
        })
    }
});

// Helper functions

function valueToPerson(person, transaction) {
    if (person.facebook_id.valueOf() === transaction.to.facebook_id.valueOf()) { // TODO: Implement an 'equals' method
        return transaction.amount * -1;
    } else {
        return transaction.amount;
    }
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

var Transaction;
var Person;

exports.connect = function(host, port, db_name, user, password, callback) {
    mongoose.connect('mongodb://' + user + ':' + password + '@' + host + ':' + port + '/' + db_name, function(err) {
        Transaction = mongoose.model('Transaction', TransactionSchema);
        Person = mongoose.model('Person', PersonSchema);

        callback(new Provider());
    });
};