#!/usr/bin/env node

const path=require("node:path");
const repl=require("node:repl");
//const repl=require(path.join(__dirname,"repln.js")) //"node:repl");
const rt=require(path.join(__dirname,"rt.js"));
const scr=require(path.join(__dirname,"scripty.js"));
const prs=require(path.join(__dirname,"prs.js"));

function skipSpace(data, pos) {
    for(;pos < data.length && prs.isSpace(data.charAt(pos));++pos);
    return pos;
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

function runEvalLoop() {

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
                let res = scr.runParserAndEval(data, false, glob, true);

                try {
                    if (res != 0) {
                        evalPrintMsg += JSON.stringify(rt.rtValueToJsVal(res));
                    }
                } catch(e) {
                    // ignore
                }

            } catch(e) {
                if (e instanceof prs.ParserError) {
                    e = e.getDeepest();
                    //console.log(JSON.stringify(e));
                    e.pos = skipSpace(data, e.pos);

                    if (e.pos >= data.length) {
                        return callback(new repl.Recoverable(e));
                    }
                    callback(null,prs.formatParserError(e, data));
                }
            }
            callback(null,evalPrintMsg);
        }

        let doComplete = function(line) {

            let sym = [ ' ', '\t', '\r', '\n', 'ֿֿֿֿ%', '*', '+', '-', '=', '%', ')', '}' , 'if', 'while', "def" ];
            let index = -1;
            for(let i=0; i<sym.length;++i) {
                let lastIndex = line.lastIndexOf(sym[i]) ;
                if (lastIndex != -1) {
                    lastIndex += sym[i].length;

                    if (lastIndex > index) {
                        index = lastIndex;
                    }
                }
            }
            let lastToken = "";
            //let prevLine = "";
            if (index != -1) {
                lastToken = line.substring(index);
                //prevLine = line.substring(0, index);
            } else {
                lastToken = line;
                //prevLine=line;
                index = 0;
            }

            lastToken = lastToken.trim();
            let completions = completeKeywords(lastToken);
            let varCompletions = completeVars(lastToken, glob);
            completions = completions.concat(varCompletions);

            if (completions.length == 1) {
                completions[0] = completions[0].substring(lastToken.length);
            }

            //console.log(">" + prevLine + "<");

            return [completions,""]
        }

        let r = repl.start({
            prompt: "> ",
            eval: evalIn,
            writer: doWrite,
            completer: doComplete
        });
        r.on('SIGINT', function onSigInt() {
            process.exit(0);
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

function runMain() {

    if (process.argv.length < 3) {
        runEvalLoop()
    } else {
        evalFile(process.argv[2]);
    }

}

runMain();




