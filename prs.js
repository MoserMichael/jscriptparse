
let trace_on = false;
let location_with_token = false;

/**
 * Keep location with ast. This function must be called before calling any of the parser generating functions (like makeSequenceParser, etc.)
 * @param on - boolean true - enable tracing. (default: off)
 */
const setKeepLocationWithToken = function(on) {
    location_with_token = on;
}

/**
 * Enable tracing of the parser. This function must be called before calling any of the parser generating functions (like makeSequenceParser, etc.)
 * @param on - boolean true - enable tracing. (default: off)
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
    } else if ("show" in arg) {
        ret += arg.show();
    } else  {
        ret += arg.constructor.name;
    }
    return ret;
}

/**
 * class that encapsulates the parsers input and output of a parser.
 * The input is the current position of the parser and the text that is being parsed
 * The returned output is an object that represents the parsed value:
 */
class State {
    constructor(pos, data, result = null, lastError = null) {
        this.pos = pos;
        this.data = data;
        this.result = result;
        this.lastError = lastError;
    }

    show() {
        return showRec(this.result);
    }
}

class ParserError extends Error {
    constructor(message, pos, nextException = null) {
        super(message);
        this.pos = pos;
        this.data = null;
        this.filePath = null;

        this.nextException = null;
        if (nextException != null) {
            if (nextException instanceof ParserError) {
                this.nextException = nextException;
            } else {
                console.error("nextException is not a ParserError " + nextException.constructor.name);
                console.error("nextException " + nextException.stack);
            }
        }
    }

    getDeepest() {
        if (this.nextException != null) {
            let deepest = this.nextException.getDeepest();
            if (deepest.pos >= this.pos) {
                return deepest;
            }
        }
        return this;
    }
    getErrorPos() {
        return this.getDeepest().pos;
    }
}


function getMostMatchingError(errors) {
    let mostMatching = null;
    let longestMatch = -1;

    for(let i=0; i< errors.length; ++i) {
        let matchLen = errors[i].getErrorPos();
        if (matchLen > longestMatch) {
            longestMatch = matchLen;
            mostMatching = errors[i];
        }
    }
    return mostMatching;
}


function makeError(message, state, nested = null) {
    if (nested == null) {
        nested = state.lastError;
    } else {
        if (state.lastError != null && state.lastError.getErrorPos() > nested.getErrorPos()) {
            nested = state.lastError;
        }
    }
    throw new ParserError(message, state.pos, nested);
}

function getLineAt(data, pos) {

    if (pos >= data.length) {
        pos = data.length - 1;
    }

    // skip back whitespaces.
    for(;pos>0 && isSpace(data.charAt(pos));--pos);

    let start = pos;
    for(;start>=0 && data.charAt(start) != '\n'; --start);
    start += 1;
    let end = pos;
    for(;end < data.length && data.charAt(end) != '\n'; ++end);
    if (start > pos) {
        start = pos;
    }
    return [ data.substring(start, end), pos-start+1];
}


function formatParserError(er) {
    if (er instanceof ParserError) {
        er = er.getDeepest();

        let msg = "";
        let pos = er.pos;

        if (er.filePath != null) {
            msg = er.filePath + ": ";
        }

        msg += er.message;
        let entry = getLineAt(er.data,pos);
        msg += "\n" + entry[0] + "\n" +  Array(entry[1]).join(".") + "^";
        if (er.nextException != null) {
            msg += "\n";
            msg += formatParserError(er.nextException, data);
        }
        return msg;
    }
    return er.stack;
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
}

/**
 * Returns a parser that can matches/consumes a given regular expression
 * @param regex - the regex to match
 * @param name - optional name of the parser (for tracing purposes)
 * @returns parsing function that receives a State object for the current position within the input and returns the next state.
 */
const makeRegexParser = function (regex, name = null) {
    if (!(regex instanceof RegExp)) {
        let msg = "Illegal parser definition, expected RegRxp, got: " + typeof(regex);
        throw new Error(msg);
    }
    if (name == null) {
        name = regex.source;
    }
    return makeTracer(function (state) {
        skipWhitespace(state);

        if (state.pos >= state.data.length) {
            makeError("end of input. missing: " + regex.source, state);
        }

        let remainder = state.data.substring(state.pos);
        let tres = regex.exec( remainder );
        if (tres != null) {
            let data = null;

            if (location_with_token) {
                data = [ tres[0], state.pos ];
            } else {
                data = tres[0];
            }
            return new State(state.pos + tres[0].length, state.data, data);
        }
        makeError( name + " expected", state);
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
        let msg = "Illegal parser definition, expected string, got " + typeof(token);
        console.log(msg);
        throw new Error(msg);
    }

    return makeTracer(function (state) {
        skipWhitespace(state);
        if (state.pos >= state.data.length) {
            makeError("end of input. missing: " + token, state);
        }
        if (state.data.substring(state.pos, state.pos + token.length) == token) {
            let data = null;
            if (location_with_token) {
                data = [ token, state.pos ];
            } else {
                data = token;
            }
            return new State(state.pos + token.length, state.data, data)
        }
        makeError("expected token: " + token, state);
        return null;
    }, name=token);
}

function requireFunction(f) {
    if (!(f instanceof Function)) {
        let msg="argument is not a function";
        console.trace(msg);
        throw new Error(msg);
    }
}

function requireArrayOfFunctions(a) {
    if (!(a instanceof Array)) {
        let msg = "argument is not a array";
        console.trace(msg);
        throw new Error(msg);
    }

    for(let i=0; i < a.length; ++i) {
        if (!a[i] instanceof Function) {
            let msg = "Array element " + i + " is not a function. Requires array of functions";
            console.trace(msg);
            throw new Error(msg);
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
                state = parser(state);

                if (concat) {
                    result = result.concat(state.result);
                } else {
                    result.push(state.result);
                }
            } catch(er) {
                state.lastError = er;
                break;
            }
        }

        if (matching < minMatching && minMatching != 0) {
            if (matching == 0) {
                makeError("didn't match even one in " + name, state);
            } else {
                makeError("didn't match enough in " + name, state);
            }
        }

        state.result = result;
        return state;
    }, name);
}

const makeRepetitionRecClause = function(parserMandatory, parserRepetition, title = "RecursiveClause", concat = false) {

    requireFunction(parserMandatory);
    requireFunction(parserRepetition);

    return makeTracer( function (state) {
        let result = [];

        state = parserMandatory(state);
        if (concat) {
            result = result.concat(state.result);
        } else {
            result.push( state.result );
        }

        while(true) {
            try {
                state = parserRepetition(state);
                if (concat) {
                    result = result.concat(state.result);
                } else {
                    result.push( state.result );
                }
            } catch(er) {
                if (!(er instanceof ParserError)) {
                    console.log(er.message + " " + er.stack)
                } else {
                    state.lastError = er;
                }
                break;
            }
        }

        state.result = result;
        return state;
    }, title);
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
const makeSequenceParser = function(arrayOfParsers, title ="SequenceParser", concat = false) {

    requireArrayOfFunctions(arrayOfParsers);

    return makeTracer( function(state) {
        let result = [];

        skipWhitespace(state);

        for(let i = 0;i < arrayOfParsers.length;++i) {
            let parser = arrayOfParsers[i];
            try {
                state = parser(state);
                if (concat) {
                    result = result.concat(state.result);
                } else {
                    result.push(state.result);
                }
            } catch(er) {
                if (er.pos == state.pos || i == 0) {
                    er = null; // do not propagate inner error if no input has been consumed.
                }
                makeError("Parsing error in " + title + " at term " + i, state, er);
            }
        }

        // Achtung! if last element is an empty array then chop it off
        // that's for cases when we have an optional repetition of clauses
        if (result.length != 0) {
            let last = result[result.length-1];
            if (last instanceof Array && last.length == 0) {
               result.pop();
            }
        }
        state.result = result;
        return state;
    }, title);
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

        // required for error handling
        skipWhitespace(state);

        let initialPos = state.pos;

        let errors = [];

        for(;i < arrayOfParsers.length;++i) {
            let parser = arrayOfParsers[i];
            try {
                let res = parser(state);
                if (forwardWithIndex) {
                    res.result = [res.result, i];
                }
                return res;
            } catch(er) {
                if (er instanceof ParserError) {
                    errors.push(er);
                } else {
                    console.trace("!unknown exception: " + er.stack);
                }
            }
        }
        // pick the most advanced error
        let nested = getMostMatchingError(errors);

        if (nested != null && nested.getErrorPos() == initialPos) {
            nested = null; // disregard error of nested clause that did not consume input
        } else {
            state.lastError = nested;
        }


        makeError("none of the argument parser matches in " + name, state);
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
        skipWhitespace(res);
        if (res.pos < state.data.length) {
            if (state.lastError == null) {
                makeError("error at:", res);
            } else {
                throw state.lastError;
            }
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
        requireFunction(newVal);
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
        makeRepetitionRecClause,
        makeSequenceParser,
        makeAlternativeParser,
        makeConsumeAll,
        makeTransformer,
        makeForwarder,
        formatParserError,
        setTrace,
        setKeepLocationWithToken,
        ParserError,
        getLineAt,
        isSpace
    }
}
