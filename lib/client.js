"use strict"

var url = require('url');
var https = require('https');
var querystring = require('querystring');

var Client = module.exports = function(clientId, clientSecret,
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

    Client.prototype.authUri = function(conf, callback) { 
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

        callback(null, url.format({
            protocol: this.authEndpoint.protocol,
            host: this.authEndpoint.host,
            pathname: this.authEndpoint.path,
            query: q
        }));
    };

    Client.prototype.requestToken = function(code, callback) {
        _requestToken({
            code: code, 
            grant_type: 'authorization_code',
            redirect_uri: this.redirectUri
        }, callback);
    };

    Client.prototype.refreshToken = function(refreshToken, callback) {
        _requestToken({
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }, callback);
    };

    function _requestToken(data, callback) {
        var opts = {
            hostname: self.tokenEndpoint.hostname,
            path: self.tokenEndpoint.pathname,
            method: 'POST'
        };
        var req = https.request(opts, function(res) {
            res.on('data', function(d) {
                // TODO
                callback(null, d);
            });
        });
        req.on('error', function(e) {
            callback(e, null);
        });
        req.write(querystring.stringify(data));
        req.end();
    }

    return this;
};
