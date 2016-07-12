/*----------- DEPENDENCIES -----------*/
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');
var Message = require('./models/message');
var bcrypt = require('bcrypt');

var app = express();

var jsonParser = bodyParser.json();

/*----------- USER ENDPOINTS ----------*/

// GET request for array of users
app.get('/users', function(request, response) {
  User.find(function(error, users) {
    if (error) {
      //internal server error
      response.sendStatus(500);
      return;
    }
    //if no error, response will return the users array in json
    response.json(users);
  });
});

// POST request for single user
app.post('/users', jsonParser, function(request, response) {
  // Validate input
  if (!request.body) {
    return response.status(400).json({
      message: "No request body"
    });
  }

  if (!('username' in request.body)) {
    return response.status(422).json({
      message: 'Missing field: username'
    });
  }

  var username = request.body.username.trim();

  if (typeof username !== 'string') {
    return response.status(422).json({
      message: 'Incorrect field type: username'
    });
  }

  if (username === '') {
    return response.status(422).json({
      message: 'Incorrect field length: username'
    });
  }

  if (!('password' in request.body)) {
    return response.status(422).json({
      message: 'Missing field: password'
    });
  }

  var password = request.body.password.trim();

  if (typeof password !== 'string') {
    return response.status(422).json({
      message: 'Incorrect field type: password'
    });
  }

  if (password === '') {
    return response.status(422).json({
      message: 'Incorrect field length: password'
    });
  }

  // Create user with encrypted password
  bcrypt.genSalt(10, function(error, salt) {
    if (error) {
      return response.status(500).json({
        message: 'Internal server error'
      });
    }

    bcrypt.hash(password, salt, function(error, hash) {
      if (error) {
        return response.status(500).json({
          message: 'Internal server error'
        });
      }
      // if POST req is valid, create new user
      var user = new User({
        username: username,
        password: hash
      });

      user.save(function(error) {
        if (error) {
          return response.status(500).json({
            message: 'Internal server error'
          });
        }

        return response.status(201).json({
          message: username + ' was created.'
        });
      });
    });

  });
});


// GET request for specific user
app.get('/users/:userID', function(request, response) {
  User.find({
    _id: request.params.userID
  }, function(error, user) {
    // check if user[0] in returned array is falsey 
    if (!user[0]) {
      // return 404 error message if specified user does not exist
      response.status(404).json({
        message: "User not found"
      });
      return;
    }
    // returns OK status and user that was queried in response
    response.json(user[0]);
  });
});

// PUT request to add or edit a user.
app.put('/users/:userID', jsonParser, function(request, response) {
  // check that username provided is not an empty field
  if (!request.body.username) {
    response.status(422).json({
      message: 'Missing field: username'
    });
    return;
  }
  // check that username provided is a string
  if (typeof request.body.username !== 'string') {
    response.status(422).json({
      message: 'Incorrect field type: username'
    });
    return;
  }
  // find requested user and update username in user document
  User.findOneAndUpdate({
    _id: request.params.userID
  }, {
    username: request.body.username
  }, function(error, user) {
    // if there is not user document with specified user ID
    if (!user) {
      // creates a new user at specified user ID with provided username
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
  // find user document by user ID and remove document
  User.findByIdAndRemove({
    _id: request.params.userID
  }, function(error, user) {
    // if user doc does not exist, return 404 error
    if (!user) {
      response.status(404).json({
        message: 'User not found'
      });
      return;
    }
    // if user successfully removed, return status OK with empty object
    response.json({});
  });
});

/*---------- MESSAGE ENDPOINTS -----------*/

// GET request for messages to/from a user w/ corresponding ObjectID
app.get('/messages', function(request, response) {

  // depending on specified fields in request.query, will return array of messages matching the fields from request. Request.query will contain the values in query string in an object. May include no values, or 'to', 'from', or both. These fields have only the userId, we use populate to access the information stored only in the user document.
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
        // else we know both fields are valid users with appropriate input type and message text is supplied. Will proceed and create the message document.
        else {
          Message.create(request.body, function(error, message) {
            if (error) {
              response.sendStatus(500);
              return;
            }
            // if successfully created message, send CREATED status and path of message
            response.status(201).header('Location', '/messages/' + message._id).json({});
          });
        }
      });
    }
  });

});

// GET request for a single message by messageId
app.get('/messages/:messageId', function(request, response) {
  Message.findOne({ _id: request.params.messageId }).populate('from to').exec(function(error, message) {
    if (!message) {
      response.status(404).json({ message: 'Message not found' });
      return;
    }
    // return message that was fetched
    response.json(message);
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
}

exports.app = app;
exports.runServer = runServer;
