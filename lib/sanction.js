"use strict"

var url = require('url');
var https = require('https');
var http = require('http');
var querystring = require('querystring');

var Client = module.exports.Client = function(clientId, clientSecret,
    authEndpoint, tokenEndpoint, resourceEndpoint, redirectUri) {
    var self = this;

    this.authEndpoint = url.parse(authEndpoint);
    this.tokenEndpoint = url.parse(tokenEndpoint);
    this.resourceEndpoint = url.parse(resourceEndpoint);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.credentials = {
        accessToken: null,
        refreshToken: null
    };

    Client.prototype.authUri = function(conf, cb) { 
        var q = {
            client_id: this.clientId,
            redirect_uri: conf.redirectUri,
        };
        if(conf['scope'] != undefined) {
            q['scope'] = conf.scope;
        }
        if(conf['state'] != undefined) {
            q['state'] = conf.state;
        }

        cb(null, url.format({
            protocol: this.authEndpoint.protocol,
            host: this.authEndpoint.host,
            pathname: this.authEndpoint.path,
            query: q
        }));
    };

    Client.prototype.requestToken = function(code, cb) {
        _requestToken({
            code: code, 
            grant_type: 'authorization_code',
            redirect_uri: this.redirectUri
        }, cb);
    };

    Client.prototype.refreshToken = function(refreshToken, cb) {
        _requestToken({
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }, cb);
    };

    function _requestToken(data, cb) {
        var opts = {
            hostname: self.tokenEndpoint.hostname,
            path: self.tokenEndpoint.pathname,
            port: self.tokenEndpoint.port,
            method: 'POST',
        };
        var proto = self.tokenEndpoint.protocol == 'https' ? https : http;
        var req = proto.request(opts, function(res) {
            res.on('data', function(d) {
                // TODO
                cb(null, d);
            });
        });
        req.on('error', function(e) {
            cb(e, null);
        });
        req.write(querystring.stringify(data));
        req.end();
    }

    return this;
};
