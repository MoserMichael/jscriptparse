
let trace_on = false;

const setTrace = function(on) {
    trace_on = on;
}

function showRec(arg) {
    let ret = "";
    if (arg instanceof Array) {
        ret += "[";
        let i = 0;
        for (; i < arg.length; ++i) {
            if (i > 0) {
                ret += ",";
            }
            let obj = arg[i];
            ret += showRec(obj);
        }
        ret += "]";
    } else {
        ret += arg;
    }
    return ret;
}

// my short parser library
class State {
    constructor(pos, data, result = null) {
        this.pos = pos;
        this.data = data;
        this.result = result;
    }

    show() {
        return showRec(this.result);
    }
}

class ParserError extends Error {
    constructor(message, pos, nextException = null) {
        super(message);
        this.pos = pos;
        this.nextException = nextException;
    }
}

function getLineAt(data, pos) {
    let start = pos;
    for(;start>=0 && data.charAt(start) != '\n'; --start);
    if (start <= 0) {
        start = 0;
    }
    let end = pos;
    for(;end < data.length && data.charAt(end) != '\n'; ++end);
    return [ data.substring(start, end), pos-start];
}


function formatParserError(er, data) {
    if (er instanceof ParserError) {
        let msg = er.message;

        let entry = getLineAt(data,er.pos);
        msg += "\nat: " + entry[0] + "\n" + "   " + (" " * entry[1])

        if (er.nextException != null) {
            msg += "\n";
            msg += formatParserError(er.nextException, data);
        }
        return msg;
    }
    return er;
}


function makeError(message, pos, nested) {
    //console.trace("parser error at:" + pos);
    throw new ParserError(message, pos, nested);
}

const makeTracer = function(parser, title) {
    if (!trace_on) {
        return parser;
    }
    return function(state) {
        console.log("enter parser: " + title);

        let entry = getLineAt(state.data,state.pos);
        let msg = "\n" + entry[0] + "\n" + " ".repeat(entry[1]) + "^\n";
        console.log(msg);

        let ret = null;
        try {
            ret = parser(state);
        } catch(e) {
            console.log("error parsing: " + title + " error: " + e.message);
            throw e;
        }

        entry = getLineAt(ret.data,ret.pos);
        msg = "\n" + entry[0] + "\n" + " ".repeat(entry[1]) + "^\n";
        console.log(msg);

        console.log("exit parser: " + title);
        return ret;
    }
}


function isSpace(ch) {
    return ch.trim() == "";
}

function skipWhitespace(state) {
    while(state.pos < state.data.length) {
        let ch = state.data.charAt(state.pos);
        if (!isSpace(ch)) {
            break
        }
        state.pos+=1;
    }
    return state;
}

// returns parser that consumes argument token string or regex
const makeRegexParser = function (regex, name = null) {

    let type = -1;
    if (!(regex instanceof RegExp)) {
        let msg = "Illegal parser definition, expected string or regexp: " + regex + " :" + typeof(regex);
        console.log(msg);
        throw new Error(msg);
    }

    if (name == null) {
        name = regex.source;
    }

    return makeTracer(function (state) {
        state = skipWhitespace(state);
        if (state.pos >= state.data.length) {
            makeError("end of input. missing: " + regex.source, state.pos);
        }

        let remainder = state.data.substring(state.pos);
        let tres = regex.exec( remainder );
        if (tres != null) {
            return new State(state.pos + tres[0].length, state.data, tres[0]);
        }
        makeError("expected regex: " + regex.source, state.pos);
        return null;
    }, name=name);
}

// returns parser that consumes argument token string or regex
const makeTokenParser = function (token) {

    if (typeof(token) != 'string') {
        let msg = "Illegal parser definition, expected string: " + typeof(token);
        console.log(msg);
        throw new Error(msg);
    }

    return makeTracer(function (state) {
        state = skipWhitespace(state);
        if (state.pos >= state.data.length) {
            makeError("end of input. missing: " + token, state.pos);
        }
        if (state.data.substring(state.pos, state.pos + token.length) == token) {
            return new State(state.pos + token.length, state.data, token)
        }
        makeError("expected token: " + token, state.pos);
        return null;
    }, name=token);
}

function requireFunction(f) {
    if (!(f instanceof Function)) {
        throw new Error("argument is not a function");
    }
}

function requireArrayOfFunctions(a) {
    if (!(a instanceof Array)) {
        throw new Error("argument is not a array");
    }
    let i = 0;
    for(;i<a.length;++i) {
        if (!a[i] instanceof Function) {
            throw new Error("Array element " + i + " is not a function. Requires array of functions");
        }
    }
}
// returns parser that applies argument parser repeatedly
const makeRepetitionParser = function(parser, minMatching = 1, name = "RepetitionParser") {

    requireFunction(parser);

    return makeTracer( function (state) {
        let result = [];
        let matching = 0;

        for (; state.pos < state.data.length; ++matching) {
            try {
                let nextState = parser(state);
                result.push(nextState.result);
                state.pos = nextState.pos;
            } catch(er) {
                break;
            }
        }

        if (matching < minMatching) {
            if (matching == 0) {
                makeError("didn't match even one in " + name, state.pos);
            } else {
                makeError("didn't match enough in " + name, state.pos);
            }
        }

        state.result = result;
        return state;
    }, name);
}


// returns parser that applies all argument parsers sequentialy
const makeSequenceParser = function(arrayOfParsers, name="SequenceParser", simplifyResult = true) {

    requireArrayOfFunctions(arrayOfParsers);

    return makeTracer( function(state) {
        let result = [];
        let i = 0;
        for(;i < arrayOfParsers.length;++i) {
            let parser = arrayOfParsers[i];
            try {
                state = parser(state);
                result.push(state.result);
            } catch(er) {
                makeError("Parsing error in " + name + " at term " + i, state.pos, er);
            }
        }


        // Achtung! if last element is an empty array then chop it off
        // that's for cases when we have an optional repetition of clausese
        if (result.length != 0) {
            let last = result[result.length-1];
            if (last instanceof Array && last.length == 0) {
               result.pop();
            }
        }
        state.result = result;

        // Achtung! simplify result option for single terms that call down to a deeper clause
        if (simplifyResult) {
            if (state.result.length == 1) {
                state.result = state.result[0];
            }
        }

        return state;
    }, name);
}

// returns parser that must requires one of the argument parsers to math the input
const makeAlternativeParser = function(arrayOfParsers, name = "AlternativeParser", forwardWithIndex = false) {

    requireArrayOfFunctions(arrayOfParsers);

    return makeTracer(function (state) {
        let i = 0;
        for(;i < arrayOfParsers.length;++i) {
            let parser = arrayOfParsers[i];
            try {
                let res = parser(state);
                if (forwardWithIndex) {
                    res.result = [res.result, i];
                }
                return res;
            } catch(er) {
                // ignore error
            }
        }
        makeError("none of the argument parser matches in " + name, state.pos);
        return null;
    }, name);
}

// returns parser that must consume all of the input
const makeConsumeAll = function(nestedParser) {

    requireFunction(nestedParser);

    return function consumeAll(state) {
        let res = nestedParser(state);
        res=skipWhitespace(res);
        if (res.pos < state.data.length) {
            makeError(res, "did not parse all the string. Trailing data",res.pos);
        }
        return res;
    }
}


// returns parser that transforms the result of the argument parser/transforms parser error exception
const makeTransformer = function(nestedParser, transformResult, nameOfEntityOrErrorFunc) {

    requireFunction(nestedParser);

    return function consumeAll(state) {
        let pos = state.pos;
        let res = null;
        try {
            res = nestedParser(state);
        } catch(e) {
            let errorMsg = null;
            if (typeof(nameOfEntityOrErrorFunc) == 'string' ) {
                errorMsg = nameOfEntityOrErrorFunc(e);
            }
            if (errorMsg == null) {
                errorMsg = "Error while parsing " + nameOfEntityOrErrorFunc + "\nError: " + e;
            }
            makeError(state, errorMsg, pos);
        }
        res.result = transformResult(res.result);
        return res;
    }
}

// new makeForwarder - creates an instance of a forwarder!
function makeForwarder(innerFunc = null) {

    if (innerFunc != null) {
        requireFunction(innerFunc);
    }

    this.forward = function() {
        return function(state) {
            return innerFunc(state);
        }
    };

    this.setInner = function(newVal) {
        innerFunc = newVal;
    }
}

module.exports = {
    State,
    makeTokenParser,
    makeRegexParser,
    makeRepetitionParser,
    makeSequenceParser,
    makeAlternativeParser,
    makeConsumeAll,
    makeTransformer,
    makeForwarder,
    formatParserError,
    setTrace,
}
