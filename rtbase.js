
let doLogHook = function(msg) { process.stdout.write(msg); }

let maxStackFrames = 20;
let traceMode = false;
let tracePrompt = "+ ";

function setMaxStackFrames(nframes) {
    maxStackFrames = nframes
}

function setLogHook(hook) {
    doLogHook = hook;
}

function setTraceMode(on) {
    traceMode = on;
}

function getTraceMode() {
    return traceMode;
}

function getTracePrompt() {
    return tracePrompt;
}

const TYPE_BOOL=0
const TYPE_NUM=1
const TYPE_STR=2
const TYPE_REGEX=3
const TYPE_LIST=4
const TYPE_MAP=5
const TYPE_NONE=6
const TYPE_CLOSURE=7
const TYPE_BUILTIN_FUNCTION=8

const TYPE_FORCE_RETURN=9
const TYPE_FORCE_BREAK=10
const TYPE_FORCE_CONTINUE=11

class ClosureValue {
    // needs the function definition and the frame of the current function (for lookup of captured vars)
    constructor(functionDef, defaultParamValues, frame) {
        this.type = TYPE_CLOSURE;
        this.functionDef = functionDef;
        this.defaultParamValues = defaultParamValues; // default params are set when function/closure is evaluated.
        this.frame = frame;
        this.hasYield_ = null;
    }
    hasYield(frame) {
        if (this.hasYield_ == null) {
            this.hasYield_ = this.functionDef.hasYield(frame);
        }
        return this.hasYield_;
    }
}

class BuiltinFunctionValue {
    constructor(help_, numParams, funcImpl, defaultParamValues = [], hasYield = false) {
        this.type = TYPE_BUILTIN_FUNCTION;
        this.numParams = numParams;
        this.funcImpl = funcImpl;
        this.defaultParamValues = defaultParamValues;
        this.hasYield_ = hasYield;
        if (help_ != null) {
            this.help = help_;
        }
    }

    hasYield() {
        return this.hasYield_;
    }
}


class Value {
    constructor(type, val, help_ = null) {
        this.type = type;
        this.val = val;

        if (help_ != null) {
            this.help = help_;
        }

    }

    show() {
        return this.val.toString()
    }
}

class RegexValue {
    constructor(value) {
        this.type = TYPE_REGEX;

        this.isGlobal = value.endsWith('g');

        let firstPos = value.indexOf('/');
        let lastPos = value.lastIndexOf('/');
        let flags = null;
        if (!value.endsWith('//')) {
            flags = value.substring(lastPos+1);
        }
        let rawRegex = value.substring(firstPos+1, lastPos);
        this.regex = new RegExp(rawRegex, flags);
        this.val = this.regex.toString();
    }

    show() {
        return this.val;
    }
}


if (typeof(module) == 'object') {
    module.exports = {
        doLogHook,
        setLogHook,
        maxStackFrames,
        setMaxStackFrames,
        tracePrompt,
        setTraceMode,
        getTraceMode,
        getTracePrompt,
        TYPE_BOOL,
        TYPE_NUM,
        TYPE_STR,
        TYPE_REGEX,
        TYPE_LIST,
        TYPE_MAP,
        TYPE_NONE,
        TYPE_CLOSURE,
        TYPE_BUILTIN_FUNCTION,
        TYPE_FORCE_RETURN,
        TYPE_FORCE_BREAK,
        TYPE_FORCE_CONTINUE,
        ClosureValue,
        BuiltinFunctionValue,
        Value,
        RegexValue,
    }
} 
