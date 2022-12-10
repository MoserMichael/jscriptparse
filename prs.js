
let trace_on = false;

/**
 * Enable tracing of the parser. This function must be called before calling any of the parser generating functions (like makeSequenceParser, etc.)
 * @param on - boolean true - enable tracing.
 */
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

/**
 * class that encapsulates the parsers input and output of a parser.
 * The input is the current position of the parser and the text that is being parsed
 * The returned output is an object that represents the parsed value:
 */
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

function makeError(message, pos, nested) {
    //console.log("message:" + message + " pos: " + pos + " nested: " + nested);
    let ex = new ParserError(message, pos, nested);
    throw ex;
}

function getLineAt(data, pos) {
    let start = pos;
    for(;start>=0 && data.charAt(start) != '\n'; --start);
    start += 1;
    let end = pos;
    for(;end < data.length && data.charAt(end) != '\n'; ++end);
    return [ data.substring(start, end), pos-start];
}


function formatParserError(er, data) {
    if (er instanceof ParserError) {
        let msg = er.message;

        let entry = getLineAt(data,er.pos);
        msg += "\n" + entry[0] + "\n" +  Array(entry[1]).join(".") + "^";
        if (er.nextException != null) {
            msg += "\n";
            msg += formatParserError(er.nextException, data);
        }
        return msg;
    }
    return er;
}


const makeTracer = function(parser, title) {
    if (!trace_on) {
        return parser;
    }
    return function(state) {
        console.log("enter parser: " + title);

        let entry = getLineAt(state.data,state.pos);
        let msg = entry[0] + "\n" + " ".repeat(entry[1]) + "^";
        console.log(msg);

        let ret = null;
        try {
            ret = parser(state);
        } catch(e) {
            console.log("error parsing: " + title + " error: " + e.message);
            throw e;
        }

        entry = getLineAt(ret.data,ret.pos);
        msg = entry[0] + "\n" + " ".repeat(entry[1]) + "^";
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

/**
 * Returns a parser that can matches/consumes a given regular expression
 * @param regex - the regex to match
 * @param name - optional name of the parser (for tracing purposes)
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
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

/**
 * returns parser that consumes argument token string
 * @param token
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
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

/**
 * returns parser that applies argument parser repeatedly
 * @param parser - argument parsing function
 * @param minMatching - number of minimal matches (default 1)
 * @param maxMatching - number of maximum allowed matches, -1 - no limit
 * @param name
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
const makeRepetitionParser = function(parser, minMatching = 1, maxMatching = -1, name = "RepetitionParser", concat = false) {

    requireFunction(parser);

    return makeTracer( function (state) {
        let result = [];
        let matching = 0;

        for (; state.pos < state.data.length && (maxMatching == -1 || matching < maxMatching); ++matching) {
            try {
                let nextState = parser(state);

                if (concat) {
                    result = result.concat(nextState.result);
                } else {
                    result.push(nextState.result);
                }
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

/**
 * returns parser that applies the argument parser at least once
 * @param parser
 * @param name
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.*
 */
const makeOptParser = function(parser, name = "OptParser") {
    return makeRepetitionParser(parser, 0, 1, name);
}

/**
 * returns parser that applies all argument parsers sequentially
 * @param arrayOfParsers - array of argument parsers, each one applied after the previous one.
 * @param name
 * @param simplifyResult
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
const makeSequenceParser = function(arrayOfParsers, name="SequenceParser", concat = false) {

    requireArrayOfFunctions(arrayOfParsers);

    return makeTracer( function(state) {
        let result = [];
        let i = 0;
        for(;i < arrayOfParsers.length;++i) {
            let parser = arrayOfParsers[i];
            try {
                state = parser(state);
                if (concat) {
                    result = result.concat(state.result);
                } else {
                    result.push(state.result);
                }
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
        if (state.result.length == 1) {
            state.result = state.result[0];
        }

        return state;
    }, name);
}


/**
 * returns parser that must requires one of the argument parsers to math the input
 * @param arrayOfParsers - array of argument parsers, tries to apply each of them, consecutively.
 * @param name
 * @param forwardWithIndex
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
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

/**
 * returns parser that must consume all of the input
 * @param nestedParser
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
const makeConsumeAll = function(nestedParser) {

    requireFunction(nestedParser);

    return function consumeAll(state) {
        let res = nestedParser(state);
        res=skipWhitespace(res);
        if (res.pos < state.data.length) {
            makeError("did not parse all the string. Trailing data",res.pos);
        }
        return res;
    }
}

/**
 * returns parser that transforms the result of the argument parser/transforms parser error exception
 * @param nestedParser
 * @param transformResult
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
const makeTransformer = function(nestedParser, transformResult) {

    requireFunction(nestedParser);
    requireFunction(transformResult);

    return function(state) {
        res = nestedParser(state);
        res.result = transformResult(res.result);
        return res;
    }
}

/**
 * returns a forwarding parser, the inner parser can be set later on. This is used to express recursive grammars.
 * @param nestedParser
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
const makeForwarder = function (innerFunc = null) {

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

if (typeof(module) == 'object') {
    module.exports = {
        State,
        makeTokenParser,
        makeRegexParser,
        makeOptParser,
        makeRepetitionParser,
        makeSequenceParser,
        makeAlternativeParser,
        makeConsumeAll,
        makeTransformer,
        makeForwarder,
        formatParserError,
        setTrace,
    }
}
