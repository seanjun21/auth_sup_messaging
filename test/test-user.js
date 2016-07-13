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

var makeSpy = require( './spy' );

var should = chai.should();

chai.use( chaiHttp );

describe( 'User endpoints', function() {
  beforeEach( function( done ) {
    this.singlePattern = new UrlPattern( '/users/:userId' );
    this.listPattern = new UrlPattern( '/users' );
    // Clear the database
    mongoose.connection.db.dropDatabase( function( err, res ) {
      bcrypt.genSalt( 10, function( error, salt ) {
        bcrypt.hash( 'userPassword', salt, function( error, hash ) {
          var user = {
            username: 'Joe',
            password: hash
          };
          var promise = new User( user ).save();
          Promise.all( [ promise ] ).then( function() {
            done();
          } );
        } );
      } );
    } );
  } );

  describe( '/users', function() {
    describe( 'GET', function() {
      it( 'should return a list of users', function() {
        return chai.request( app )
          .get( this.listPattern.stringify() ).auth( 'Joe', 'userPassword' )
          .then( function( res ) {
            res.should.have.status( 200 );
            res.type.should.equal( 'application/json' );
            res.charset.should.equal( 'utf-8' );
            res.body.should.be.an( 'array' );
            res.body.length.should.equal( 1 );
            res.body[ 0 ].should.be.an( 'object' );
            res.body[ 0 ].should.have.property( 'username' );
            res.body[ 0 ].username.should.be.a( 'string' );
            res.body[ 0 ].username.should.equal( 'Joe' );
            res.body[ 0 ].should.have.property( '_id' );
            res.body[ 0 ]._id.should.be.a( 'string' );
          } );
      } );

      describe( 'POST', function() {
        it( 'should allow adding a user', function() {
          var user = {
            username: 'joe',
            password: '123Password'
          };

          // Create a user by sending the above object to the POST endpoint
          return chai.request( app )
            .post( this.listPattern.stringify() )
            .send( user )
            .then( function( res ) {
              // Check that an empty object is returned
              res.should.have.status( 201 );
              res.type.should.equal( 'application/json' );
              res.charset.should.equal( 'utf-8' );
              res.should.have.header( 'location' );
              res.body.should.be.an( 'object' );
              res.body.should.be.empty;

              var params = this.singlePattern.match( res.headers.location );
              // Fetch the user from the database, using the
              // location header to get the ID
              return User.findById( params.userId ).exec();
            }.bind( this ) )
            .then( function( res ) {
              // Check that the user exists in the database
              should.exist( res );
              res.should.have.property( 'username' );
              res.username.should.be.a( 'string' );
              res.username.should.equal( user.username );
            } );
        } );
        it( 'should reject users without a username', function() {
          var user = {};
          var spy = makeSpy();
          // Add a user without a username
          return chai.request( app )
            .post( this.listPattern.stringify() )
            .send( user )
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
              res.body.message.should.equal( 'Missing field: username' );
            } )
            .then( function() {
              // Check that the request didn't succeed
              spy.called.should.be.false;
            } );
        } );
        it( 'should reject non-string usernames', function() {
          var user = {
            username: 42
          };
          var spy = makeSpy();
          // Add a user without a non-string username
          return chai.request( app )
            .post( this.listPattern.stringify() )
            .send( user )
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
              res.body.message.should.equal( 'Incorrect field type: username' );
            } )
            .then( function() {
              // Check that the request didn't succeed
              spy.called.should.be.false;
            } );
        } );
      } );
    } );

    describe( '/users/:userId', function() {
      describe( 'GET', function() {
        it( 'should 404 on non-existent users', function() {
          var spy = makeSpy();
          // Request a non-existent user
          return chai.request( app )
            .get( this.singlePattern.stringify( { userId: '000000000000000000000000' } ) )
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
              res.body.message.should.equal( 'User not found' );
            } )
            .then( function() {
              // Check that the request didn't succeed
              spy.called.should.be.false;
            } );
        } );

        it( 'should return a single user', function() {
          return chai.request( app )
            .get( this.singlePattern.stringify( { userId: 'Joe' } ) )
            .then( function( res ) {
              res.should.have.status( 200 );
              res.type.should.equal( 'application/json' );
              res.charset.should.equal( 'utf-8' );
              res.body.should.be.an( 'object' );
              res.body.should.have.property( 'username' );
              res.body.username.should.be.a( 'string' );
              res.body.username.should.equal( 'Joe' );
              res.body.should.have.property( '_id' );
              res.body._id.should.be.a( 'string' );
            } );

        } );
      } );

      describe( 'PUT', function() {
        it( 'should allow editing a user', function() {
          var userId;
          var newUser = {
            username: 'Sean',
            password: '1234'
          };
          // Add a user to the database
          return User.findOne( { username: 'Joe' } ).exec()
            .then( function( res ) {
              userId = res._id.toString();
              // Make a request to modify the user
              return chai.request( app )
                .put( this.singlePattern.stringify( {
                  userId: userId
                } ) ).auth( 'Joe', 'userPassword' )
                .send( newUser );
            }.bind( this ) )
            .then( function( res ) {
              // Check that an empty object was returned
              res.should.have.status( 200 );
              res.type.should.equal( 'application/json' );
              res.charset.should.equal( 'utf-8' );
              res.body.should.be.an( 'object' );
              res.body.should.be.empty;

              // Fetch the user from the database
              return User.findById( userId ).exec();
            } )
            .then( function( res ) {
              // Check that the user has been updated
              should.exist( res );
              res.should.have.property( 'username' );
              res.username.should.be.a( 'string' );
              res.username.should.equal( newUser.username );
            } );
        } );
        it( 'should create a user if they don\'t exist', function() {
          var user = {
            _id: '000000000000000000000000',
            username: 'joe'
          };
          // Request to add a new user
          return chai.request( app )
            .put( this.singlePattern.stringify( {
              userId: user._id
            } ) )
            .send( user )
            .then( function( res ) {
              // Check that an empty object was returned
              res.should.have.status( 200 );
              res.type.should.equal( 'application/json' );
              res.charset.should.equal( 'utf-8' );
              res.body.should.be.an( 'object' );
              res.body.should.be.empty;

              // Fetch the user from the database
              return User.findById( user._id ).exec();
            } )
            .then( function( res ) {
              // Check that the user has been added
              should.exist( res );
              res.should.have.property( 'username' );
              res.username.should.be.a( 'string' );
              res.username.should.equal( user.username );
            } );
        } );
        it( 'should reject users without a username', function() {
          var user = {
            _id: '000000000000000000000000'
          };
          var spy = makeSpy();
          // Add a user without a username
          return chai.request( app )
            .put( this.singlePattern.stringify( {
              userId: user._id
            } ) )
            .send( user )
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
              res.body.message.should.equal( 'Missing field: username' );
            } )
            .then( function() {
              // Check that the request didn't succeed
              spy.called.should.be.false;
            } );
        } );
        it( 'should reject non-string usernames', function() {
          var user = {
            _id: '000000000000000000000000',
            username: 42
          };
          var spy = makeSpy();
          // Add a user with a non-string username
          return chai.request( app )
            .put( this.singlePattern.stringify( {
              userId: user._id
            } ) )
            .send( user )
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
              res.body.message.should.equal( 'Incorrect field type: username' );
            } )
            .then( function() {
              // Check that the request didn't succeed
              spy.called.should.be.false;
            } );
        } );
      } );

      describe( 'DELETE', function() {
        it( 'should 404 on non-existent users', function() {
          var spy = makeSpy();
          // Try to delete a non-existent user
          return chai.request( app )
            .delete( this.singlePattern.stringify( { userId: '000000000000000000000000' } ) )
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
              res.body.message.should.equal( 'User not found' );
            } )
            .then( function() {
              // Check that the request didn't succeed
              spy.called.should.be.false;
            } );
        } );
        it( 'should delete a user', function() {
          var userId;
          // Create a user in the database
          return User.findOne( { username: 'Joe' } ).exec()
            .then( function( res ) {
              userId = res._id.toString();
              // Request to delete the user
              return chai.request( app )
                .delete( this.singlePattern.stringify( {
                  userId: userId
                } ) );
            }.bind( this ) )
            .then( function( res ) {
              // Make sure that an empty object was returned
              res.should.have.status( 200 );
              res.type.should.equal( 'application/json' );
              res.charset.should.equal( 'utf-8' );
              res.body.should.be.an( 'object' );
              res.body.should.be.empty;

              // Try to fetch the user from the database
              return User.findById( userId );
            } )
            .then( function( res ) {
              // Make sure that no user could be fetched
              should.not.exist( res );
            } );
        } );
      } );
    } );
  } );
} );
