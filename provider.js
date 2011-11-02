var _ = require('underscore')
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var TransactionSchema = new Schema({
    comment         : { type: String, trim: true }
  , amount          : { type: Number, required: true }
  , from            : { type: ObjectId, ref: 'Person', required: true }
  , to              : { type: ObjectId, ref: 'Person', required: true }
  , date            : Date
  , offset          : Boolean
});

var PersonSchema = new Schema({
    name            : { type: String, required: true }
  , facebook_id     : { type: Number, required: true, index: { unique: true } }
});

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
            if (person.facebook_id === transaction.to.facebook_id) { // This isn't working - Mongoose objects are weird
                return transaction.from;
            } else {
                return transaction.to;
            }
        }

        this.getTransactions(function(transactions) {
            var balances = _(transactions)
                .chain()
                .groupBy(function(transaction) {
                    return counterparty(transaction);
                })
                .values()
                .map(function(transactions) {
                    var amount = _(transactions)
                        .chain()
                        .pluck('amount')
                        .reduce(function(transactionAmount1, transactionAmount2) {
                            return transactionAmount1 + transactionAmount2;
                        }).value();

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

var Transaction;
var Person;

var Provider = function(user, password, host, port, db_name) {
    mongoose.connect('mongodb://' + user + ':' + password + '@' + host + ':' + port + '/' + db_name, function(err) {
        if (err) {
            console.log(err);
        } else {
            Transaction = mongoose.model('Transaction', TransactionSchema);
            Person = mongoose.model('Person', PersonSchema);
        }
    });
};

function findPersonByFacebookId(id, callback) {
    Person.findOne({ facebook_id: id }, function(err, person) {
        callback(person);
    });
}

Provider.prototype.findPersonByFacebookId = findPersonByFacebookId;

Provider.prototype.newTransaction()

exports.Provider = Provider;