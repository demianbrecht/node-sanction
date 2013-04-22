"use strict"

var assert = require('assert');
var clone = require('clone');
var querystring = require('querystring');
var url = require('url');
var http = require('http');

var sanction = process.env.EXPRESS_COV
    ? require('./lib-cov/sanction')
    : require('./lib/sanction');

var CLIENT_OPTS = {
    clientId: 'client_id',
    clientSecret: 'client_secret',
    authEndpoint: 'http://localhost:4242/o/auth',
    tokenEndpoint: 'http://localhost:4242/o/token',
    resourceEndpoint: 'http://localhost:4242/api',
    redirectUri: 'http://localhost/login'
};

var ACCESS_TOKEN = {
    access_token: 'accessToken',
    refresh_token: 'refreshToken',
    expires_in: 4200
};

var USER_DATA = {
    first_name: 'foo',
    last_name: 'bar',
    email: 'foo@bar.com'
};

var encoder = JSON.stringify; 
var server = http.createServer(function(req, res) {
        res.end(encoder(ACCESS_TOKEN));
    }).listen(4242, 'localhost');

describe('client', function() {
    describe('#ctor', function() {
        it('should have JSON.parse assigned to parser', function() {
            var c = new sanction.Client(CLIENT_OPTS);
            assert.equal(c.clientId, CLIENT_OPTS.clientId);
            assert.equal(c.clientSecret, CLIENT_OPTS.clientSecret);
            assert.equal(JSON.stringify(c.authEndpoint), 
                JSON.stringify(url.parse(CLIENT_OPTS.authEndpoint)));
            assert.equal(JSON.stringify(c.tokenEndpoint), 
                JSON.stringify(url.parse(CLIENT_OPTS.tokenEndpoint)));
            assert.equal(JSON.stringify(c.resourceEndpoint), 
                JSON.stringify(url.parse(CLIENT_OPTS.resourceEndpoint)));
        });

        it('should have nulled out credentials', function() {
            var c = new sanction.Client(CLIENT_OPTS);
            assert.equal(c.credentials.accessToken, null);
            assert.equal(c.credentials.refreshToken, null);
            assert.equal(c.credentials.tokenExpires, null);
        });
    });

    describe('#authUri', function() {
        it('should have no optional params', function(done) {
            var c = new sanction.Client(CLIENT_OPTS);
            c.authUri({}, function(e, uri) {
                assert.equal(e, null);

                var o = url.parse(uri);
                var q = querystring.decode(o.query);
                assert.equal(q.client_id, CLIENT_OPTS.clientId);
                assert.equal(q.redirect_uri, CLIENT_OPTS.redirectUri);
                assert.equal(q.response_type, 'code');

                var p = url.parse(CLIENT_OPTS.redirectUri);
                assert.equal(o.protocol, p.protocol);
                assert.equal(o.hostname, p.hostname);

                assert.equal(q.state, undefined);
                assert.equal(q.scope, undefined);

                done();
            });
        });

        it('should have a scope and state', function() {
            var c = new sanction.Client(CLIENT_OPTS);
            var opts = {
                scope: 'scope',
                state: 'state'
            };
            c.authUri(opts, function(e, uri) {
                assert.equal(e, null);

                var q = querystring.decode(url.parse(uri).query);
                assert.equal(q.state, opts.state);
                assert.equal(q.scope, opts.scope);
            });
        });
    });

    describe('#requestToken', function() {
        var client = new sanction.Client(CLIENT_OPTS);

        it('should get a valid token via JSON', function(done) {
            var opts = {code: 'code'};
            client.requestToken(opts, function(e, data) {
                assert.notEqual(data, null);
                done();
            });
        });

        it('should get a valid token via querystring.parse', function(done) {
            encoder = querystring.stringify
            var opts = {
                code: 'code', 
                parser: function(r) {
                    var o = querystring.parse(r);
                    o.expires_in = parseInt(o.expires_in);
                    return o;
                }
            };
            client.requestToken(opts, function(e, data) {
                assert.equal(JSON.stringify(data), JSON.stringify(ACCESS_TOKEN));
                encoder = JSON.stringify;
                done();
            });
        });
    });

    describe('#request', function() {
        it('should get dummy user data', function(done) {
            var client = new sanction.Client(CLIENT_OPTS);
            client.credentials.accessToken = 'token';
           
            var opts = {
                path: '/me'
            };

            client.request(opts, function(e, data) {
                // still just getting dummy data back from previous tests
                // (access token data)
                assert.equal(JSON.stringify(data), JSON.stringify(ACCESS_TOKEN));
                done();
            });
        });
    });
});

describe('transport', function() {
    describe('#query()', function() {
        it('should have access_token=bar in query', function() {
            var opts = {
                path: '/foo'
            };
            sanction.transport.query(opts, 'bar');
            assert.equal(opts.path, '/foo?access_token=bar');
        });

        it('should have access_token=bar&foo=bar in query', function() {
            var opts = {
                path: '/foo?foo=bar'
            };
            sanction.transport.query(opts, 'bar');
            assert.equal(opts.path, '/foo?foo=bar&access_token=bar');
        });

        it('should have access_token and hash #bar', function() {
            var opts = {
                path: '/foo#bar'
            };
            sanction.transport.query(opts, 'bar');
            assert.equal(opts.path, '/foo?access_token=bar#bar');
        });
    });

    describe('#headers()', function() {
        it('should have access_token=bar in headers', function() {
            var opts = {};
            sanction.transport.headers(opts, 'bar');
            var headers = querystring.parse(opts.headers);
            assert.equal(headers.access_token, 'bar');
        });

        it('should have access_token=bar and foo=bar in headers', function() {
            var opts = {
                headers: 'foo=bar'
            };
            sanction.transport.headers(opts, 'bar');
            var headers = querystring.parse(opts.headers);
            assert.equal(headers.access_token, 'bar');
            assert.equal(headers.foo, 'bar');
        });
    });
});
