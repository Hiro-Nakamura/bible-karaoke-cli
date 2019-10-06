//
// convert
// convert the raw .vave and timing information into a usable intermediate file.
//
// options:
// python main.py /path/to/folder -c [true,False] -o [csv, json, vtt]
// -c --combine  : combine wave files into 1 file
// -o --output   : output format
//
var async = require("async");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
// var Setup = require(path.join(__dirname, "setup.js"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
    command: "convert",
    params: "",
    descriptionShort:
        "convert the text and export files into an intermediate format.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  usage: $ bbk convert [path/to/folder] --combine=[true,False] --output=[csv,json,vtt]

  [path/to/folder] : the name of the directory with the raw files to convert

  [options] :
    --combine       : (optional) combine the audio files into one? (default:false)
    --output        : output format 
                      valid options: 
                        csv     : export a simple csv file
                        json    : 
                        vtt     :

  examples:

    $ bbk convert genesis/ch1 --combine=true --output=json
        - reads in ./genesis/ch1
        - combines all audio files in ./genesis/ch1 into 1 file
        - output a json formatted file.

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

                    Options.pathFolder = options._.shift();

                    // check for valid params:
                    if (!Options.pathFolder) {
                        console.log();
                        console.log("missing required param: [path/to/folder]");
                        console.log();
                        Command.help();
                        process.exit(1);
                    }

                    var requiredParams = ["output"];
                    var isValid = true;

                    // check for valid params:
                    requiredParams.forEach((p) => {
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
                execute
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
    utils.checkDependencies(["docker"], done);
}

function execute(done) {
    let getSource = (path) => {
        let bracket;
        let source;

        if ("win32" == process.platform) {
            bracket = "";
            source = "%cd%";
        } else {
            bracket = '"';
            source = "$(pwd)";
        }

        if (path) source += `/${path}`;

        return `${bracket}${source}${bracket}`;
    };

    shell.exec(`docker run -it \
--mount type=bind,source=${getSource(Options.images)},target=/app/images \
--mount type=bind,source="${getSource(Options.audio)},target=/app/sound.mp3 \
--mount type=bind,source=${getSource()},target=/app/output skipdaddy/bbkcli:develop \
bbk ffmpeg --images=images --audio=sound.mp3 --output=${Options.output}`);

    done();
}
