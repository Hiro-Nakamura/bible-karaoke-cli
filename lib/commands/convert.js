//
// convert
// converts the provided hearthis files into a bbk output video.
//
// options:
// python main.py /path/to/folder -c [true,False] -o [csv, json, vtt]
// -c --combine  : combine wave files into 1 file
// -o --output   : output format
//
var async = require("async");
var inquirer = require("inquirer");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");

var tempy = require("tempy");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

// our other commands that we reuse:
const Timings = require(path.join(__dirname, "timing.js"));
const Frames = require(path.join(__dirname, "frames.js"));
const FFMPEG = require(path.join(__dirname, "ffmpeg.js"));

// var Setup = require(path.join(__dirname, "setup.js"));

var Options = {}; // the running options for this command.

shell.config.execPath = shell.which("node");

//
// Build the Install Command
//
var Command = new utils.Resource({
    command: "convert",
    params: "",
    descriptionShort: "convert hearthis data into a video.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  Usage: $ bbk convert [path/to/folder] --bgImage=[path/to/image.png] --output=[outputFile.mp4] --fps=[#]

  [path/to/folder] : the name of the directory with the Hearthis files to convert

  Options:
    --output     : name of the desired output file (.mp4) 
    --bgImage    : (optional) an image for the background
    --fps        : (optional) the frames per second of the output (30)
    --ffmpegPath : (optional) path to your ffmpeg executable

  Examples:

    $ bbk convert genesis/ch1 --output=genesis_01
        - reads in the Hearthis data from ./genesis/ch1
        - no background image 
        - outputs to ./genesis_01.mp4
        - output is 30 fps
        - uses ffmpeg found in your $PATH 

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
                    done();
                },
                askQuestions,
                (done) => {
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
    utils.checkDependencies([], done);
}

/**
 * @function askQuestions
 * if nothing was provided on the cli, ask the user for the info.
 * @param {function} done  node style callback(err)
 */
function askQuestions(done) {
    inquirer
        .prompt([
            {
                name: "pathFolder",
                type: "input",
                message: "Enter the path to the Hearthis folder to convert:",
                default: "",
                validate: (input) => {
                    if (fs.existsSync(input)) {
                        return true;
                    } else {
                        return "Can't find directory! Make sure you typed it in correctly.";
                    }
                },
                when: (values) => {
                    return !values.pathFolder && !Options.pathFolder;
                }
            },
            {
                name: "wantBG",
                type: "confirm",
                message: "Do you want to add a background image:",
                default: false,
                when: (values) => {
                    return (
                        !values.wantBG && typeof Options.bgImage == "undefined"
                    );
                }
            },
            {
                name: "bgImage",
                type: "input",
                message:
                    "Enter the path to the background image you want to use:",
                default: "",
                validate: (input) => {
                    if (fs.existsSync(input)) {
                        return true;
                    } else {
                        return "Can't find image! Make sure you typed it in correctly.";
                    }
                },
                when: (values) => {
                    return values.wantBG && !values.bgImage && !Options.bgImage;
                }
            },
            {
                name: "output",
                type: "input",
                message: "Enter the desired name of the final video:",
                default: "",
                validate: (input) => {
                    if (fs.existsSync(input)) {
                        return "that file already exists.";
                    } else {
                        return true;
                    }
                },
                when: (values) => {
                    return !values.output && !Options.output;
                }
            }
        ])
        .then((answers) => {
            // update Options with our answers:
            for (var a in answers) {
                Options[a] = answers[a];
            }
            done();
        });
}

// function checkExistingFile(done) {
//     if (fs.existsSync(Options.output)) {

//     }
// }

function execute(done) {
    var pathBBKFile = tempy.file({ name: "bbkFormat.js" });
    console.log(`path to bbkFormat: ${pathBBKFile}`);
    Promise.resolve()
        .then(() => {
            var pathToInfo = Options.pathFolder;
            if (path.basename(pathToInfo) != "info.xml") {
                pathToInfo = path.join(pathToInfo, "info.xml");
                Options.pathFolder = pathToInfo;
            }
            return Timings.run({
                input: pathToInfo,
                output: pathBBKFile
            });
        })
        .then(() => {
            var opts = {
                inputJSON: pathBBKFile
            };
            if (Options.bgImage) {
                opts.bgImage = Options.bgImage;
            }
            return Frames.run(opts);
        })
        .then((pathFrames) => {
            console.log(`>> path to generated frames folder: ${pathFrames}`);
            return FFMPEG.run({
                images: pathFrames,
                audio: path.dirname(Options.pathFolder),
                output: Options.output,
                framerateOut: Options.fps || 30,
                ffmpegPath: Options.ffmpegPath || null
            });
        })
        .then(() => {
            done();
        })
        .catch((err) => {
            done(err);
        });
}
