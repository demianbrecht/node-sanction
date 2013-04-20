"use strict"

var url = require('url');
var http = require('http');
var https = require('https');
var querystring = require('querystring');

function Client(opts) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.authEndpoint = url.parse(opts.authEndpoint);
    this.tokenEndpoint = url.parse(opts.tokenEndpoint);
    this.resourceEndpoint = url.parse(opts.resourceEndpoint);
    this.redirectUri = opts.redirectUri;

    this.credentials = {
        accessToken: null,
        refreshToken: null,
        tokenExpires: null
    };

    return this;
}

Client.prototype = {
    authUri: function(opts, cb) {
        var q = {
            client_id: this.clientId,
            redirect_uri: this.redirectUri
        };
        if(opts && opts.scope != undefined) {
            q.scope = opts.scope;
        }
        if(opts && opts.state != undefined) {
            q.state = opts.state;
        }

        cb(null, url.format({
            protocol: this.authEndpoint.protocol,
            host: this.authEndpoint.host,
            pathname: this.authEndpoint.path,
            query: q
        }));

        return this;
    },

    requestToken: function(opts, cb) {
        var o = {
            endpoint: this.tokenEndpoint,
            parser: opts.parser || JSON.parse,
            data: {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: opts.grantType || 'authorization_code'
            },
            method: 'POST'
        };

        if(opts.code != undefined) {
            o.data.redirect_uri = this.redirectUri;
            o.data.code = opts.code;
        }
        else if(opts.refreshToken != undefined) {
            o.data.refresh_token = opts.refreshToken;
        }

        this._request(o, function(e, data) {
            this.credentials.accessToken = data.access_token || null;
            this.credentials.refreshToken = data.refresh_token || null;
            this.credentials.expires_in = data.expires_in || null;

            cb(e, data);
        }.bind(this));
        return this;
    },

    request: function(opts, cb) {
        if(!this.credentials.accessToken) {
            throw new Error('accessToken == null');
        }

        var o = {
            endpoint: this.resourceEndpoint,
            path: opts.path,
            parser: opts.parser || JSON.parse,
            method: opts.method || 'GET',
            data: opts.data || null
        };

        (opts.transport || transport.query)(o, this.credentials.accessToken);

        this._request(o, cb);
    },
    
    _request: function(opts, cb) {
        var o = {
            method: opts.method || 'GET',
            hostname: opts.endpoint.hostname,
            path: opts.path || '/',
            port: opts.endpoint.port
        };

        var proto = opts.endpoint.protocol == 'http:' ? http : https;
        var req = proto.request(o, function(res) {
            res.setEncoding('utf8');
            res.on('data', function(data) {
                cb(null, (opts.parser || JSON.parse)(data));
            });
        });
        req.on('error', function(e) {
            cb(e, null);
        });

        if(opts.data) {
            req.write(querystring.stringify(opts.data));
        }
        req.end();
    }
};

var transport = {
    query: function TRANSPORT_query(ropts, token) { 
        var uri = url.parse(ropts.path);
        var qs = querystring.parse(uri.query);
        qs.access_token = token;

        ropts.path = url.format({
            pathname: uri.pathname,
            query: qs,
            hash: uri.hash
        });
    },

    headers: function TRANSPORT_headers(ropts, token) {
        var headers = querystring.parse(ropts.headers || '');
        headers.access_token = token;
        ropts.headers = querystring.stringify(headers);
    }
};

module.exports.transport = transport;
module.exports.Client = Client; 
