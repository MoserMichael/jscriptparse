#!/usr/bin/env node

const path=require("node:path");
const repl=require("node:repl");
const rl=require("node:readline");
//const repl=require(path.join(__dirname,"repln.js")) //"node:repl");
const rt=require(path.join(__dirname,"rt.js"));
const scr=require(path.join(__dirname,"scripty.js"));
const prs=require(path.join(__dirname,"prs.js"));
const fs=require("fs");


let history_file_name = "pyx_history";
let nodejsRepl = null;

function skipSpace(data, pos) {
    for(;pos < data.length && prs.isSpace(data.charAt(pos));++pos);
    return pos;
}

let isRunning = false;

function onSig() {
    //console.log("onSig");
    if (isRunning) {
        rt.setForceStopEval();
    }
    process.exit(1);
}

function completeKeywords(prefix) {
    let keywords = Object.keys(scr.KEYWORDS);
    let result = []
    for(let i=0; i<keywords.length; ++i) {
        let kw = keywords[i];
        if (prefix=="" || kw.startsWith(prefix)) {
            result.push(kw);
            //result.push(kw.substring(prefix.length));
        }
    }
    result.sort();
    return result;
}

function completeVars(lastToken, frame) {
    let res = [];
    frame.complete(lastToken, res);
    return res.sort();
}


function readHistory() {
    try {
        let hist = fs.readFileSync(history_file_name);
        let histLines = hist.toString().split("\n");
        for (let i = 0; i < histLines.length; ++i) {
            nodejsRepl.history.push(histLines[i]);
        }
    } catch(ex) {
    }
}

function replCommandParsedCallback(parsedSource) {
    fs.appendFileSync(history_file_name, parsedSource + "\n");
    nodejsRepl.history.push(parsedSource);
}

// syntax error due to string not closed is a lexical error. try to recover from it - so to know if repl is in 'continuation mode'
// very brittle...
function isSyntaxErrorDueToStringNotClosed(pos, data, glob) {
    let next_ch = '"';
    if (pos < data.length) {
        next_ch = data[pos + 1];

        let symStr = "'\"`";
        let idx = symStr.indexOf(next_ch);
        if (idx != -1) {
            next_ch = symStr.substring(idx,idx+1);
        } else {
            return false;
        }
    }

    data += next_ch;

    try {
        scr.runParse(data,false, true);
        return true;
    } catch(er) {
        if (er.pos >= data.length) {
            return true;
        }
    }
    return false;
}

function runEvalLoop() {

    let sym = [ ' ', '\t', '\r', '\n', 'ֿֿֿֿ%', '*', '+', '-', '=', '%', ')', '(', '}' ];
    sym = sym.concat( Object.keys(scr.KEYWORDS) );

    let runEvalImp = function() {

        let glob = new rt.makeFrame();

        let doWrite = function(arg) { return arg };

        let evalIn = function(data, context, filename, callback) {

            let evalPrintMsg = "";

            function logHook(msg) {
                evalPrintMsg += msg;
            }

            //rt.setLogHook(logHook);

            try {
                isRunning = true;
                let res = scr.runParserAndEval(data, false, glob, replCommandParsedCallback);
                isRunning = false;

                try {
                    if (res != null) {
                        evalPrintMsg += JSON.stringify(rt.rtValueToJsVal(res));
                    }
                } catch(e) {
                    console.error("Can't show result value. internal error",e);
                }

            } catch(e) {
                if (e instanceof scr.ScriptError) {

                   if (isSyntaxErrorDueToStringNotClosed(e.pos, data, glob)) {
                       return callback(new repl.Recoverable(e));
                   }

                   if (e.eof && !e.noRecover) {
                       return callback(new repl.Recoverable(e));
                   }
                   callback(null, e.message);
                } else {
                   callback(null, e.message);
                }
            }
            callback(null,evalPrintMsg);
        }

        let doComplete = function(line) {

            let index = -1;
            for(let i=0; i<sym.length; ++i) {
                let lastIndex = line.lastIndexOf(sym[i]) ;
                if (lastIndex != -1) {
                    lastIndex += sym[i].length;

                    if (lastIndex > index) {
                        index = lastIndex;
                    }
                }
            }
            let lastToken = "";
            if (index != -1) {
                lastToken = line.substring(index);
            } else {
                lastToken = line;
            }


            lastToken = lastToken.trim();

            let completions = completeKeywords(lastToken);
            let varCompletions = completeVars(lastToken, glob);
            completions = completions.concat(varCompletions);

            return [completions, lastToken]
        }

        nodejsRepl = repl.start({
            prompt: "> ",
            eval: evalIn,
            writer: doWrite,
            completer: doComplete,
        });

        readHistory();

        // doesn't workd... :-(
        nodejsRepl.on('SIGINT', function() {
            onSig();
        });
        nodejsRepl.on('SIGTERM', function() {
            onSig()
        });

    }
    runEvalImp();
}

function evalFile(file) {
    let result = 0;

    if (!scr.runParserAndEval(file, true)) {
        result = 1;
    }

    process.exit(result);
}

function printHelp() {
    console.log(`pyx [-h] <file> [-e 'println("hello world")']

pyx          : Starts shell/repl if run without arguments

pyx <file>   : run the provided pyx program

pyx -e 'val' : run the string 'val' as a pyx program (one liner)

-h           : show this help text   
    `);
    process.exit(1);
}

function cmdLine() {
    if (process.argv.length == 4) {
        if (process.argv[2] == '-e') {
            let result = 0;
            if (!scr.runParserAndEval(process.argv[3], false)) {
                result = 1;
            }
            process.exit(result);
        }
    }
    printHelp();
}

function runMain() {


    if (process.argv.length < 3) {
        runEvalLoop()
    } else {
        if (process.argv.length == 3) {
            if (process.argv[2] == '-h' || process.argv[2] == '--help') {
                printHelp();
            }
            evalFile(process.argv[2]);
        }
        cmdLine();
    }
}

runMain();




