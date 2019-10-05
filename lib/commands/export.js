//
// export
// convert the text & export files into a usable format
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
    command: "export",
    params: "",
    descriptionShort:
        "convert the text and export files into an intermediate format.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function () {
    console.log(`

  usage: $ bbk export --images=[images] --audio=[audio] --output=[output]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --images        : path to the image folder
    --audio         : path to the audio file
    --output        : output name

  examples:

    $ bbk export --images=/path/to/image  --audio=/path/to/audio --output=file
        - reads in /path/to/text
        - reads in /path/to/export
        - outputs format to console

`);
};

var Options = {};

Command.run = function (options) {

    return new Promise((resolve, reject) => {
        async.series(
            [
                // copy our passed in options to our Options
                (done) => {
                    for (var o in options) {
                        Options[o] = options[o];
                    }

                    let requiredParams = ['images', 'audio', 'output'];
                    let isValid = true;

                    // check for valid params:
                    requiredParams.forEach(p => {

                        if (!Options[p]) {
                            console.log(`missing required param: [${p}]`);
                            isValid = false;
                        }
                    });

                    if (!isValid) {
                        Command.help();
                        process.exit(1);
                    }

                    done();
                },
                checkDependencies,
                execute,
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

function execute(done) {

    shell.exec(`ffmpeg -framerate 1 -pattern_type glob -i '${Options.images}/*.png' -i ${Options.audio}  -pix_fmt yuv420p output/${Options.output}`);

    done();

}