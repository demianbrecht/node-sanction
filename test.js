'use strict'

var assert = require('assert');
var url = require('url');
var querystring = require('querystring');
var http = require('http');
var sanction = require('./lib/sanction');

var PROVIDERS = {
    unit: {
        authEndpoint: 'https://example.com/o/auth',
        tokenEndpoint: 'http://127.0.0.1:4242',
        resourceEndpoint: 'resource',
        clientId: 'clientId',
        clienSecret: 'clientSecret',
        redirectUri: 'local'
    }
};

var TEST_SERVER = {
    host: '127.0.0.1',
    port: 4242
};

var TEST_TOKEN = 'access_token';
var TEST_CODE = 'code';

function TokenServer() {
    var server = null;
    TokenServer.prototype.start = function SERVER_start(cb) {
        server = http.createServer(function(req, res) {
            res.write(TEST_TOKEN);
            res.end();
        }).listen(TEST_SERVER.port, TEST_SERVER.host, null, cb);
    };

    TokenServer.prototype.close = function SERVER_stop(cb) {
        if(server) {
            server.close(cb)
        }
    };
}


describe('Client', function() {
    var p = PROVIDERS.unit;
    var client = new sanction.Client(p.clientId, p.clientSecret,
        p.authEndpoint, p.tokenEndpoint, p.resourceEndpoint, p.redirectUri);
    var server = new TokenServer();

    describe('#auth_uri()', function() {
        it('should == ' + p.authEndpoint, function() {
            var testqs = {redirectUri: 'unit'};
            client.authUri(testqs, function(e, uri) {
                var o = url.parse(uri);
                assert.equal(o.protocol, client.authEndpoint.protocol);
                assert.equal(o.host, client.authEndpoint.host);
                assert.equal(querystring.parse(o.query).redirect_uri, 
                    testqs.redirectUri);
            });
        });

        it('should == ' + p.authEndpoint + '?scope=foo,bar', function() {
            client.authUri({scope: 'foo,bar', redirectUri: 'unit'}, function(e, uri) {
                var qs = querystring.parse(url.parse(uri).query);

                assert.equal(qs.scope, 'foo,bar');
                assert.equal(qs.redirect_uri, 'unit');
            });
        });
    });

    describe('#requestToken()', function() {
        it('should not be null', function(done) {
            server.start(function() {
                client.requestToken('foo', function(e, token) {
                    assert.equal(e, null);
                    assert.equal(token, TEST_TOKEN);
                    server.close(done);
                });
            });
        });
    });
});
