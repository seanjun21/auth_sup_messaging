global.databaseUri = 'mongodb://localhost/sup-dev';

var chai = require( 'chai' );
var chaiHttp = require( 'chai-http' );
var mongoose = require( 'mongoose' );
var UrlPattern = require( 'url-pattern' );
var app = require( '../index' ).app;
var bcrypt = require( 'bcrypt' );
var passport = require( 'passport' );
var BasicStrategy = require( 'passport-http' ).BasicStrategy;

var User = require( '../models/user' );
var Message = require( '../models/message' );

var makeSpy = require( './spy' );

var should = chai.should();

chai.use( chaiHttp );

describe( 'Message endpoints', function() {
  var server;
  beforeEach( function( done ) {
    this.listPattern = new UrlPattern( '/messages' );
    this.singlePattern = new UrlPattern( '/messages/:messageId' );
    // Clear the database
    mongoose.connection.db.dropDatabase( function( err, res ) {
      bcrypt.genSalt( 10, function( error, aliceSalt ) {
        bcrypt.hash( 'iamalice', aliceSalt, function( error, aliceHash ) {
          bcrypt.genSalt( 10, function( error, bobSalt ) {
            bcrypt.hash( 'iambob', bobSalt, function( error, bobHash ) {
              bcrypt.genSalt( 10, function( error, chuckSalt ) {
                bcrypt.hash( 'iamachuck', chuckSalt, function( error, chuckHash ) {
                  this.alice = {
                    username: 'alice',
                    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
                    password: aliceHash
                  };

                  this.bob = {
                    username: 'bob',
                    _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
                    password: bobHash
                  };

                  this.chuck = {
                    username: 'chuck',
                    _id: 'cccccccccccccccccccccccc',
                    password: chuckHash
                  };

                  var promiseA = new User( this.alice ).save();
                  var promiseB = new User( this.bob ).save();
                  var promiseC = new User( this.chuck ).save();
                  Promise.all( [ promiseA, promiseB, promiseC ] ).then( function() {
                    done();
                  } );
                }.bind( this ) );
              }.bind( this ) );
            }.bind( this ) );
          }.bind( this ) );
        }.bind( this ) );
      }.bind( this ) );
    }.bind( this ) );
  } );

  describe( '/messages', function() {
    describe( 'GET', function() {
      it( 'should return an empty list of messages initially', function() {
        // Get the list of messages
        return chai.request( app )
          .get( this.listPattern.stringify() )
          .then( function( res ) {
            // Check that it's an empty array
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'array' );
            res.body.length.should.equal( 0 );
          } );
      } );

      it( 'should return a list of messages', function() {
        var messageA = {
          from: this.alice._id,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var messageB = {
          from: this.alice._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };
        var messageC = {
          from: this.bob._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };

        // Create three messages
        var messageA = new Message( messageA );
        var messageB = new Message( messageB );
        var messageC = new Message( messageC );

        // Save them to the database
        return messageA.save().then( function() {
            return messageB.save();
          } ).then( function() {
            return messageC.save();
          } )
          .then( function( res ) {
            // Get the list of messages
            return chai.request( app )
              .get( this.listPattern.stringify() );
          }.bind( this ) )
          .then( function( res ) {
            // Check that the messages are in the array
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'array' );
            res.body.length.should.equal( 3 );

            var message = res.body[ 0 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageA.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.alice.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.bob.username );

            var message = res.body[ 1 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageB.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.alice.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.chuck.username );

            var message = res.body[ 2 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageC.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.bob.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.chuck.username );
          }.bind( this ) );
      } );
      it( 'should allow filtering by from', function() {
        var messageA = {
          from: this.alice._id,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var messageB = {
          from: this.alice._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };
        var messageC = {
          from: this.bob._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };

        // Create three messages
        var messageA = new Message( messageA );
        var messageB = new Message( messageB );
        var messageC = new Message( messageC );

        // Save them to the database
        return messageA.save().then( function() {
            return messageB.save();
          } ).then( function() {
            return messageC.save();
          } )
          .then( function( res ) {
            // Get the list of messages from Alice
            var url = this.listPattern.stringify() + '?from=' + this.alice._id;
            return chai.request( app )
              .get( url );
          }.bind( this ) )
          .then( function( res ) {
            // Check that the correct messages are in the array
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'array' );
            res.body.length.should.equal( 2 );

            var message = res.body[ 0 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageA.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.alice.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.bob.username );

            var message = res.body[ 1 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageB.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.alice.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.chuck.username );
          }.bind( this ) );
      } );
      it( 'should allow filtering by to', function() {
        var messageA = {
          from: this.alice._id,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var messageB = {
          from: this.alice._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };
        var messageC = {
          from: this.bob._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };

        // Create three messages
        var messageA = new Message( messageA );
        var messageB = new Message( messageB );
        var messageC = new Message( messageC );

        // Save them to the database
        return messageA.save().then( function() {
            return messageB.save();
          } ).then( function() {
            return messageC.save();
          } )
          .then( function( res ) {
            // Get the list of messages to Chuck
            var url = this.listPattern.stringify() + '?to=' + this.chuck._id;
            return chai.request( app )
              .get( url );
          }.bind( this ) )
          .then( function( res ) {
            // Check that the correct messages are in the array
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'array' );
            res.body.length.should.equal( 2 );

            var message = res.body[ 0 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageB.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.alice.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.chuck.username );

            var message = res.body[ 1 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageC.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.bob.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.chuck.username );
          }.bind( this ) );
      } );
      it( 'should allow filtering by from and to', function() {
        var messageA = {
          from: this.alice._id,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var messageB = {
          from: this.alice._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };
        var messageC = {
          from: this.bob._id,
          to: this.chuck._id,
          text: 'Hi Chuck'
        };

        // Create three messages
        var messageA = new Message( messageA );
        var messageB = new Message( messageB );
        var messageC = new Message( messageC );

        // Save them to the database
        return messageA.save().then( function() {
            return messageB.save();
          } ).then( function() {
            return messageC.save();
          } )
          .then( function( res ) {
            // Get the list of messages from Alice to Bob
            var url = this.listPattern.stringify() +
              '?from=' + this.alice._id +
              '&to=' + this.bob._id;
            return chai.request( app )
              .get( url );
          }.bind( this ) )
          .then( function( res ) {
            // Check that the correct messages are in the array
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'array' );
            res.body.length.should.equal( 1 );

            var message = res.body[ 0 ];
            message.should.be.an( 'object' );
            message.should.have.property( 'text' );
            message.text.should.be.a( 'string' );
            message.text.should.equal( messageA.text );
            message.should.have.property( 'to' );
            message.from.should.be.an( 'object' );
            message.from.should.have.property( 'username' );
            message.from.username.should.equal( this.alice.username );
            message.to.should.be.an( 'object' );
            message.to.should.have.property( 'username' );
            message.to.username.should.equal( this.bob.username );
          }.bind( this ) );
      } );
    } );
    describe( 'POST', function() {
      it( 'should allow adding a message', function() {
        var message = {
          from: this.alice._id,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        // Add a message
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( function( res ) {
            // Check that an empty object was returned
            res.should.have.status( 201 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.should.have.header( 'location' );
            res.body.should.be.an( 'object' );
            res.body.should.be.empty;

            var params = this.singlePattern.match( res.headers.location );
            // Fetch the message from the database, using the ID
            // from the location header
            return Message.findById( params.messageId ).exec();
          }.bind( this ) )
          .then( function( res ) {
            // Check that the message has been added to the
            // database
            should.exist( res );
            res.should.have.property( 'text' );
            res.text.should.be.a( 'string' );
            res.text.should.equal( message.text );
            res.should.have.property( 'from' );
            res.from.toString().should.equal( this.alice._id );
            res.should.have.property( 'to' );
            res.to.toString().should.equal( this.bob._id );
          }.bind( this ) );
      } );
      it( 'should reject messages without text', function() {;
        var message = {
          from: this.alice._id,
          to: this.bob._id
        };
        var spy = makeSpy();
        // Add a message without text
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 422 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Missing field: text' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
      it( 'should reject non-string text', function() {;
        var message = {
          from: this.alice._id,
          to: this.bob._id,
          text: 42
        };
        var spy = makeSpy();
        // Add a message with non-string text
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 422 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Incorrect field type: text' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
      it( 'should reject non-string to', function() {
        var message = {
          from: this.alice._id,
          to: 42,
          text: 'Hi Bob'
        };
        var spy = makeSpy();
        // Add a message with non-string to
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 422 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Incorrect field type: to' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
      it( 'should reject non-string from', function() {
        var message = {
          from: 42,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var spy = makeSpy();
        // Add a message with non-string from
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 422 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Incorrect field type: from' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
      it( 'should reject messages from non-existent users', function() {
        var message = {
          from: 'DDDDDDDDDDDDDDDDDDDDDDDD',
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var spy = makeSpy();
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 422 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Incorrect field value: from' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
      it( 'should reject messages to non-existent users', function() {
        var message = {
          from: this.alice._id,
          to: 'dddddddddddddddddddddddd',
          text: 'Hi Dan'
        };
        var spy = makeSpy();
        // Add a message to a non-existent user
        return chai.request( app )
          .post( this.listPattern.stringify() ).auth( 'alice', 'iamalice' )
          .send( message )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 422 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Incorrect field value: to' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
    } );
  } );

  describe( '/messages/:messageId', function() {
    describe( 'GET', function() {
      it( 'should 404 on non-existent messages', function() {
        var spy = makeSpy();
        // Get a message which doesn't exist
        return chai.request( app )
          .get( this.singlePattern.stringify( { messageId: '000000000000000000000000' } ) )
          .then( spy )
          .catch( function( err ) {
            // If the request fails, make sure it contains the
            // error
            var res = err.response;
            res.should.have.status( 404 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'message' );
            res.body.message.should.equal( 'Message not found' );
          } )
          .then( function() {
            // Check that the request didn't succeed
            spy.called.should.be.false;
          } );
      } );
      it( 'should return a single message', function() {
        var message = {
          from: this.alice._id,
          to: this.bob._id,
          text: 'Hi Bob'
        };
        var messageId;
        // Add a message to the database
        return new Message( message ).save()
          .then( function( res ) {
            messageId = res._id.toString();
            // Request the message
            return chai.request( app )
              .get( this.singlePattern.stringify( {
                messageId: messageId
              } ) );
          }.bind( this ) )
          .then( function( res ) {
            // Check that the message is returned
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'object' );
            res.body.should.be.an( 'object' );
            res.body.should.have.property( 'text' );
            res.body.text.should.be.a( 'string' );
            res.body.text.should.equal( message.text );
            res.body.should.have.property( 'to' );
            res.body.from.should.be.an( 'object' );
            res.body.from.should.have.property( 'username' );
            res.body.from.username.should.equal( this.alice.username );
            res.body.to.should.be.an( 'object' );
            res.body.to.should.have.property( 'username' );
            res.body.to.username.should.equal( this.bob.username );
          }.bind( this ) );
      } );
    } );
  } );
} );
