// TODO: How do I make these instance variables rather than part of the module?
var provider;
var graph;

var Authenticator = function(p, g) {
    provider = p;
    graph = g;
};

Authenticator.prototype.isAuthenticated = function(request) {
    return graph.isAuthenticated(request);
};

Authenticator.prototype.authorize = function(request, callback) {
    graph.getFacebookId(request, function(facebookId) {
        provider.findPersonByFacebookId(facebookId, function(user) {
            if (user) {
                request.user = user; // Found a user with the email address - store it on the request
                callback(null);

            } else {
                callback('You are not authorized to use this application.');
            }
        });
    });
};

exports.Authenticator = Authenticator;