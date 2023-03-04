
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
    }
} 
