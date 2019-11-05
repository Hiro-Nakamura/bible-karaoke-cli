//
// timing
// convert the text & timing files into a usable format
//
// options:
//
var async = require("async");
const { getAudioDurationInSeconds } = require("get-audio-duration");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var xml2json = require("xml2json");

var Options = {}; // the running options for this command.

var inputData = null;
var finalFormat = [];

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

  usage: $ bbk timing --input=[text] --output=[filename]


  [options] :
    --input      : path to the hearthis recording .xml ( AND audio files )
    --output     : path to the timing file

  examples:

    $ bbk install --input=/path/to/info.xml  --output=/path/to/formatted.js
        - reads in /path/to/info.xml
        - outputs json timing to /path/to/formatted.js

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

                    // check to see if input file exists

                    // check for valid params:
                    if (!Options.input) {
                        console.log("missing required param: [input]");
                        Command.help();
                        process.exit(1);
                    }

                    if (!Options.output) {
                        Options.output = path.join(
                            process.cwd(),
                            "bbkFormat.js"
                        );
                    }
                    done();
                },
                checkDependencies,
                checkInputExists,
                convertIt,
                saveOutput
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
 * @function checkInputExists
 * verify the path to the input file is correct
 * @param {function} done  node style callback(err)
 */
function checkInputExists(done) {
    fs.readFile(
        path.join(process.cwd(), Options.input),
        "utf8",
        (err, contents) => {
            if (err) {
                var error = new Error("Invalid path to input file");
                error.err = err;
                done(error);
                return;
            }
            inputData = contents;
            done();
        }
    );
}

/**
 * @function convertIt
 * convert our input data to our output format
 * @param {function} done  node style callback(err)
 */
function convertIt(done) {
    var jsonInput = xml2json.toJson(inputData, { object: true });
    // console.log(JSON.stringify(jsonInput, null, 4));

    var getDuration = (tObj, cb) => {
        var fileName = path.join(
            path.dirname(Options.input),
            `${tObj.index}.wav`
        );

        try {
            getAudioDurationInSeconds(fileName).then((duration) => {
                tObj.duration = duration * 1000; // convert to ms
                tObj.end = tObj.start + tObj.duration;
                // console.log(`${tObj.content} : ${tObj.duration}`);
                cb();
            });
        } catch (e) {
            var error = new Error(`Error trying to open file [${fileName}]`);
            cb(error);
        }
    };

    var formatWords = (words, tObj, start, cb) => {
        if (words.length == 0) {
            cb();
        } else {
            var word = words.shift();

            // totalChars = total characters
            var totalChars = tObj.content.length;

            // percent duration = wordLengh/totalChars
            //// NOTE: look at this if animation looks off.
            //// +1 to account for an additional space after the word
            //// problem might be last word in phrase...
            var percent = (word.length + 1) / totalChars;

            // wordDuration = percentDuration * tObj.duration

            // add wordEntry to tObj.words
            var entry = {
                word: word,
                start: start,
                end: start + Math.round(percent * tObj.duration)
            };

            // make sure end never goes beyond tObj.start + tObj.duration
            if (entry.end > tObj.start + tObj.duration) {
                entry.end = tObj.start + tObj.duration;
            }
            tObj.words.push(entry);
            formatWords(words, tObj, entry.end, cb);
        }
    };

    var processLine = (lines, startTime, cb) => {
        // process a single line of the input data at a time

        // if we have processed all the lines, return
        if (lines.length == 0) {
            cb();
        } else {
            // get next line
            var line = lines.shift();

            // convert to initial timingObj
            var timingObj = {
                type: "caption",
                index: parseInt(line.LineNumber) - 1,
                start: startTime,
                end: 0,
                duration: 0,
                content: line.Text,
                text: "",
                words: []
            };

            getDuration(timingObj, (err) => {
                if (err) {
                    cb(err);
                    return;
                } else {
                    // break down the words into durations
                    formatWords(
                        line.Text.split(" "),
                        timingObj,
                        timingObj.start,
                        (err) => {
                            if (err) {
                                cb(err);
                                return;
                            }

                            // store timingObj
                            finalFormat.push(timingObj);

                            // next line
                            processLine(
                                lines,
                                timingObj.start + timingObj.duration,
                                cb
                            );
                        }
                    );
                }
            });
        }
    };
    processLine(jsonInput.ChapterInfo.Recordings.ScriptLine, 0, (err) => {
        done(err);
    });
}

/**
 * @function saveOutput
 * save the output to our output file
 * @param {function} done  node style callback(err)
 */
function saveOutput(done) {
    fs.writeFile(
        Options.output,
        `module.exports = ${JSON.stringify(finalFormat, null, 4)}`,
        (err) => {
            if (err) {
                var error = new Error("error saving output file");
                error.err = err;
                done(error);
                return;
            }
            done();
        }
    );
}
