//
// timing
// convert the text & timing files into a usable format
//
// options:
//
var async = require("async");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
// var Setup = require(path.join(__dirname, "setup.js"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
    command: "timing",
    params: "",
    descriptionShort:
        "convert the text and timing files into an intermediate format.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  usage: $ bbk timing --text:[text] --timing:[timing]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --text      : path to the text file
    --timing    : path to the timing file

  examples:

    $ bbk install --text:/path/to/text  --timing:/path/to/timing
        - reads in /path/to/text
        - reads in /path/to/timing
        - outputs format to console

`);
};

Command.run = function(options) {
    return new Promise((resolve, reject) => {
        async.series(
            [
                // copy our passed in options to our Options
                (done) => {
                    for (var o in options) {
                        Options[o] = options[o];
                    }
                    Options.name = options._.shift();

                    // check for valid params:
                    if (!Options.name) {
                        console.log("missing required param: [name]");
                        Command.help();
                        process.exit(1);
                    }
                    done();
                },
                checkDependencies
            ],
            (err) => {
                // shell.popd("-q");
                // if there was an error that wasn't an ESKIP error:
                if (err && (!err.code || err.code != "ESKIP")) {
                    reject(err);
                    return;
                }
                resolve();
            }
        );
    });
};

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
    // verify we have 'git'
    utils.checkDependencies(["git", "docker"], done);
}
