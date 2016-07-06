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

// POST request for array of users
app.post('/users', jsonParser, function(request, response) {
     if (!request.body.username) {
        response.status(422).json({message: 'Missing field: username'});
        return;
        }
        if (typeof request.body.username !== 'string') {
            response.status(422).json({message: 'Incorrect field type: username'});
            return;    
        }
    User.create({username: request.body.username}, function(error, user) {
       if (error) {
            response.sendStatus(422);
            return;
        }
        response.status(201).header('Location', '/users/' + user._id).json({});
    });
});


// GET request for specific user
app.get('/users/:userID', function(request, response) {
    User.find({
        _id: request.params.userID
    }, function(error, user) {
        if (!user[0]    ) {
            response.status(404).json({message: "User not found"});
            return;
        }
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
