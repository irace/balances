var https = require('https');

var FacebookGraph = function() {};

FacebookGraph.prototype.isAuthenticated = function(request) {
    return (request.session.fb_user || facebookCookie(request)) ? true : false;
};

FacebookGraph.prototype.getFacebookId = function(request, callback) {
    if (request.session.fb_user) {
         callback(request.session.fb_user.id);

    } else {
        getFacebookUser(facebookCookie(request), function(user) {
            request.session.fb_user = user;

            callback(request.session.fb_user.id);
        });
    }
};

function facebookCookie(request) {
    return request.cookies['access_token'];
}

function getFacebookUser(cookie, callback) {
    // Request a user object from Facebook Open Graph, using the given cookie
    https.get({ host: 'graph.facebook.com', path: '/me?access_token=' + cookie }, function(response) {
        response.on('data', function(data) {
            callback(JSON.parse(data));
        });
    });
}

exports.FacebookGraph = FacebookGraph;