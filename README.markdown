# About
Balances is an app for keeping track of money you owe and is owed to you.

In addition to being a much-needed tool, my primary motivation for building Balances was to learn a few new technologies:

* The server-side component is built on the [Node.js](http://nodejs.org) platform, using the [Express](http://expressjs.com) web framework and [Jade](http://jade-lang.org) templating language
* The user interface is implemented using [jQuery Mobile](http://jquerymobile.com)
* The [Facebook Open Graph API](https://developers.facebook.com) is used for authentication
* [MongoDB](http://mongodb.org) is used for data storage, with [Mongoose](http://mongoosejs.com) for the ODM layer

# Configuration
Balances can be run in any Node.js environment (e.g. Heroku) but requires the following environment variables to be set:

* `BALANCES_DB_HOST`
* `BALANCES_DB_PORT`
* `BALANCES_DB_USER`
* `BALANCES_DB_PASSWORD`
* `BALANCES_FACEBOOK_APP_ID`
* `NODE_ENV` (`development` or `production`)

# Schema
The Balances MongoDB schema looks as follows:

```javascript
// "people" collection
{
    name: "Bryan Irace",
    facebook_id: 1607387,
    _id: "4eb5b862bb4085bb84000001"
}

// "balances" collection
{
    amount: 63
    from: { "$oid": "4eb5b862bb4085bb84000003" },
    to: { "$oid": "4eb5b862bb4085bb84000002" },
    comment: "Bowling",
    _id: "4edd8675e56d29bd59000004",
    paid: false,
    date: 2011-12-06 03:05:25 UTC
}
```

Your database can be seeded using the `provider` module and some code like the following:

```javascript
require('../provider.js').connect(process.env.BALANCES_DB_HOST, process.env.BALANCES_DB_PORT, 
        process.env.BALANCES_DB_NAME, process.env.BALANCES_DB_USER, process.env.BALANCES_DB_PASSWORD, function(provider) {
    function seedTransactions(bryan, mark, bobby) {  
        provider.newTransaction({ amount: 63, from: bobby._id, to: mark._id, comment: 'Bowling' });
        provider.newTransaction({ amount: 63, from: bobby._id, to: bryan._id, comment: 'Bowling' });
    }
	      
     seedPersons(provider, seedTransactions);
});

function seedPersons(provider, callback) {
    var bryan = provider.newPerson({ name : 'Bryan', facebook_id: 7387160 });
    var mark = provider.newPerson({ name : 'Mark', facebook_id: 7191814 });
    var bobby = provider.newPerson({ name : 'Bobby', facebook_id: 5741613 });

    callback(bryan, mark, bobby);
}

// Use this if persons have already been created
function findPersons(provider, callback) {
    provider.findPersonByFacebookId(7387160, function(bryan) {
        provider.findPersonByFacebookId(5741613, function(bobby) {
            provider.findPersonByFacebookId(7191814, function(mark) {
                callback(bryan, mark, bobby);
            });
        });
    });
}
```

# License
Available for use under the MIT license: [http://bryan.mit-license.org](http://bryan.mit-license.org)