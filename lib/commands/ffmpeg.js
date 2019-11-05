//
// ffmpeg
// convert the text & export files into a usable format
//
// options:
//
var async = require("async");
var path = require("path");
var fs = require("fs");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
    command: "ffmpeg",
    params: "",
    descriptionShort:
        "convert the text and export files into an intermediate format.",
    descriptionLong: `
`
});

module.exports = Command;

Command.help = function() {
    console.log(`

  usage: $ bbk ffmpeg --images=[images] --audio=[audio] --output=[output] --ffmpegPath=[/path/to/ffmpeg]

  [name] : the name of the directory to install the AppBuilder Runtime into.

  [options] :
    --images        : path to the image folder
    --audio         : path to the audio file
    --output        : output name
    --ffmpegPath    : (optional) path to the ffmpeg executable
    --framerateIn   : (optional) {number} what rate are the images taken at 
    --framerateOut  : (optional) {number} what is the resulting framerate of the video

  examples:

    $ bbk ffmpeg --images=/path/to/image  --audio=/path/to/audio --output=file
        - reads in /path/to/image
        - reads in /path/to/audio
        - output format to console

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

                    let requiredParams = ["images", "audio", "output"];
                    let isValid = true;

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

                    if (!Options.framerateIn) {
                        Options.framerateIn = "30";
                    }

                    if (!Options.framerateOut) {
                        Options.framerateOut = "";
                    } else {
                        Options.framerateOut = `-r ${Options.framerateOut}`;
                    }

                    done();
                },
                checkDependencies,
                checkAudioInput,
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
 * @function checkAudioInput
 * Adjust the audio parameter depending on what was provided.
 * if they sent us a file reference, just use that. Otherwise if it was a
 * folder, then we need to pass all the files to the comamnd line.
 * @param {function} done  node style callback(err)
 */
function checkAudioInput(done) {
    // Folder
    if (fs.lstatSync(Options.audio).isDirectory()) {
        let files = (fs.readdirSync(Options.audio) || []).map((fileName) =>
            path.join(Options.audio, fileName)
        );
        let mp3Files = files.filter((f) => f.indexOf(".mp3") > -1),
            wavFiles = files.filter((f) => f.indexOf(".wav") > -1),
            audioFiles = [];

        // If this folder contains wave and mp3 files, then throw error
        if (mp3Files.length && wavFiles.length) {
            return done(new Error("Conflicting audio types"));
        } else if (mp3Files.length) {
            audioFiles = mp3Files;
        } else if (wavFiles.length) {
            audioFiles = wavFiles;
        }

        Options.audioInput = "concat:" + audioFiles.join("|");
    }
    // File
    else {
        Options.audioInput = Options.audio;
    }
    done();
}

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
    // if they provide a executable path then we don't check
    if (Options.ffmpegPath) {
        done();
        return;
    }

    // verify we have 'ffmpeg'
    utils.checkDependencies(["ffmpeg"], done);
}

function execute(done, err) {
    var ffmpegExe = "ffmpeg";
    if (Options.ffmpegPath) {
        ffmpegExe = Options.ffmpegPath;
    }

    shell.exec(
        `${ffmpegExe} -framerate ${Options.framerateIn} -pattern_type glob -i '${Options.images}/*.png' -i '${Options.audioInput}'  ${Options.framerateOut} -pix_fmt yuv420p ${Options.output}`
    );

    done();
}
