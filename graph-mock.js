var FacebookGraph = function() {};

FacebookGraph.prototype.isAuthenticated = function(request) {
    return true;
};

FacebookGraph.prototype.getFacebookId = function(request, callback) {
    callback(1607387);
};

exports.FacebookGraph = FacebookGraph;