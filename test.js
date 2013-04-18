"use strict"

var assert = require("assert");
var Client = require("./lib/client.js");
var url = require("url");
var querystring = require("querystring");

var PROVIDERS = {
    unit: {
        authEndpoint: "https://example.com/o/auth",
        tokenEndpoint: "token",
        resourceEndpoint: "resource",
        clientId: "clientId",
        clienSecret: "clientSecret"
    }
};

describe("Client", function() {
    var p = PROVIDERS.unit;
    var client = new Client(p.clientId, p.clientSecret,
        p.authEndpoint, p.tokenEndpoint, p.resourceEndpoint, p.redirectUri);

    describe("#auth_uri()", function() {
        it("should == " + p.authEndpoint, function() {
            var testqs = {redirectUri: "unit"};
            client.authUri(testqs, function(e, uri) {
                var o = url.parse(uri);
                assert.equal(o.protocol, client.authEndpoint.protocol);
                assert.equal(o.host, client.authEndpoint.host);
                assert.equal(querystring.parse(o.query).redirect_uri, 
                    testqs.redirectUri);
            });
        });

        it("should == " + p.authEndpoint + "?scope=foo,bar", function() {
            client.authUri({scope: "foo,bar", redirectUri: "unit"}, function(e, uri) {
                var qs = querystring.parse(url.parse(uri).query);

                assert.equal(qs.scope, "foo,bar");
                assert.equal(qs.redirect_uri, "unit");
            });
        });
    });

    describe("#requestToken()", function() {
        it("should be null", function() {
            client.requestToken("foo", function(e, token) {
                assert.equal(token, null);
            });
        });
    });
});
