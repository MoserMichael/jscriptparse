#!/usr/bin/env NODE_PATH=. node 

const path=require("node:path");
const repl=require("node:repl");
const rl=require("node:readline");
//const repl=require(path.join(__dirname,"repln.js")) //"node:repl");
const rt=require(path.join(__dirname,"rt.js"));
const scr=require(path.join(__dirname,"scripty.js"));
const prs=require(path.join(__dirname,"prs.js"));
const fs=require("fs");

const PYX_VERSION = "VERSION_TAG";

let history_file_name = "pyx_history";
let nodejsRepl = null;

function skipSpace(data, pos) {
    for(;pos < data.length && prs.isSpace(data.charAt(pos));++pos);
    return pos;
}

let isRunning = false;

function onSig() {
    //console.log("onSig");
    /*
    if (isRunning) {
        rt.setForceStopEval();
    }
    */
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
            nodejsRepl.history.unshift(histLines[i]);
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

function runEvalLoop(cmdLine) {

    let sym = [ ' ', '\t', '\r', '\n', 'ֿֿֿֿ%', '*', '+', '-', '=', '%', ')', '(', '}', '.' ];
    sym = sym.concat( Object.keys(scr.KEYWORDS) );

    let runEvalImp = function() {

        let glob = new rt.makeFrame(cmdLine);

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
                    if (res != null && res.type != rt.TYPE_NONE) {
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

        let tryToCompleteMapKey = function(line, dotIndex) {
            let lastToken = "";
            let lastDot = line.lastIndexOf(".");
            if (lastDot != -1)
                lastToken = line.substring(lastDot+1).trim()

            // search back to the first term - the name of the map.
            let index = -1;
            for(let i=0; i<sym.length; ++i) {
                if (sym[i] != ".") {
                    let lastIndex = line.lastIndexOf(sym[i]) ;
                    if (lastIndex != -1) {
                        lastIndex += sym[i].length;

                        if (lastIndex > index) {
                            index = lastIndex;
                        }
                    }
                }
            }

            // find start of map variable
            if (index == -1) {
                index = 0;
            } else {
                for(;prs.isSpace(line[index]); index += 1);
            }

            // now evaluate the map (tricky part)
            let val = null;
            let isFirst = true;

            while(index != lastDot) {
                let nextIndex = line.indexOf(".", index)
                if (nextIndex == -1) {
                    return null;
                }
                let sval = line.substring(index, nextIndex).trim();

                if (isFirst) {
                    val = glob.lookup(sval);
                } else {
                    val = val.val[ sval ];
                }

                if (val == null || val.type != rt.TYPE_MAP) {
                    return null;
                }
                if (nextIndex == dotIndex) {
                    break;
                }
                index = nextIndex + 1;
            }

            // now try to complete it.
            let keys = Object.keys(val.val)
            let comp = [];
            for(let i=0; i< keys.length;++i) {
                if (lastToken == "" || keys[i].startsWith(lastToken)) {
                    comp.push(keys[i]);
                }
            }
            return comp;
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
                if (line[index-1] == '.') {
                    // try to complete map keysddddDD
                    let mapCompletion = tryToCompleteMapKey(line, index-1 )
                    if (mapCompletion != null) {
                        return [ mapCompletion, lastToken.trim() ]
                    }
                }
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

function evalExpression(expr, frame) {
    return scr.runParserAndEval(expr, false, frame, null);
}


function evalFile(file, cmdLine) {
    let result = 0;

    let frame = rt.makeFrame(cmdLine);
    if (!scr.runParserAndEval(file, true, frame, null, cmdLine)) {
        result = 1;
    }

    process.exit(result);
}

function showVersion() {
    console.log("This is pyx version " + PYX_VERSION + `

Copyright 2023 by Michael Moser
Published under the MIT license

For more information see: https://github.com/MoserMichael/jscriptparse

`);
    process.exit(1);
}

function printHelp() {
    console.log(`pyx [-x] [-f] [-e 'println("hello world")'] [<file>]  [[--] <command line parameters>]] [-h] [-v]

pyx          : Starts shell/repl when run without command line arguments

pyx <file>   : run the pyx program in the file, following command line parameters are passed to program

pyx -e 'val' : run the string 'val' as a pyx program (one liner)
               You can have several options, they are run one after the other.

-x           : set trace mode (statement evaluation is traced)

-f           : throw and exception, if shelling out to command via system or backtick fails 

-v           : show version

-h           : show this help text   
    `);
    process.exit(1);
}

function parseCmdLine() {
    let ret = {
        fileName: null,
        cmdLine: null,
        traceMode: false,
        errorOnExecFail: false,
        expression: null
    };

    let i=2;
    for(;i<process.argv.length;i++) {
        if (process.argv[i] == '-h') {
            printHelp();
        } else if (process.argv[i] == '-v') { 
            showVersion(); 
        } else if (process.argv[i] == '--') {
            break;
        } else if (process.argv[i] == '-e') {
            i+=1;
            if (i>=process.argv.length) {
                printHelp();
            }
            if (ret.expression == null) {
                ret.expression = [];
            }
            ret.expression.push(process.argv[i]);

        } else if (process.argv[i] == '-x') {
            ret.traceMode = true;
        } else if (process.argv[i] == '-f') {
            ret.errorOnExecFail = true
        } else {
            ret.fileName = process.argv[i];
            i += 1;
            break;
        }    
    }

    let cmdLine = [];
    if (i<process.argv.length) {
        if (process.argv[i] == '--') {
            i += 1;
        }
        for (; i < process.argv.length; i++) {
            cmdLine.push(process.argv[i]);
        }
    }
    ret.cmdLine = cmdLine;

    return ret;
}

function runMain() {

    rt.setEvalCallback(evalExpression);

    let cmd = parseCmdLine();

    if (cmd.traceMode) {
        rt.setTraceMode(true);
    }
    if (cmd.errorOnExecFail) {
        rt.setErrorOnExecFail( true);
    }

    if (cmd.fileName == null && cmd.expression == null) {
        runEvalLoop(cmd.cmdLine)
    } else {
        if (cmd.fileName != null) {
            evalFile(cmd.fileName, cmd.cmdLine);
        } else {
            let frame = rt.makeFrame(cmd.cmdLine);
            for(let i=0;i< cmd.expression.length;++i) {
                evalExpression(cmd.expression[i], frame);
            }
        }
    }
}

runMain();




