var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');
var Message = require('./models/message');

var app = express();

var jsonParser = bodyParser.json();

/*----------- USER ENDPOINTS ----------*/

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
        response.status(422).json({
            message: 'Missing field: username'
        });
        return;
    }
    if (typeof request.body.username !== 'string') {
        response.status(422).json({
            message: 'Incorrect field type: username'
        });
        return;
    }
    User.create({
        username: request.body.username
    }, function(error, user) {
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
        if (!user[0]) {
            response.status(404).json({
                message: "User not found"
            });
            return;
        }
        response.json(user[0]);
    });
});

// PUT request to add or edit a user.
app.put('/users/:userID', jsonParser, function(request, response) {
    if (!request.body.username) {
        response.status(422).json({
            message: 'Missing field: username'
        });
        return;
    }
    if (typeof request.body.username !== 'string') {
        response.status(422).json({
            message: 'Incorrect field type: username'
        });
        return;
    }
    User.findOneAndUpdate({
        _id: request.params.userID
    }, {
        username: request.body.username
    }, function(error, user) {
        if (!user) {
            var newUser = {
                _id: request.params.userID,
                username: request.body.username
            };
            User.create(newUser, function(error, user) {
                if (error) {
                    response.sendStatus(500);
                    return;
                }
            });
        }
        response.json({});
    });
});

// DELETE request to remove user by user ID
app.delete('/users/:userID', jsonParser, function(request, response) {
    User.findByIdAndRemove({
        _id: request.params.userID
    }, function(error, user) {
        if (!user) {
            response.status(404).json({
                message: 'User not found'
            });
            return;
        }
        response.json({});
    });
});

/*---------- MESSAGE ENDPOINTS -----------*/

// GET request for messages to/from a user w/ corresponding ObjectID
app.get('/messages', function(request, response) {

    Message.find(request.query).populate('from to').exec(function(error, messages) {
        if (error) {
            response.sendStatus(500);
            return;
        }
        response.json(messages);
    });
});

// POST request for messages
app.post('/messages', jsonParser, function(request, response) {
    var toFieldisValidID = true;
    var fromFieldisValidID = true;



    // No text for the message
    if (!request.body.text) {
        response.status(422).json({
            message: 'Missing field: text'
        });
        return;
    }
    // Message text is non-string
    if (typeof request.body.text !== 'string') {
        response.status(422).json({
            message: 'Incorrect field type: text'
        });
        return;
    }
    // to field is non-string
    if (typeof request.body.to !== 'string') {
        response.status(422).json({
            message: 'Incorrect field type: to'
        });
        return;
    }
    // from field is non-string
    if (typeof request.body.from !== 'string') {
        response.status(422).json({
            message: 'Incorrect field type: from'
        });
        return;
    }

    // Test if from field contains an id for a non-existent user
    User.findOne({
        _id: request.body.from
    }, function(error, users) {
        // if it is a non-existent user return appropriate error
        if (!users) {
            response.status(422).json({
                message: 'Incorrect field value: from'
            });
        }
        // else test if to field contains an id for a non-existent user
        else {
            User.findOne({
                _id: request.body.to
            }, function(error, users) {
                // if it is a non-existent user return appropriate error
                if (!users) {
                    response.status(422).json({
                        message: 'Incorrect field value: to'
                    });
                }
                // else we know both fields are valid users, create the message record
                else {
                    Message.create(request.body, function(error, message) {
                        if (error) {
                            response.sendStatus(500);
                            return;
                        }
                        response.status(201).header('Location', '/messages/' + message._id).json({});
                    });
                }
            });
        }
    });

});

/*------------ RUN SERVER ------------*/

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
