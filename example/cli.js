var open = require('open');
var readline = require('readline');

var sanction = require('../lib/sanction');
var providers = require('./providers');

function main() {
    var client = new sanction.Client(providers.google);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    var opts = {scope: providers.google.scope};
    client.authUri(opts, function(e, uri) {
        open(uri);
        rl.question('code: ', function(code) {
            client.requestToken({code: code}, function(e, data) {
                if(data.hasOwnProperty('error')) {
                    throw new Error(data.error);
                }
                console.log(this);
            }.bind(client));
            rl.close();
        });
    });
}

if(require.main === module) {
    main();
}
