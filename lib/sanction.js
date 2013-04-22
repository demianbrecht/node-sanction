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
            redirect_uri: this.redirectUri,
            response_type: opts.responseType || 'code'
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
            parser: opts && opts.parser || JSON.parse,
            data: {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: opts && opts.grantType || 'authorization_code'
            },
            method: 'POST',
            path: this.tokenEndpoint.path,
            headers: {
                'Content-type': 'application/x-www-form-urlencoded'
            }
        };

        // can't rely on code and refreshToken being top-level attributes
        // (which .hasOwnProperty expects)
        if(opts.code != undefined) {
            o.data.redirect_uri = this.redirectUri;
            o.data.code = opts.code;
        }
        else if(opts.refreshToken != undefined) {
            o.data.refresh_token = opts.refreshToken;

            // if the user hasn't defined grant_type, then define it here 
            // as per RFC 6750
            if(!opts.grantType) o.data.grant_type = 'refresh_token';
        }

        this._request(o, function(e, data) {
            this.credentials.accessToken = data.access_token || null;
            this.credentials.refreshToken = data.refresh_token || null;
            if(data.hasOwnProperty('expires_in')) {
                this.credentials.tokenExpires = (Date.now()/1000) + data.expires_in;
            }

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
            path: this.resourceEndpoint.path + opts.path,
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
            path: opts.path || '/'
        };
        if(opts.endpoint.port) {
            o.port = opts.endpoint.port;
        }
        if(opts.headers) {
            o.headers = opts.headers;
        }

        var proto = opts.endpoint.protocol == 'http:' ? http : https;
        var data = '';
        var req = proto.request(o, function(res) {
            res.on('data', function(d) {
                data += d;
            });
            res.on('end', function() {
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

    // RFC 6750 doesn't define anything other than "Bearer" for
    // request headers. If something different is needed, a custom transport
    // method should be written by the client app and passed in as part of
    // the request opts.
    headers: function TRANSPORT_headers(ropts, token) {
        if(!ropts.headers) {
            ropts.headers = {};
        }
        ropts.headers.Authorization = 'Bearer ' + token;
    }
};

module.exports.transport = transport;
module.exports.Client = Client; 
