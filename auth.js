var https = require('https');

var provider; // TODO: How do I make this an instance variable rather than part of the module?

var Authenticator = function(p) {
    provider = p;
};

Authenticator.prototype.isAuthenticated = function(request) {
    return (request.session.fb_user || facebookCookie(request)) ? true : false;
};

Authenticator.prototype.authorize = function(request, callback) {
    var findUserByFacebookId = function() {
        provider.findPersonByFacebookId(request.session.fb_user.id, function(person) {
            if (person) {
                request.user = person; // Found a user with the email address - store it on the request
                callback(null);

            } else {
                callback({ message: 'You are not authorized to use this application.' });
            }
        });
    };

    if (request.session.fb_user) {
         findUserByFacebookId();

    } else {
        getFacebookUser(facebookCookie(request), function(user) {
            request.session.fb_user = user;

            findUserByFacebookId();
        });
    }
};

function facebookCookie(request) {
    return request.cookies['fbs_' + process.env.BALANCES_FACEBOOK_APP_ID];
}

function getFacebookUser(cookie, callback) {
    // Request a user object from Facebook Open Graph, using the given cookie
    https.get({ host: 'graph.facebook.com', path: '/me?' + cookie }, function(response) {
        response.on('data', function(data) {
            callback(JSON.parse(data));
        });
    });
}

exports.Authenticator = Authenticator;