var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');

var app = express();

var jsonParser = bodyParser.json();

// GET request for array of users
app.get('/users', function(request, response) {
    User.find(function(error, users) {
        if (error) {
            response.sendStatus(500);
            return;
        }
        response.json(users);
    });
});
// GET request for specific user
app.get('/users/:userID', function(request, response) {
    
    console.log(request.params.userID);
    User.find({
        _id: request.params.userID
    }, function(error, user) {
        if (!user[0]    ) {
            console.log("here");
            response.status(404).json({message: "User not found"});
            return;
        }
        console.log(user, "<---user");
        response.json(user[0]);
    });
});

var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;
