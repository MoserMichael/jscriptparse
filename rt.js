const path=require("node:path");
const fs=require("node:fs");
const cp=require("node:child_process");
const http = require('node:http');
const url = require('node:url');
const yaml=require("yaml");
const prs=require(path.join(__dirname,"prs.js"));

const httpAgent = new http.Agent({ keepAlive: true });

let doLogHook = function(msg) { process.stdout.write(msg); }

const showJavascriptStack = false;

let maxStackFrames = 20;

// callback for running evaluator
let evalCallback = null;

function setEvalCallback(cb) {
    evalCallback = cb;
}

// the file that is being parsed right now. Can't pass that around.
// Should be thread local, or something like this.
let currentSourceInfo = null;

function setLogHook(hook) {
    doLogHook = hook;
}

function setCurrentSourceInfo(info) {
    let prevValue = currentSourceInfo;
    currentSourceInfo = info;
    return prevValue;
}

// trace mode - trace evaluation of the program.
let traceMode = false;
let tracePrompt = "+ ";

function setTraceMode(on) {
    traceMode = on;
}

// if set - throw exception if executing a process fails / returns error status
let errorOnExecFail = false;

function setErrorOnExecFail(on) {
    errorOnExecFail = on;
}

function setMaxStackFrames(nframes) {
    maxStackFrames = nframes
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


mapTypeToName = {
    0 : "Boolean",
    1  : "Number",
    2  : "String",
    3 : "Regular expression",
    4 : "List",
    5 : "Map",
    6 : "None",
    7 : "Closure",
    8 : "BuiltinFunction",
    9 : "Return",
    10 : "Break",
    11 : "Continue",
}


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

let VALUE_NONE=new Value(TYPE_NONE,null);

function typeNameVal(val) {
    if (val.type == null) {
        console.trace("Not a runtime value!" + JSON.stringify(val));
        return "not a runtime value!";
    }
    return mapTypeToName[val.type];
}

function typeNameRaw(val) {
    return mapTypeToName[val];
}

let NumberNames={ 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth"};

function getParamName(index) {
    let paramName = "";
    if (index != null) {
        if (NumberNames[index+1] != undefined) {
            paramName = "in " + NumberNames[index+1] + " parameter ";
        } else {
            paramName = "in parameter " + (index + 1);
        }
    }
    return paramName;
}

function value2Bool(arg, index) {
    let val;

    if (index != null) {
        val = arg[index];
    } else {
        val = arg
    }

    if (val.type == TYPE_BOOL) {
        return val.val;
    } else if (val.type == TYPE_NUM) {
        return val.val != 0;
    } else if (val.type == TYPE_STR) {
        return val.val;
    }
    let paramName = "";
    if (index != null) {
        paramName = getParamName(index);
    }
    throw new RuntimeException("can't convert " + typeNameVal(val) + " to boolean. " + paramName);
}

function checkType(arg, index, expectedType) {
    let val;

    if (index != null) {
        val = arg[index];
    } else {
        val = arg
    }

    if (val.type != expectedType) {
        let paramName = "";
        if (index != null) {
            paramName = getParamName(index);
        }
        throw new RuntimeException("expected " + typeNameRaw(expectedType)  + " - " + paramName + " - Instead got value of " + typeNameVal(val) );
    }
}

function checkTypeList(arg, index, expectedTypeList) {
    let val;

    if (index != null) {
        val = arg[index];
    } else {
        val = arg
    }
    for(let i=0; i<expectedTypeList.length; ++i) {
        let expectedType = expectedTypeList[i];

        if (val.type == expectedType) {
            return;
        }
    }
    let paramName = "";
    if (index != null) {
        paramName = getParamName(index);
    }
    let typeNames = expectedTypeList.map(typeNameRaw).join(", ");
    throw new RuntimeException("expected " + typeNames  + " - " + paramName + " - Instead got value of " + typeNameVal(val) );
}


function value2Num(arg, index) {
    let val;

    if (index != null) {
        val = arg[index];
    } else {
        val = arg
    }

    if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        if (isNaN(val.val)) {
            let paramName = "";
            if (index != null) {
                paramName = getParamName(index);
            }
            throw new RuntimeException("The argument value is not a number - " + paramName);
        }
        return val.val;
    } else if (val.type == TYPE_STR) {
        ret = parseFloat(val.val);
        if (isNaN(ret)) {
            let paramName = "";
            if (index != null) {
                paramName = getParamName(index);
            }
            throw new RuntimeException("The argument value " + val.val + " is not a number - " + paramName); 
        }
        return ret;
    }
    let paramName = "";
    if (index != null) {
        paramName = getParamName(index);
    }
    throw new RuntimeException("can't convert " + typeNameVal(val) + " to number - " + paramName);
}

function requireInt(arg, index) {
    let val = arg[index];
    if (val.type == TYPE_NUM) {
        let intval = parseInt(val.val);
        if (intval == val.val) {
            return intval;
        }
    }
    let paramName =  getParamName(index);
    throw new RuntimeException("Integer value required " + paramName + " - instead got " + typeNameVal(val));
}

function value2Str(arg, index) {
    let val;

    if (index !== undefined) {
        val = arg[index];
    } else {
        val = arg
    }
    if (val.type == TYPE_STR || val.type == TYPE_REGEX) {
        return val.val;
    } else if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val.toString();
    } else if (val.type == TYPE_NONE) {
        return "none";
    }
    let paramName = "";
    if (paramName != null) {
        paramName = getParamName(index);
    }
    throw new RuntimeException("can't convert " + typeNameVal(val) + " to string - " + paramName);
}

function value2Str2(arg) {
    return value2Str(arg, undefined);
}

function value2StrDisp(val) {
    if (val.type == TYPE_STR) {
        return val.val;
    } else if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val.toString();
    } else if (val.type == TYPE_NONE) {
        return "none";
    }
    return rtValueToJson(val);
}
function jsValueToRtVal(value) {
    if (value == null) {
        return VALUE_NONE;
    }

    if (Array.isArray(value)) {
        let rt = [];
        for(let i=0; i<value.length; ++i) {
            rt.push( jsValueToRtVal(value[i]) );
        }
        return new Value(TYPE_LIST, rt);
    }

    if (value.constructor == Object) { // check if dictionary.
        let rt = {};
        let keys = Object.keys(value);
        for(let i=0; i<keys.length; ++i) {
            rt[ new String(keys[i]) ] = jsValueToRtVal( value[keys[i]] );
        }
        return new Value(TYPE_MAP, rt);
    }

    if (typeof(value) == "boolean") {
        return new Value(TYPE_BOOL, value);
    }

    if (typeof(value) == 'number') {
        return new Value(TYPE_NUM, value)
    }

    if (typeof(value) == 'string') {
        return new Value(TYPE_STR, value)
    }

    if (typeof(value) == null) {
        return VALUE_NONE;
    }

    throw new RuntimeException("Unknown type " + typeof(value));
}

function rtValueToJsVal(value) {
    if (value.type == TYPE_LIST) {
        let ret = [];
        for(let i=0; i<value.val.length; ++i) {
            ret.push( rtValueToJsVal( value.val[i] ) );
        }
        return ret;
    }

    if (value.type == TYPE_MAP) {
        let ret = {};
        let keys = Object.keys(value.val);
        for (let i = 0; i < keys.length; ++i) {
            ret[keys[i]] = rtValueToJsVal(value.val[keys[i]]);
        }
        return ret;
    }

    if (value.type == TYPE_STR || value.type == TYPE_BOOL || value.type == TYPE_NUM || value.type == TYPE_NONE || value.type == TYPE_REGEX) {
        return value.val;
    }

    if (value.type == TYPE_CLOSURE || value.type == TYPE_BUILTIN_FUNCTION) {
        return "<function>";
    }

    throw new RuntimeException("Can't convert value " + typeNameVal(value) );
}

function rtValueToJson(val) {
    return JSON.stringify(rtValueToJsVal(val));
}

const RTE_UNWIND=2

class RuntimeException  extends Error {
    constructor(message, frameInfo = null, flags = 0) {
        super(typeof(message) == 'string' ? message : "");
        this.rtValue = message instanceof Object ? message : null;
        this.originalCause = null;
        this.stackTrace = [];
        if (frameInfo != null) {
            this.addToStack(frameInfo);
        }
        this.flags = flags;
        this.firstChance = true;
        this.hasMoreStackFrames = false;
    }

    addToStack(frameInfo) {
        if (this.stackTrace.length < maxStackFrames ) {
            this.stackTrace.push(frameInfo);
        } else {
            this.hasMoreStackFrames = true;
        }
    }

    isUnwind() {
        return this.flags & RTE_UNWIND;
    }

    // called exception is thrown inside of catch block.
    setOriginalCause(originalCause) {
        this.originalCause = originalCause;
    }

    showStackTrace(reportError = true) {
        let ret = "Error: " + this.getMessage() + "\n";

        for(let i=0; i<this.stackTrace.length; ++i) {
            let stackTraceEntry = this.stackTrace[i];
            let offset = stackTraceEntry[0];
            let sourceInfo = stackTraceEntry[1];
            let fileInfo = sourceInfo[0];
            let fname = "";
            if (fileInfo != null) {
                fname = fileInfo + ":";
            }

            let entry = prs.getLineAt(sourceInfo[1], offset);
            let nFrame = this.stackTrace.length - i;
            //let prefix = "#(" + fname + nFrame + ") ";
            let prefix = "#(" + fname + prs.getLineNo(sourceInfo[1], offset) + ") ";
            ret += prefix + entry[0] + "\n";
            ret += (Array(prefix.length-1).join(' ')) + "|" +  Array(entry[1]+1).join(".") + "^\n";
        }
        if (this.hasMoreStackFrames) {
            ret += "\n.... stack frames ommitted ...\n";
        }
        if (this.originalCause != null) {
            ret += "\nCaused by:\n" + this.originalCause.showStackTrace();
        }
        if (reportError) {
            doLogHook(ret);
        }
        return ret;
    }

    toRTValue() {
        let map = {
            "message": new Value(TYPE_STR, this.getMessage()),
            "stack": new Value(TYPE_STR, this.showStackTrace(false))
        };

        if (this.stackTrace != null) {
            let stackInfo = this.stackTrace[0];
            map['offset'] = new Value(TYPE_NUM, stackInfo[0]);
            if (stackInfo[1] != null) {
                map['fileName'] = new Value(TYPE_STR, stackInfo[1]);
            }
        }
        return new Value(TYPE_MAP, map)
    }

    getMessage() {

        if (this.message !="") {
            return this.message;
        }
        /*
        if (this.rtValue instanceof RuntimeException) {

            let rtValue = this.rtValue;
            let prevStack = rtValue.stack;
            delete rtValue.stack;
            let msg = rtValueToJson(rtValue);
            rtValue.stack = prevStack;
            console.log(">getMessage: " + msg)
            return msg;
        }
         */
        // should be an error
        return rtValueToJson(this.rtValue);
    }
}

function clonePrimitiveVal(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_STR || val.type == TYPE_NUM) {
        return new Value(val.type, val.val);
    }
    return val;
}

function cloneAll(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_STR || val.type == TYPE_NUM) {
        return new Value(val.type, val.val);
    }
    return new Value(val.type, JSON.parse( JSON.stringify(val.val) ) );
}

function* genEvalClosure(funcVal, args, frame) {
    if (funcVal.type == TYPE_CLOSURE) {
        let funcFrame = null;

        if (funcVal.frame != null) { // closure with captured variables
            [ funcFrame, _ ] = _prepareClosureFrame(funcVal, funcVal.frame, args);
        } else {
            [ funcFrame, _ ] = _prepareClosureFrame(funcVal, frame, args);
        }

        try {
            // frame is ready, evaluate the statement list
            yield *funcVal.functionDef.body.genEval(funcFrame);
        } catch(er) {
            if (er instanceof RuntimeException && !er.isUnwind()) {
                er.addToStack([funcVal.functionDef.startOffset, funcVal.functionDef.currentSourceInfo]);
            }
            throw er;
        }
        return;
    }

    // builtin functions
    _prepareBuiltinFuncArgs(funcVal, frame, args);

    // function call
    if (funcVal.numParams != -1 && funcVal.numParams != args.length) {
        throw new RuntimeException("generator takes " + funcVal.numParams + " parameters, whereas " + args.length +
            " parameters are passed in call");
    }
    yield* funcVal.funcImpl(args);
}

function evalClosure(name, funcVal, args, frame) {
    if (funcVal.type == TYPE_CLOSURE) {

        let funcFrame = null;
        let traceParam = "";

        if (funcVal.frame != null) { // closure with captured variables
            [ funcFrame, traceParam ] = _prepareClosureFrame(funcVal, funcVal.frame, args);
        } else {

            [ funcFrame, traceParam ] = _prepareClosureFrame(funcVal, frame.parentFrame != null ? frame.parentFrame : frame, args);
        }

        if (traceParam) {
            let traceName = name;

            if (name == "") {
                traceName ="<unnamed-function>";
            }
            console.log(traceName + "(" + traceParam + ")");
        }

        try {
            // frame is ready, evaluate the statement list
            let rVal = funcVal.functionDef.body.eval(funcFrame);

            if (rVal.type == TYPE_FORCE_RETURN) {
                return rVal.val;
            }
            return rVal;
        } catch(er) {
            if (er instanceof RuntimeException && !er.isUnwind()) {
                er.addToStack([funcVal.functionDef.startOffset, funcVal.functionDef.currentSourceInfo]);
            }
            throw er;
        }
    }

    // builtin functions
    let traceParams = _prepareBuiltinFuncArgs(funcVal, frame, args);

    if (traceMode) {
        process.stderr.write(tracePrompt + name + "(" + traceParams + ") {\n");
    }

    // function call
    if (funcVal.numParams != -1 && funcVal.numParams != args.length) {
        throw new RuntimeException("function takes " + funcVal.numParams + " parameters, whereas " + args.length +
            "  parameters are passed in call");
    }
    let retVal = funcVal.funcImpl(args, frame);

    if (retVal == undefined) {
        retVal = VALUE_NONE;
    }

    if (traceMode && retVal.type != TYPE_NONE) {
        process.stderr.write(tracePrompt + rtValueToJson(retVal) + "\n}");
    }

    return retVal;
}

function _prepareBuiltinFuncArgs(funcVal, frame, args) {

    let traceParams = "";

    if (traceMode) {
        for(let i=0;i<args.length;++i) {
            if (traceParams != "") {
                traceParams += ", ";
            }
            traceParams += rtValueToJson(args[i]);
        }
    }

    if (funcVal.defaultParamValues != null) {
        // try to add omitted params with default values;
        if (args.length < funcVal.defaultParamValues.length) {
            for (let i = args.length; i < funcVal.defaultParamValues.length; ++i) {
                let val = funcVal.defaultParamValues[i];
                args.push(val);

                if (traceMode && val != null) {
                    if (traceParams != "") {
                        traceParams += ", ";
                    }
                    traceParams += rtValueToJson(val);
                }
            }
        }
    }
    return traceParams;
}


function _prepareClosureFrame(funcVal, frame, args) {
    let functionDef = funcVal.functionDef;
    let funcFrame = new Frame(frame);
    let traceParam = "";

    if (args.length > functionDef.params.length) {
        throw new RuntimeException("function takes " + functionDef.params.length + " params, but " + args.length + " were given", [funcVal.startOffset, funcVal.currentSourceInfo]);
    }

    // define all provided parameters in the new function frmae
    let i = 0;
    for (; i < args.length; ++i) {
        let argValue = args[i];
        let paramDef = functionDef.params[i]; // name of parameter
        funcFrame.defineVar(paramDef[0][0], argValue);

        if (traceMode) {
            if (traceParam != "") {
                traceParam += ", ";
            }
            traceParam += paramDef[0][0] + "=" + rtValueToJson(argValue);
        }
     }

    // provide values for arguments with default values
    for (; i < functionDef.params.length; ++i) {
        let paramDef = functionDef.params[i]; // name of parameter

        let defaultParamValue = funcVal.defaultParamValues[i];
        if (defaultParamValue == null) {
            throw new RuntimeException(" no value for parameter " + paramDef[0][0], [funcVal.functionDef.startOffset, funcVal.functionDef.currentSourceInfo]);
        }
        funcFrame.defineVar(paramDef[0][0], defaultParamValue);

        if (traceMode) {
            if (traceParam != "") {
                traceParam += ", ";
            }
            traceParam += paramDef[0][0] + "=" + rtValueToJson(defaultParamValue);
        }
    }
    return [ funcFrame, traceParam];

}

function _getEnv(frame) {
    let val = frame.lookup("ENV");

    if (val == null || val.type != TYPE_MAP) {
        return {};
    }

    let envDct = {}
    for (let [key, value] of Object.entries(val.val)) {
        envDct[key] = value2Str(value);
    }
    return envDct;
}

function _system(cmd, frame) {
    let status = 0;
    let out = "";

    let env = _getEnv(frame);
    try {
        out = cp.execSync(cmd,{env: env}).toString();
    } catch(e) {
        console.log("failed to run: " + cmd + " error: " + e.message);
        status = 1;//e.status;
        out = e.message;
        throw e;
    }
    if (status !=0 && errorOnExecFail) {
        throw new RuntimeException("failed to run `" + cmd + "` : " + out);
    }
    let val = [ new Value(TYPE_STR, out), new Value(TYPE_NUM, status) ];
    return new Value(TYPE_LIST, val);
}

function isBascType(ty) {
    return ty==TYPE_BOOL || ty == TYPE_NUM || ty == TYPE_STR || ty == TYPE_REGEX || ty ==  TYPE_NONE;
}

function printImpl(arg) {
    let ret = "";
    for(let i=0; i<arg.length; ++i) {
        if (i != 0) {
            ret += " ";
        }    
        let val=arg[i];
        if (isBascType(val.type))
            ret += value2Str2(val);
        else
            ret += rtValueToJson(val);
    }
    return ret;
}

function dimArray(currentDim, dims) {
    let n = dims[currentDim];
    let val = [];
    if (currentDim != dims.length-1) {
        for (let i = 0; i < n; ++i) {
            val[i] = dimArray( currentDim + 1, dims);
        }
    } else {
        for (let i = 0; i < n; ++i) {
            val[i] = new Value(TYPE_NUM, 0);
        }
    }
    return new Value(TYPE_LIST, val);
}

function dimArrayInit(initValue, currentDim, dims) {
    let n = dims[currentDim];
    let val = [];
    if (currentDim != dims.length-1) {
        for (let i = 0; i < n; ++i) {
            val[i] = dimArrayInit(  initValue, currentDim + 1, dims);
        }
    } else {
        for (let i = 0; i < n; ++i) {
            val[i] = cloneAll(initValue);
        }
    }
    return new Value(TYPE_LIST, val);
}

function * genValues(val) {
    if (val.type == TYPE_LIST) {
        for(let i=0; i <val.val.length; ++i) {
            yield val.val[i];
        }
    }
    if (val.type == TYPE_MAP) {
        for (let keyVal of Object.entries(val.val)) {
            let yval = [ new Value(TYPE_STR, keyVal[0]), keyVal[1] ];
            yield new Value(TYPE_LIST, yval);
        }
    }
}

// pythons default float type does not allow Not-a-number - keep it with that...a
// (that makes for less to explain)
function checkResNan(res) {

    if (isNaN(res)) {
        throw new RuntimeException("results in 'not a number' - that's not allowed here");
    }
    return res;
}


let fooId =1;

function makeHttpCallbackInvocationParams(httpReq, httpRes, requestData) {

    let req_ = new Value(TYPE_MAP, {
        'url_' : new Value(TYPE_STR, httpReq.url),

        'url' : new BuiltinFunctionValue(``, 0, function() {
            return new Value(TYPE_STR,  httpReq.url );
        }),
        'method' : new BuiltinFunctionValue(``, 0, function() {
            return new Value(TYPE_STR, httpReq.method );
        }),
        'query' : new BuiltinFunctionValue(``, 0, function() {
            return jsValueToRtVal(httpReq.query);
        }),
        'headers' : new BuiltinFunctionValue(``, 0, function() {
            return new jsValueToRtVal(httpReq.headers);
        }),
        'header' : new BuiltinFunctionValue(``, 1, function(arg) {
            let name = value2Str(arg, 0);
            let val = httpReq.headers[name.toLowerCase()];
            return new jsValueToRtVal(val);
        }),
        'requestData' : new BuiltinFunctionValue(``, 0, function(arg) {
            return new Value(TYPE_STR, requestData );
        }),
    });

    let res_ = new Value(TYPE_MAP, {

        'setHeader': new BuiltinFunctionValue(``, 2, function(arg) {
            httpRes.setHeader(value2Str(arg, 0), rtValueToJsVal(arg[1].val));
            return VALUE_NONE;
        }),

        'send': new BuiltinFunctionValue(``,3, function(arg) {

            let code = arg[0];
            let textResponse = value2Str(arg, 1);
            let contentType = "text/plain"

            if (code.type != TYPE_NUM) {
                throw new RuntimeException("first argument: expected number")
            }

            if (arg[2] != null) {
                contentType = value2Str(arg, 2);
            }

            let respHeader = {};

            if (httpRes.getHeader("Content-Length") == null) {
                respHeader['Content-length'] = textResponse.length.toString();
            }
            if (httpRes.getHeader("Content-Type") == null) {
                respHeader['Content-Type'] = contentType;
            }

            //console.log("status: " + code.val + " resp-hdr: " + JSON.stringify(respHeader));

            httpRes.writeHead(parseInt(code.val), respHeader);
            httpRes.write(textResponse);
            httpRes.end();
            //httpRes.end(textResponse);

            //console.log("eof send: " + textResponse);
            return VALUE_NONE;
        }, [null, null, null])
    });


    return [ req_, res_ ];
}

function makeHttpServerListener(callback, frame) {
    return function (req, res) {

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const data = Buffer.concat(chunks);

            // got the request data as well!

            // this one is evaluated from another task. runtime exceptions need to be handled here
            try {
                let vargs =  makeHttpCallbackInvocationParams(req,res, data);
                evalClosure("", callback, vargs, frame);
            } catch(er) {
                if (er instanceof RuntimeException) {
                    er.showStackTrace(true);
                } else {
                    throw er;
                }
            }

        })


    };
}

// maps between process id and node childprocess object.
let spawnedProcesses = {};

// the runtime library is defined here
RTLIB={

    // function on scalars or strings
    "find": new BuiltinFunctionValue(` 
# search for a string (second argument) in a big string (first argument)
# return indexs of match (zero based index, first match is position zero, if no match -1)

> find("big cat", "big")
0
> find("big cat", "cat")
4
> find("big cat", "bear")
-1

#using regular expressions

> a='123412342 piglet $%#@#$#@%'
"123412342 piglet $%#@#$#@%"

> find(a,/[a-z]+/)
10

# the third parameter is an optional offset to start search from. (zero based index)

> find("a1 !! a1", "a1", 2)
6

> find("a1 !! a1", /[a-z0-9]+/, 2)
6

`, 3, function(arg) {
        let hay = value2Str(arg, 0);
        let index = 0;

        if (arg[2] != null) {
            index = parseInt(value2Num(arg, 2));
        }

        if (arg[1].type == TYPE_REGEX) {
            if (index != 0) {
                hay = hay.substring(index);
            }
            let matches = hay.search(arg[1].regex);
            if (matches != -1) {
                matches += index;
            }
            return new Value(TYPE_NUM, matches);
        }

        let needle = value2Str(arg, 1);
        let res = hay.indexOf(needle, index)
        return new Value(TYPE_NUM, res);
    }, [null, null, null]),


    "match": new BuiltinFunctionValue(`
# search for a match of regular expression argument (second) argument) in big text (first argument)
# returns a list - first element is zero based index of match, second is the matching string

> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> match(text,/[0-9]+/)
[2,"1232"]    

`, 3, function(arg) {
        let hay = value2Str(arg, 0);

        checkType(arg, 1, TYPE_REGEX)

        let ret = hay.match(arg[1].regex);

        if (ret == null) {
            return [ -1, "" ];
        }
        return new Value(TYPE_LIST, [ new Value(TYPE_NUM, ret['index']), new Value(TYPE_STR, ret[0]) ]);
    }, [null, null, null]),

    "matchAll": new BuiltinFunctionValue(`
> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> matchAll(text,/[0-9]+/)
[[2,"1232"],[17,"34234"],[37,"3423"]]

`, 3, function(arg) {
        let hay = value2Str(arg, 0);
        let ret = []

        checkType(arg, 1, TYPE_REGEX)

        let lenConsumed = 0;

        while(true) {
            let mval = hay.match(arg[1].regex);
            if (mval == null) {
                break;
            }
            let index = mval['index'];

            let r = [ new Value(TYPE_NUM, lenConsumed + index), new Value(TYPE_STR, mval[0]) ];
            ret.push( new Value(TYPE_LIST, r ) );

            let toAdd = mval[0].length;
            if (toAdd == 0) {
                toAdd = 1;
            }
            hay = hay.substring( index + toAdd );
            lenConsumed += index + mval[0].length;

        }
        return new Value(TYPE_LIST, ret );
    }, [null, null, null]),


    "mid": new BuiltinFunctionValue(`
# returns a substring in the text, first argument is the text, 
# second argument is the start offset, third argument is ending offset (optional)

> mid("I am me", 2, 4)
"am"
> mid("I am me", 2)
"am me"
> mid("I am me", 2, -1)
"am me"
`, 3, function(arg) {
        let sval = value2Str(arg, 0);
        let from = parseInt(value2Num(arg[1]), 10);
        let to = null;

        if (arg[2] != null) {
            if (arg[2].type == TYPE_NUM) {
                to = arg[2].val;
            } else {
                to = parseInt(value2Num(arg[2]), 10);
            }
        }

        if (to == -1) {
            sval = sval.substring(from)
        } else {
            sval = sval.substring(from, to);
        }

        return new Value(TYPE_STR, sval);
    }, [null, null, new Value(TYPE_NUM, -1) ]),
    "lc": new BuiltinFunctionValue(`# convert to lower case string
> lc("BIG little")
"big little"`, 1, function(arg) {
        let val = value2Str(arg, 0);
        return new Value(TYPE_STR, val.toLowerCase());
    }),
    "uc": new BuiltinFunctionValue(`# convert to upper case string
> uc("BIG little")
"BIG LITTLE"`, 1, function(arg) {
        let val = value2Str(arg, 0);
        return new Value(TYPE_STR, val.toUpperCase());
    }),
    "trim": new BuiltinFunctionValue(`# remove leading and trailing whitespace characters

> a= ' honey  '
" honey  "
> trim(a)
"honey"
> a= '\\t\\n a lot of honey honey \\n '
"\\t\\n a lot of honey honey \\n "
> trim(a)
"a lot of honey honey"`, 1, function(arg) {
        let val = value2Str(arg, 0);
        return new Value(TYPE_STR, val.trim());
    }),
    "reverse": new BuiltinFunctionValue(`# return the reverse of the argument (either string or list argument)

> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"`, 1, function(arg) {
        if (arg[0].type == TYPE_LIST) {
            return new Value(TYPE_LIST, arg[0].val.reverse());
        }
        let val = value2Str(arg, 0);
        return new Value(TYPE_STR, val.split("").reverse().join(""));
    }),
    "split": new BuiltinFunctionValue(`
# split the first argument string into tokens, the second argument specifies how to split it.

> split("first line\\nsecond line")
["first line","second line"]
> split("a,b,c", ",")
["a","b","c"]

> split("a:b:c", ":")
["a","b","c"]

> split("a:b:c", "")
["a",":","b",":","c"]

# Regular expressions

> a="Roo : Kanga :: Piglet ::: Pooh"
"Roo : Kanga :: Piglet ::: Pooh"

> split(a, /:+/)
["Roo "," Kanga "," Piglet "," Pooh"]

`, 2,function *(arg, frame) {
        let hay = value2Str(arg, 0);
        let delim = "\n";

        if (arg[1] != null) {
            if (arg[1].type == TYPE_REGEX) {
                delim = arg[1].regex;
            } else {
                delim = value2Str(arg, 1);
            }
        }
        for(let n of hay.split(delim)) {
            yield new Value(TYPE_STR, n);
        }
    }, [null, null], true),
    "str": new BuiltinFunctionValue(`> str(123)
"123"
> str("abc")
"abc"`, 1, function(arg) {
        let val = value2Str(arg, 0);
        return new Value(TYPE_STR, val);
    }),
    "repeat" : new BuiltinFunctionValue(`> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"`, 2, function(arg) {
        let val = value2Str(arg, 0);
        let rep = value2Num(arg, 1);
        return new Value(TYPE_STR, val.repeat(rep));
    }),

    "replace": new BuiltinFunctionValue(`
# replace replace occurances of second argument string with third argument string in text.
# first arugment - the text
# second argument - string to search for
# third argument - string to replace the match
# fourth argument (optional) - number of matches to substitute (1 is default) 

text="a b a c a d"
> "a b a c a d"
        
> replace(text,'a ', 'x ', -1)
"x b x c x d"        

> replace(text,'a ', 'x ', 1)
"x b a c a d"

> replace(text,'a ', 'x ')
"x b a c a d"

> replace(text,'a ', 'x ', 2)
"x b x c a d"
`, 4, function(arg) {
        let hay = value2Str(arg, 0);

        let needle = value2Str(arg, 1);
        let newNeedle = value2Str(arg, 2);
        let numTimes = 1;


        if (arg[3] != null) {
            numTimes = parseInt(value2Num(arg, 3));
        }


        let retVal = "";
        for(let start=0; start < hay.length; numTimes -= 1) {
            let findPos = hay.indexOf(needle, start);
            if (findPos == -1 || numTimes == 0) {
               retVal += hay.substring(start);
               break;
            }
            retVal += hay.substring(start, findPos) + newNeedle;
            start = findPos + needle.length;
        }
        return new Value(TYPE_STR, retVal);
    }, [null, null, null, null]),


    "replacere": new BuiltinFunctionValue(`
# replace the regular expression (second argument) with replacement expression (third argument) 
# in source text (first argument)
    
> text="Pooh,Bear ## Roo,Kanga ## Christopher,Robin "
"Pooh,Bear ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1")
"Bear,Pooh ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1", 1)
"Bear,Pooh ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1", -1)
"Bear,Pooh ## Kanga,Roo ## Robin,Christopher "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1", 2)
"Bear,Pooh ## Kanga,Roo ## Christopher,Robin "
    
`, 4, function(arg) {
        let hay = value2Str(arg, 0);

        checkType(arg, 1, TYPE_REGEX)

        let needle = arg[1].regex;
        let newNeedle = value2Str(arg, 2);
        let numTimes = 1;

        if (arg[3] != null) {
            numTimes = parseInt(value2Num(arg, 3));
        }

        let retVal = "";
        for(;;numTimes -= 1) {

            let ret = hay.match(needle)
            if (ret == null || numTimes == 0) {
                retVal += hay;
                break;
            }

            retVal += hay.substring(0, ret['index']);
            retVal += ret[0].replace(needle, newNeedle )

            // prepare next iteration
            let posAfterMatch = ret['index'] + ret[0].length;
            hay = hay.substring(posAfterMatch);
        }
        return new Value(TYPE_STR, retVal);
    }, [null, null, null, null]),

// Numeric functions
    "int": new BuiltinFunctionValue(`# convert argument string or number to integer value

> int("123")
123
> int("123.5")
123
> int(123.5)
123
> int(123)
123

# hexadecimal number conversion

> int("0xff")
255

> int("ff", 16)
255

# octal number

> int("444", 8)
292

`, 2, function(arg) {
        checkTypeList(arg, 0, [TYPE_STR, TYPE_REGEX, TYPE_NUM]);

        let sval = value2Str(arg, 0);
        let radix = 10;

        if (arg[1] != null) {
            radix = parseInt(value2Str(arg, 1));
        }

        if (sval.startsWith("0x")) {
            radix = 16;
        }

        let res = parseInt(sval, radix);

        if (res == null) {
            throw new RuntimeException("Can't convert " + arg[0].val + " to integer with base " + parseInt(arg[1].val));
        }
        return new Value(TYPE_NUM, res);
    }, [null, null]),

    "num": new BuiltinFunctionValue(`
#  convert argument string to number, if number - returns the same number value 

`, 1, function(arg) {
        checkTypeList(arg, 0, [TYPE_STR, TYPE_NUM]);

        let sval = value2Str(arg, 0);
        let res = parseFloat(sval);

        if (res == null) {
            throw new RuntimeException("Can't convert " + sval + " to floating point number.");
        }
        return new Value(TYPE_NUM, res);
    }),

    "bit_and":  new BuiltinFunctionValue(`
# bitwise and, both argument must be numbers with integer values (not floating point values)

> bit_and(4,5)
4

> bit_and(1,3)
1    
`, 2, function(arg) {
       let first = requireInt(arg,0);
       let second = requireInt(arg,1);
       return new Value(TYPE_NUM, first & second);
    }),

    "bit_or":  new BuiltinFunctionValue(`
# bitwise or, both argument must be numbers with integer values (not floating point values)

> bit_or(1,2)
3        
`, 2, function(arg) {
        let first = requireInt(arg,0);
        let second = requireInt(arg,1);
        return new Value(TYPE_NUM, first | second);
    }),

    "bit_xor":  new BuiltinFunctionValue(`
# bitwise xor, both argument must be numbers with integer values (not floating point values)

> bit_xor(1,7)
6            
`, 2, function(arg) {
        let first = requireInt(arg,0);
        let second = requireInt(arg,1);
        return new Value(TYPE_NUM, first ^ second);
    }),

    "bit_shiftl":  new BuiltinFunctionValue(`
# bitwise shift left, both argument must be numbers with integer values (not floating point values)

> bit_shiftl(1,3)
8                
`, 2, function(arg) {
        let first = requireInt(arg,0);
        let second = requireInt(arg,1);
        return new Value(TYPE_NUM, checkResNan(first << second));
    }),

    "bit_shiftr":  new BuiltinFunctionValue(`
# bitwise shift right, both argument must be numbers with integer values (not floating point values)

> bit_shiftr(8,3)
1                    
`, 2, function(arg) {
        let first = requireInt(arg,0);
        let second = requireInt(arg,1);
        return new Value(TYPE_NUM, checkResNan(first >> second));
    }),

    "bit_neg":  new BuiltinFunctionValue(`
# bitwise negation, the argument must be numbers with integer value (not floating point value)                        
`, 1, function(arg) {
        let first = requireInt(arg,0);
        return new Value(TYPE_NUM, ~first)
    }),

    "max" : new BuiltinFunctionValue(`
# return the bigger of the two two argument values (argument are interpreted as a numbers)

> max(3,4)
4
> max(4,3)
4`, 2, function(arg) {
        let num = value2Num(arg,0);
        let num2 = value2Num(arg, 1);
        let res = num;
        if (num2 > num) {
            res = num2;
        }
        return new Value(TYPE_NUM, res);
    }),
    "min" : new BuiltinFunctionValue(`
# return the smaller of the two two argument values (argument are interpreted as a numbers)

> min(4,3)
3
> min(3,4)
3`, 2, function(arg) {
        let num = value2Num(arg, 0);
        let num2 = value2Num(arg, 1);
        let res = num;
        if (num2 < num) {
            res = num2;
        }
        return new Value(TYPE_NUM, res);
    }),
    "abs" : new BuiltinFunctionValue(`
# return the absolute of the argument value  (if it's negative then turn it into a positive number)

> abs(-3)
3
> abs(3)
3`, 1, function(arg) {
        let num = value2Num(arg, 0);
        if (num < 0) {
            num = -num;
        }
        return new Value(TYPE_NUM, num);
    }),
    "sqrt" : new BuiltinFunctionValue(`
# return the square root of the argument 
# that's the number that gives the argument number, if you multiply it by itself.

> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095`, 1, function(arg) {
        let num = value2Num(arg, 0);
        return new Value(TYPE_NUM, checkResNan(Math.sqrt(num)));
    }),
    "sin" : new BuiltinFunctionValue(`# returns the sine of a number in radians

> sin(mathconst['pi']/2)
1`, 1, function(arg) {
        let num = value2Num(arg, 0);
        return new Value(TYPE_NUM, Math.sin(num));
    }),
    "cos" : new BuiltinFunctionValue(`# returns the cosine of a number in radians

> cos(mathconst['pi'])
-1`, 1, function(arg) {
        let num = value2Num(arg, 0);
        return new Value(TYPE_NUM, checkResNan(Math.cos(num)));
    }),
    "tan" : new BuiltinFunctionValue(`# returns the tangent of a number in radians`, 1, function(arg) {
        let num = value2Num(arg, 0);
        return new Value(TYPE_NUM, checkResNan(Math.tan(num)));
    }),
    "atan" : new BuiltinFunctionValue(`# returns the inverse tangent (in radians) of a number`, 1, function(arg) {
        let num = value2Num(arg, 0);
        return new Value(TYPE_NUM, checkResNan(Math.atan(num)));
    }),
    "pow" : new BuiltinFunctionValue(`# returns the first arugment nubmer raised to the power of the second argument number

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16`, 2, function(arg) {
        let pow = value2Num(arg, 0);
        let exp = value2Num(arg, 1);
        return new Value(TYPE_NUM, checkResNan(Math.pow(pow,exp)));
    }),
    "random" : new BuiltinFunctionValue(`# returns pseudo random number with value between 0 and 1 (that means it is almost random)
> random()
0.8424952895811049
`, 0, function(arg) {
        return new Value(TYPE_NUM, Math.random());
    }),

    // Input and output functions
    "print" : new BuiltinFunctionValue(`
# prints argument values to console. 
# Can accept multiple values - each of them is converted to a string`, -1, function(arg) {
        let msg = printImpl(arg); //value2Str(arg, 0);
        doLogHook(msg)
    }),
    "println" : new BuiltinFunctionValue(`
# prints argument values to console, followed by newline.
# Can accept multiple values - each of them is converted to a string`, -1, function(arg) {
        let msg = printImpl(arg); //value2Str(arg, 0);
        doLogHook(msg + "\n")
    }),
    "readFile" : new BuiltinFunctionValue(`
# read text file and return it as a string, the file name is the first argument of this function

> fileText = readFile("fileName.txt")    
    `, 1, function(arg) {
        let fname = value2Str(arg, 0);
        try {
            let res = fs.readFileSync(fname, {encoding: 'utf8', flag: 'r'});
            return new Value(TYPE_STR,res);
        } catch(err) {
            throw new RuntimeException("Can't read file: " + fname + " error: " + err);
        };
    }),
    
    "writeFile" : new BuiltinFunctionValue(`
# write string parameter into text file. 
# The file name is the first argument, 
# the text value to be written into the file is the second argument

> writeFile("fileName.txt","fileContent")

# append file

> writeFile("fileName.txt","add this after end of file", "append")
   
    `, 3, function(arg) {
        let fname = value2Str(arg, 0);
        let data = value2Str(arg, 1);
        let append = false;
        if (arg[2] != null ) {
            let mode = value2Str(arg, 2);
            if (mode == "append") {
                append = true;
            } else if (mode == "write") {
                append = false;
            } else {
                throw new RuntimeException("third argument must be either 'append' or 'write'");
            }
        }
        try {
            if (append) {
                fs.appendFileSync(fname, data);
            } else {
                fs.writeFileSync(fname, data);
            }
        } catch(err) {
            throw new RuntimeException("Can't " + (append ? "append" : "write") + " file: " + fname + " error: " + err);
        };
        return VALUE_NONE;
    }, [ null, null, null]),

    "unlink" : new BuiltinFunctionValue(`
# delete a number of files, returns number of deleted files
unlink([ "file1.txt", "file2.txt", "file3.txt" ])

# delete a single file, returns number of deleted files
unlink("file1.txt")    
    `, 1, function(arg) {
        let numUnlinked = 0;

        if (arg[0].type == TYPE_LIST) {
            // delete multiple files
            for(let i=0; i< arg[0].value.length;++i) {
                fs.unlink( value2Str(arg[0].value[i]), function(arg) { numUnlinked -=1; } );
                numUnlinked += 1;
            }
        } else {
            fs.unlink( value2Str(arg, 0), function(arg) { numUnlinked -=1; } );
            numUnlinked += 1;
        }
        return new Value(TYPE_NUM, numUnlinked);
    }),

    "rename" : new BuiltinFunctionValue(`
# rename files, old file name is the first argument, the new file name is the second argument
    
rename("oldFileName","newFileName")    
`, 2, function(arg) {
        let oldFileName = value2Str(arg, 0);
        let newFileName = value2Str(arg, 1);
        try {
            fs.renameSync(oldFileName, newFileName);
        } catch(er){
            throw new RuntimeException("failed to rename " + oldFileName + " to " + newFileName + " error: " + er.message);
        }
        return VALUE_NONE;

    }),

    // function for arrays
    "dim" : new BuiltinFunctionValue(`
# defines n-dimensional array, all elements are set to zero. 
# Each argument defines the size of a dimension in the array.
    
> a=dim(4)
[0,0,0,0]

> a=dim(2,3)
[[0,0,0],[0,0,0]]

> a=dim(2,3,4)
[[[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]    
`, -1, function(arg) {
        let dims = [];
        for(let i =0; i<arg.length;++i) {
            dims[i] = parseInt(value2Num(arg,i));
            if (dims[i]<=1) {
                throw new RuntimeException("parameter " + (i+1) + " must be a positive number greater or equal to one");
            }
        }
        if (dims.length == 0) {
            throw new RuntimeException("at least one dimension must be defined");
        }
        return dimArray( 0, dims);
    }),

    "dimInit" : new BuiltinFunctionValue(`
# defines n-dimensional array, all elements are set to a deep copy of the first argument. 
# Each additional argument defines the size of a dimension in the array.

> a={"a":1}
{"a":1}

> dimInit(a,2,3)
[[{"a":1},{"a":1},{"a":1}],[{"a":1},{"a":1},{"a":1}]]
`, -1, function(arg) {
        if (arg.length < 2) {
            throw new RuntimeException("At least two parameters expected");
        }
        let initVal = arg[0];
        let dims = [];
        for (let i = 1; i < arg.length; ++i) {
            dims[i-1] = parseInt(value2Num(arg, i));
            if (dims[i-1] <= 1) {
                throw new RuntimeException("parameter " + i + " must be a positive number greater or equal to one");
            }
        }
        if (dims.length == 0) {
            throw new RuntimeException("at least one dimension must be defined");
        }
        return dimArrayInit(initVal, 0, dims);

    }),


    "clone" : new BuiltinFunctionValue(`
# create a deep copy of any value

> a=[1,2,3]
[1,2,3]

> b=clone(a)
[1,2,3]

> a[0]=1000
1000

> a
[1000,2,3]

> b
[1,2,3]

> a==b
false
`, 1, function(arg) {
        return cloneAll(arg[0]);
    }),


    "len" : new BuiltinFunctionValue(`# for a string argument - returns the number of characters in the string

> len("abc")
3

# for a list argument - returns the number of elements in the list

> len([1,2,3])
3`, 1, function(arg) {
        checkTypeList(arg, 0, [TYPE_STR, TYPE_LIST]);
        return new Value(TYPE_NUM, arg[0].val.length);
    }),
    "join": new BuiltinFunctionValue(`# given a list argument, joins the values of the list into a single string

> join(["a: ",1," b: ", true])
"a: 1 b: true"`, 2, function(arg) {
        checkType(arg, 0, TYPE_LIST);

        let delim ="";
        if (arg[1] != null) {
            delim = value2Str(arg, 1);
        }
        return new Value(TYPE_STR, arg[0].val.map(value2StrDisp).join(delim));
    }, [null, null]),
    "map": new BuiltinFunctionValue(`# the first argument is a list, the second argument is a function that is called once for each element of the input list. The return values of this function will each be appended to the returned list.

> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

# if called with a dictionary argument: 
# The second parameter function is called with each key-value pair of the dictionary argument. 
# The return values of this function will form the returned list 

a={ 'Ernie': 3, 'Bert': 4, 'Cookie-Monster' : 5, 'GraphCount': 100 }
map(a,def(k,v) { "key: {k} age: {v}" })
> ["key: Ernie age: 3","key: Bert age: 4","key: Cookie-Monster age: 5","key: GraphCount age: 100"]
`, 2, function(arg, frame) {

        checkTypeList(arg, 0, [TYPE_LIST, TYPE_MAP])
        checkTypeList(arg, 1, [TYPE_CLOSURE, TYPE_BUILTIN_FUNCTION])

        let ret = [];
        let funVal = arg[1];

        if (arg[0].type == TYPE_LIST) {
            let argList = arg[0];

            for(let i=0; i<argList.val.length;++i) {
                let arg = [ argList.val[i] ];
                let mapVal = evalClosure("", funVal, arg, frame);
                ret.push(mapVal);
            }
        }

        if (arg[0].type == TYPE_MAP) {
            let argMap = arg[0];

            for(let k in argMap.val) {
                let amap = [ new Value(TYPE_STR, new String(k)), argMap.val[k] ];
                let mapVal = evalClosure("", funVal, amap, frame);
                ret.push(mapVal);
            }

        }
        return new Value(TYPE_LIST, ret);
    }),
    "mapIndex": new BuiltinFunctionValue(`
# similar to map, the argument function is called with the list value and the index of that value within the argument list

> mapIndex([3,4,5,6],def(x,y) [2*x, y])
[[6,0],[8,1],[10,2],[12,3]]`, 2, function(arg, frame) {

        checkType(arg, 0, TYPE_LIST);
        checkTypeList(arg, 0, [TYPE_CLOSURE, TYPE_BUILTIN_FUNCTION]);

        let ret = [];
        let argList = arg[0];
        let funVal = arg[1];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [ argList.val[i], new Value(TYPE_NUM, i) ];
            let mapVal = evalClosure("", funVal, arg, frame);
            ret.push(mapVal)
        }
        return new Value(TYPE_LIST, ret);
    }),
    "reduce": new BuiltinFunctionValue(`
# form a single return values by applying the arugment value repatedly
# works from the first element towards the last element of the argument list. 
# See the following description:

> reduce([1,2,3], def (x,y) x+y, 0)
6

# same as:

> (((0+1)+2)+3)
6

> reduce([1,2,3], def (x,y) x+y, 2)
8

# same as:
 
> (((2+1)+2)+3)
8
`, 3, function(arg, frame) {
        checkType(arg, 0, TYPE_LIST);
        checkType(arg, 1, TYPE_CLOSURE);

        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [rVal, argList.val[i]];
            rVal = evalClosure("", funVal, arg, frame);
        }
        return rVal;
    }),

    "reduceFromEnd": new BuiltinFunctionValue(`
# same as reduce, but working from the end of the list backward.

> def div(a,b) a/b

> reduceFromEnd([4,8,32], div, 1024)
1

same as:

> (((1024/32) / 8) / 4)
1`, 3, function(arg, frame) {
        checkType(arg, 0, TYPE_LIST);
        checkType(arg, 1, TYPE_CLOSURE);

        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=argList.val.length-1; i>=0; i--) {
            let arg = [rVal, argList.val[i]];
            rVal = evalClosure("", funVal, arg, frame);
        }
        return rVal;
    }),

    "pop": new BuiltinFunctionValue(`
# takes an argument list, returns the last element of the list
# but also removes this last value from the argument list

 > a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]`, 1,function(arg, frame) {

        checkType(arg, 0, TYPE_LIST);

        if (arg[0].val.length == 0) {
            throw new RuntimeException("Can't pop from an empty list");
        }
        return arg[0].val.pop(arg[1]);
    }),
    "push": new BuiltinFunctionValue(`
# takes the second argument and appends it to the list, which is the first argument to this function

> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]`, 2, function(arg, frame) {
        checkType(arg, 0, TYPE_LIST)
        arg[0].val.push(arg[1]);
        return arg[0];
    }),
    "shift": new BuiltinFunctionValue(`# removes the first element from the list
> a=[1,2,3]
[1,2,3]

> shift(a)
1

> a
[2,3]    
`, 1,function(arg, frame) {
        checkType(arg, 0, TYPE_LIST)
        if (arg[0].val.length == 0) {
            throw new RuntimeException("Can't pop from an empty list");
        }
        return arg[0].val.shift(arg[1]);
    }),
    "unshift": new BuiltinFunctionValue(`
# The first argument is a list, the second argument will be prepended to the argument list
# The second argument will bet the first element of the list.
# also returns the modified list

> a=[2,3]
[2,3]

> unshift(a,1)
[1,2,3]

> a
[1,2,3]    
`, 2, function(arg, frame) {
        checkType(arg, 0, TYPE_LIST)
        arg[0].val.unshift(arg[1]);
        return arg[0];
    }),
    "joinl": new BuiltinFunctionValue(`# takes two lists and joins them into a single list, which is returned by this function

 > joinl([1,2],[3,4])
[1,2,3,4]`, 2,function(arg, frame) {
        checkType(arg, 0, TYPE_LIST)
        checkType(arg, 1, TYPE_LIST)

        let lst = arg[0].val.concat(arg[1].val);
        return new Value(TYPE_LIST, lst);
    }),
    "sort": new BuiltinFunctionValue(`# sorts the argument list in increasing order

> sort([3,1,4,2,5])
[1,2,3,4,5]

# the second argument of sort can specify a function that is to determine the sorting order : For this second arumgent function the following holds:
#  - a return value of -1 means that the first argument is smaller than the second argument. 
#  - a return value of 1 means that the first argument is bigger than the second argument. 
#  - a return value of zero means that both argument values are equal

> def cmp(x, y) {
...     if x[1] < y[1] return -1
...     if x[1] > y[1] return 1
...     return 0
... }

> r=sort([['a',100],['b',1],['c',1000]],cmp)
[["b",1],["a",100],["c",1000]]`, 2, function(arg, frame) {

        let funVal = null;

        if (arg[1] != null) {
            funVal = arg[1];
            checkTypeList(arg, 1, [TYPE_CLOSURE, TYPE_BUILTIN_FUNCTION])
        }

        checkType(arg, 0, TYPE_LIST);

        let rt = null;
        if (funVal == null) {
            rt = arg[0].val.sort(function (a, b) {
                if (a.val < b.val) {
                    return -1;
                }
                if (a.val > b.val) {
                    return 1;
                }
                return 0;
            });
        } else {
            rt = arg[0].val.sort(function (a, b) {
                let arg = [ a, b ];
                let mapVal = evalClosure("", funVal, arg, frame);
                let nVal = value2Num(mapVal);
                if (nVal < 0) {
                    return -1;
                }
                if (nVal > 0) {
                    return 1;
                }
                return 0;
            });
        }
        return new Value(TYPE_LIST, rt);
    }, [null, null]),

    // functions for maps/hashes
    "each" : new BuiltinFunctionValue( `# iterate over entries of a list or maps. 

# for lists: returns the list values
    
> each({"a":1,"b":2,"c":3})
[["a",1],["b",2],["c",3]]

# for maps: returns each key and value pair in a list of two elements

> pairs = each({"a":1,"b":2,"c":3})
> map( pairs, def (arg) [ arg[0]+arg[0], arg[1]*arg[1] ] )
[["aa",1],["bb",4],["cc",9]]    
`, 1, function*(arg) {
        checkTypeList(arg, 0, [TYPE_MAP, TYPE_LIST]);
        yield* genValues(arg[0]);
    },null, true),
    "keys": new BuiltinFunctionValue(`# for maps: returns the keys of the map
    
> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]`, 1, function(arg) {
        checkType(arg, 0, TYPE_MAP);
        let keys = Object.keys(arg[0].val);
        let rt = [];
        for(let i=0; i<keys.length;++i) {
            rt.push( new Value(TYPE_STR, keys[i] ) );
        }
        return new Value(TYPE_LIST, rt);
    }),

    // functions for working with json
    "parseJsonString": new BuiltinFunctionValue(`# given a json formatted string as argument: returns am equivalent data structure of nested lists and maps

> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]`, 1,function(arg, frame) {
        checkType(arg, 0, TYPE_STR);
        let val = JSON.parse(arg[0].val);
        let rt = jsValueToRtVal(val);
        return rt;
    }),
    "toJsonString": new BuiltinFunctionValue(`# given a data argument: returns a json formatted string

> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\\"name\\":\\"Pooh\\",\\"family\\":\\"Bear\\",\\"likes\\":[\\"Honey\\",\\"Songs\\",\\"Friends\\"]}"`, 1,function(arg, frame) {
        return new Value(TYPE_STR, rtValueToJson(arg[0]));
    }),

    //functions for working with yaml
        "parseYamlString": new BuiltinFunctionValue(`# given a yaml formatted string, : returns am equivalent data structure of nested lists and maps
         
> a="a: 1\\nb: 2\\nc:\\n  - 1\\n  - 2\\n  - 3\\n"
"a: 1\\nb: 2\\nc:\\n  - 1\\n  - 2\\n  - 3\\n"
> println(a)
a: 1
b: 2
c:
  - 1
  - 2
  - 3
  
> parseYamlString("a: 1\\nb: 2\\nc:\\n  - 1\\n  - 2\\n  - 3\\n")
{"a":1,"b":2,"c":[1,2,3]}    
    `, 1,function(arg, frame) {
        checkType(arg, 0, TYPE_STR);
        let val = yaml.parse(arg[0].val);
        let rt = jsValueToRtVal(val);
        return rt;
    }),
    "toYamlString": new BuiltinFunctionValue(`# given a data argument: returns a yaml formatted string
    
> a={"a":1, "b":2, "c":[1,2,3] }
{"a":1,"b":2,"c":[1,2,3]}
> println(toYamlString(a))
a: 1
b: 2
c:
  - 1
  - 2
  - 3`, 1,function(arg, frame) {
        let jsVal = rtValueToJsVal(arg[0]);
        return new Value(TYPE_STR, yaml.stringify(jsVal));
    }),

    // functions for working with processes
    "system": new BuiltinFunctionValue(`# runs the string command in a shell, returns an array where the first element is the standard output of the command, the second element of the list is the exit code of the process
    
> a=system("ls /")
["Applications\\nLibrary\\nSystem\\nUsers\\nVolumes\\nbin\\ncores\\ndev\\netc\\nhome\\nopt\\nprivate\\nsbin\\ntmp\\nusr\\nvar\\n",0]

> println(a[0])
Applications
Library
System
Users
Volumes
bin
cores
dev
etc
home
opt
private
sbin
tmp
usr
var

> println(a[1])
0`, 1,function(arg, frame) {

        let cmd ="";

        if (arg[0].type == TYPE_STR) {
            cmd = arg[0].val;
        } else {
            if (arg[0].type == TYPE_LIST) {
                cmd = arg[0].val.map(value2Str).join(" ");
            }
        }
        return _system(cmd, frame);
    }),

    "getcwd": new BuiltinFunctionValue(`
# returns the current directory of processes created with system, exec or via backick operator \`

`, 0, function(arg, frame) {
        let value = process.cwd();
        return new Value(TYPE_STR, value);
    }),

    "chdir": new BuiltinFunctionValue(`
# change the current directory. 
# That's the current directory of processes created with system, exec or via backick operator
 
`, 1, function(arg, frame) {
            let dir = value2Str(arg, 0)
            try {
                process.chdir(dir);
            } catch(er) {
                throw new RuntimeException("Can't change directory to " + dir + " error: " +  er.message);
            }
            return VALUE_NONE;
        }),

    "exec": new BuiltinFunctionValue(`
# run a process and receive the input output in a callback. Returns the process id as return value 

# callback is called 
# - when standard output or error has been read (second or third parameter is set)
# - an error occurred (first parameter is set)

# returns the process id of the new process

pid = exec("ls /", def(ex,out,err) { println("error: {ex} standard output: {out} standard error: {err}") })

    `, 2,function(arg, frame) {
        let cmd = value2Str(arg, 0);
        checkType(arg, 1, TYPE_CLOSURE);
        let callback = arg[1];

        let env = _getEnv(frame);
        try {
            let childProcess = cp.exec(cmd, {env: env}, function(error, stdout, stderr){

                // call the callback
                try {
                    let argErr = VALUE_NONE;
                    if (error != null) {
                        argErr = new Value(TYPE_STR,error.message);
                    }
                    let argStdout = VALUE_NONE;
                    if (stdout != null) {
                        argStdout = new Value(TYPE_STR, stdout.toString());
                    }
                    let argStderr = VALUE_NONE;
                    if (stdout != null) {
                        argStderr = new Value(TYPE_STR, stderr.toString());
                    }
                    let vargs =  [ argErr, argStdout, argStderr ];
                    evalClosure("", callback, vargs, frame);
                } catch(er) {3
                    if (er instanceof RuntimeException) {
                        er.showStackTrace(true);
                    } else {
                        throw er;
                    }
                }
            });

            let onExit = function() {
                delete spawnedProcesses[childProcess.pid];
            }

            childProcess.addListener('close', onExit)
            childProcess.addListener('error', onExit)

            spawnedProcesses[childProcess.pid] = childProcess;
            return new Value(TYPE_NUM, childProcess.pid);

        } catch(e) {
            console.log("failed to run: cmd" + e.message);
            throw RuntimeException("failed to run " + cmd + " error: " + e.message);
        }
    }),

    "kill": new BuiltinFunctionValue(`
# gets process id returned by exec. kills the process.    
`, 1,function(arg, frame) {
        let pid = value2Num(arg, 0);

        let processEntry = spawnedProcesses[pid];
        if (processEntry != null) {
            processEntry.kill();
        }
        return VALUE_NONE;
    }),

    "sleep": new BuiltinFunctionValue(`    
# sleep for three seconds    
sleep(3)
`, 1,function(arg, frame) {
        let num = value2Num(arg,0) * 1000;

        let date = new Date();
        let curDate = null;

        // sigh...
        do {
            curDate = new Date();
        }  while(curDate-date < num);

        return VALUE_NONE;
    }),

    "_system_backtick": new BuiltinFunctionValue(null, 1,function(arg, frame) {

        let cmd ="";

        if (arg[0].type == TYPE_LIST) {
            cmd = arg[0].val.map(value2Str2).join("");
        } else {
            throw new RuntimeException("list parameter required");
        }
        return _system(cmd, frame);
    }),

    // control flow
    "exit": new BuiltinFunctionValue(`
# exit() - exit program with status 0 (success)
# exit(1) - exit program with status 1 (failure)`,
        1,function(arg, frame) {
        let num = 0;
        if (arg[0] != null) {
            num = value2Num(arg, 0);
        }
        process.exit(num);
    }),

    "assert": new BuiltinFunctionValue( `
# first argument is a boolean expression, if it's value is false then throw an exception
# the second argument is optional, it tells the message of the exception, in case of failure

> a=true
true
> assert(a, "a should be true")

> a=false
false

> assert(a, "a should be true")
Error: a should be true
#(1) assert(a, "a should be true")
   |    
`,2, function(arg, frame) {
        let val = value2Bool(arg, 0);
        if (!val) {
            let msg="";
            if (arg[1] != null) {
                msg = value2Str(arg, 1);
            } else {
                msg = "Assertion failed";
            }
            throw new RuntimeException(msg)
        }
    }, [null, null]),

    // other functions
    "exists": new BuiltinFunctionValue(`> a={"first":1}
{"first":1}
> exists("first", a)
true
> exists("second", a)
false
> a=[3,4]
[3,4]
> exists(3, a)
true
> exists(4, a)
true
> exists(5, a)
false`, 2,function(arg, frame) {
        checkTypeList(arg, 1, [TYPE_MAP, TYPE_LIST]);

        if (arg[1].type == TYPE_MAP) {
           // check if map has first argument as key
           let key = value2Str(arg,  0);
           return new Value(TYPE_BOOL, key in arg[1].val);
        }
        if (arg[1].type == TYPE_LIST) {
            return new Value(TYPE_BOOL, arg[1].val.some( function(a) {
                return arg[0].type == a.type && arg[0].val == a.val;
            }));
        }
    }),
    "help": new BuiltinFunctionValue(`
# Show help text for built-in functions: Example usage:
 
help(sort)

# to get a list of functions with help text:
help()

`, 1,function(arg, frame) {
        if (arg[0]==null) {

            let msg =`
Example usage:

> help(min)

> min(4,3)
3
> min(3,4)
3

Names of functions with help text:

`;
            let funcs =[];
            frame.listOfFuncsWithHelp(funcs);
            msg += funcs.sort().join(", ");
            console.log( msg );
        } else {
            if ('help' in arg[0]) {
                console.log(arg[0].help);
            } else {
                console.log(typeNameVal(arg[0]));
            }
        }
        return VALUE_NONE
    }, [null]),

    "type": new BuiltinFunctionValue(`# returns a string that describes the argument value
    
> type(1)
"Number"
> type("abc")
"String"
> type([1,2,3])
"List"
> type({"first": 1, "second": 2})
"Map"
> type(def(x) 1+x)
"Closure"`, 1,function(arg, frame) {
        return new Value(TYPE_STR, typeNameVal(arg[0]));
    }),

    "setPYXOptions": new BuiltinFunctionValue(`
# set opttions of the PYX runtime

# enable tracing of program (equivalent to -x command line option)
# setPYXOptions("trace", true) 

> def f(x) pow(x,2) + 1

> f(3)
10

> setPYXOptions("trace", true)

> f(3)
f(x=3)
+ pow(3, 2) {
+ 9
} 10

# stop tracing
setPYXOptions("trace", false)

# when set: throw exception if running a process failed

> setPYXOptions("errorExit", true)

> system("false")
+ system("false") {
failed to run: false error: Command failed: false
Error: internal error: Error: Command failed: false
#(1) system("false")
   |.^
   
# set limit on number of frames displayed during stack trace

> def stackOverflow(x)  x * stackOverflow(x-1)

> setPYXOptions("framesInError", 3)
   
> stackOverflow(1024)
Error: internal error: RangeError: Maximum call stack size exceeded
#(1) def stackOverflow(x)  x * stackOverflow(x-1)
   |...........................^
#(1) def stackOverflow(x)  x * stackOverflow(x-1)
   |.........................^
#(1) def stackOverflow(x)  x * stackOverflow(x-1)
   |.^      
`, 2,function(arg, frame) {
        let optname = value2Str(arg, 0);
        if (optname == "trace") {
            setTraceMode( value2Bool(arg, 1) );
        } else if (optname == "errorExit") {
            errorOnExecFail = value2Bool(arg, 1);
        } else if (optname == "framesInError") {    
            maxStackFrames =  value2Num(arg, 1);
            console.log("maxStackFrames " + maxStackFrames)
        } else {
            throw new RuntimeException("Unknwon option name");
        }
        return VALUE_NONE;
    }),

    "eval": new BuiltinFunctionValue(`
# evaluate the string as a pyx program - in the current scope

> eval("2*2")
4

> eval("sqrt(2)")
1.4142135623730951

> value=2
2
> eval("sqrt(value)")
1.4142135623730951

> def pythagoras(x,y) sqrt(pow(x,2)+pow(y,2))

> eval("pythagoras(3,4)")
5

`, 1,function(arg, frame) {
        let script = value2Str(arg, 0);
        if (evalCallback != null) {
            let rt = evalCallback(script, frame);
            if (rt != null) {
                return rt;
            }
        }
        return VALUE_NONE;
    }),


    // generators
    "range": new BuiltinFunctionValue(`> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3`, 3,function *(arg, frame) {
        let from = value2Num(arg, 0);
        let to = value2Num(arg, 1);
        let step = 1;
        if (arg[2] != null) {
            step = value2Num(arg, 2);
        }
        if (step>0) {
            while (from < to) {
                yield new Value(TYPE_NUM, from);
                from += step;
            }
        }
        if (step<0) {
            while (from > to) {
                yield new Value(TYPE_NUM, from);
                from += step;
            }
        }
    }, [null, null, null], true),

    // functions for working with time
    "time": new BuiltinFunctionValue("# returns epoch time in seconds", 0,function(arg, frame) {
        let secondsSinceEpoch = new Date().getTime() / 1000;
        return new Value(TYPE_NUM, secondsSinceEpoch);
    }),
    "localtime": new BuiltinFunctionValue(`# decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    
`, 1,function(arg, frame) {
        let date = null;
        if (arg[0] == null) {
            date = new Date();
        } else {
            date = new Date(value2Num(arg, 0) * 1000);
        }
        let retMap = {
            "seconds": new Value(TYPE_NUM, date.getSeconds()),
            "minutes": new Value(TYPE_NUM, date.getMinutes()),
            "hours": new Value(TYPE_NUM, date.getHours()),
            "days": new Value(TYPE_NUM, date.getDay()),
            "year": new Value(TYPE_NUM, date.getFullYear()),
            "month": new Value(TYPE_NUM, date.getMonth()),
        };
        return new Value(TYPE_MAP, retMap);
    }, [null]),

    "httpSend": new BuiltinFunctionValue(`

# send htp request
# - first argument - the request url
# - second argument - additional request parameters (none means http get request)
# - third argument - called upon reponse (called on both success and error)
#    resp - not none on success, error - not none on error (error message)
httpSend('http://127.0.0.1:9010/abcd', none, def(resp,error) {
    println("response: {resp} error: {error}\n") 
})

# send http POST request with data and headers

postData = '{ "name": "Pooh", "family": "Bear" }'

options = {
  'method': 'POST',
  'headers': {
     'Content-Type': 'text/json',
     'Content-Length' : len(postData)
  },
  'data' : postData
}

httpSend('http://127.0.0.1:9010/abcd', options, def(resp,error) {
    println("response: {resp} error: {error}") 
})


`, 3, function(arg, frame) {
        let options  = null
        let httpMethod = 'GET';
        let httpHeaders = null;
        let httpRequestData = null;
        let callback = null;
        let surl = value2Str(arg, 0);

        if (arg[1] != null && arg[1].type != TYPE_NONE) {
            checkType(arg, 1, TYPE_MAP);
            options = rtValueToJsVal(arg[1]);

            if ('method' in options) {
                httpMethod = options['method'];
            }
            if ('headers' in options) {
                httpHeaders = options['headers'];
            }
            if ('data' in options) {
                httpRequestData = options['data'];
            }
        }

        if (arg[2] != null) {
            checkType(arg, 2, TYPE_CLOSURE);
        }
        callback = arg[2];

        let urlObj = new url.URL(surl);

        let requestOptions = {
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            port: parseInt(urlObj.port),
            path: urlObj.pathname,
            method: httpMethod,
        };
        if (httpHeaders != null) {
            requestOptions['headers'] = httpHeaders;
        }
    
        //requestOptions['headers'] = {  'Connection': 'keep-alive' };
        requestOptions['agent'] = httpAgent;

        let callUserFunction = function(data, error) {
            // this one is evaluated from another task. runtime exceptions need to be handled here
            let varg = [ new Value(TYPE_STR,data), error ];

            try {
                evalClosure("", callback, varg, frame);
            } catch(er) {
                if (er instanceof RuntimeException) {
                    er.showStackTrace(true);
                } else {
                    throw er;
                }
            }
        }

        //console.log("request: " + JSON.stringify(requestOptions));

        let reqObj = http.request(requestOptions,function (resp) {
            resp.setEncoding('utf8');

            let data = "";
            resp.on('data', (chunk) => {
                data += chunk.toString();
            });
            resp.on('end', () => {
                callUserFunction(data, VALUE_NONE);
            });
        });

        reqObj.on('error', (e) => {
            callUserFunction(VALUE_NONE, new Value(TYPE_STR, e.message));
        });


        if (httpRequestData != null) {
            reqObj.write(httpRequestData);
        }
        reqObj.end();
        return VALUE_NONE;
    }, [null, null, null]),

    "httpServer": new BuiltinFunctionValue(` 

# listen for incoming http requests on port 9010.     
httpServer(9010, def (req,resp) {
 
    # function is called on each request  
    # req  - access request properties
    # resp - send response via send method

    println("url: {req.url()}")
    if req.url() == "/time" {

        # show request properties
        println("=====
request url: {req.url()}
method: {req.method()}
headers {req.headers()}
requestData: {req.requestData()}
")

        tm = localtime()
        js = toJsonString(tm)

        # send the response, first comes the http status, then the data, then the mime type.
        resp.send(200, js, "text/json")
    } else
        resp.send(501, "no one here")
})

`, 2,function(arg, frame) {
        let  listenPort = value2Num(arg, 0);

        if (arg[1].type != TYPE_CLOSURE) {
            throw new RuntimeException("Callback function expected as second parameter")
        }

        http.createServer(makeHttpServerListener(arg[1], frame)).listen(listenPort);

        return VALUE_NONE;

    }, [null]),

    "mathconst" : new Value(TYPE_MAP, {
        pi: new Value(TYPE_NUM, Math.PI),
        e: new Value(TYPE_NUM, Math.E),
        ln10: new Value(TYPE_NUM, Math.LN10),
        ln2: new Value(TYPE_NUM, Math.LN2),
        log10e: new Value(TYPE_NUM, Math.LOG10E),
        log2e: new Value(TYPE_NUM, Math.LOG2E),
        sqrt1_2: new Value(TYPE_NUM, Math.SQRT1_2),
        sqrt2: new Value(TYPE_NUM, Math.SQRT2),
        Infinity: new Value(TYPE_NUM, Infinity),
    }, `# map of mathematical constants.

# the number PI
    
> mathconst.pi
3.141592653589793

# the Euler constant 

> mathconst.e
2.718281828459045

# The square root of two

> mathconst.sqrt2
1.4142135623730951

# Other values: 
mathconst.sqrt1_2 # - square root of one half.
mathconst.log2e   # - base e logarithm of 2 
mathconst.log10e  # - base e logarithm of 10
mathconst.log2e   # - base 2 logarithm of e
mathconst.log10e  # - base 10 logarithm of e    
    `),

    "ARGV" : new Value(TYPE_LIST, [], `
# array of command line parameters passed to the program.
# you can pass command line parameter to the shell like this:

pyx -- 1 2 3 4

> ARGV
["1","2","3","4"]

# just the same if running a program

pyx programFile.p -- 1 2 3 4

# or just pass them after the file that contains a program

pyx programFile.p 1 2 3 4
    
`),

    "ENV": new Value(TYPE_MAP,
        Object.entries(process.env).reduce(
            (prev,current)=>{
                prev[current[0]]= new Value(TYPE_STR, current[1]);
                return prev
            } , {}) ,
        "# environment variables, entry key is the name of the environment variable, the entry value is it's value"
    ),
}

// there is a global frame, also each function invocation has is own frame.a
// closures have a parent frame - which is the frame where they where evaluated.
// simple rules. aren't they?
class Frame {
    constructor(parentFrame = null) {
        this.vars = {}; // maps variable name to Value instance
        this.parentFrame = parentFrame;
    }

    lookup(name) {
        //console.log("lookup: " + name);
        let ret = this._lookup(name);
        //console.log("lookup: " + name + " ret: " + JSON.stringify(ret));
        return ret;
    }

    _lookup(name) {
        if (name in this.vars) {
            return this.vars[name];
        }
        if (this.parentFrame != null) {
            return this.parentFrame._lookup(name);
        }
        throw new RuntimeException("undefined variable: " + name  );
    }

    assign(name, value) {
        if (!this._assign(name, value)) {
            this.vars[name] = clonePrimitiveVal(value);
        }
    }

    _assign(name, value) {
        if (name in this.vars) {
            this.vars[name] = clonePrimitiveVal(value);
            return true;
        }
        if (this.parentFrame != null) {
            return this.parentFrame._assign(name, value);
        }
        return false;
    }

    defineVar(name, value) {
       this.vars[name] = clonePrimitiveVal(value);
    }

    undefVar(name) {
        delete this.vars[name];
    }

    complete(prefix, resultList) {
        let keys = Object.keys(this.vars);
        for(let i=0; i<keys.length; ++i) {
            let it=keys[i];
            if (prefix == "" || it.startsWith(prefix)) {
                let varVal = this.vars[keys[i]];
                if (varVal.type == TYPE_CLOSURE || varVal.type == TYPE_BUILTIN_FUNCTION) {
                    if (it.startsWith("_")) {
                        continue;
                    }
                    it += "(";
                }
                resultList.push(it);
                //resultList.push(it.substring(prefix.length));
            }
        }
        if (this.parentFrame != null) {
            this.parentFrame.complete(prefix, resultList);
        }
    }

    listOfFuncsWithHelp(resultList) {
        let keys = Object.keys(this.vars);
        for(let i=0; i<keys.length; ++i) {
            let it=keys[i];

            let varVal = this.vars[keys[i]];
            if ((varVal.type == TYPE_CLOSURE || varVal.type == TYPE_BUILTIN_FUNCTION)) {
                if ("help" in varVal) {
                    resultList.push(it);
                }
            }
        }
        if (this.parentFrame != null) {
            this.parentFrame.listOfFuncsWithHelp(resultList);
        }
    }
}

function showList(lst, dsp = null, separator = "\n") {
    if (lst == null) {
        return "";
    }
    let retVal = "";
    for (let i = 0; i < lst.length; ++i) {
        if (i > 0) {
            retVal += separator;
        }
        if (dsp != null) {
            retVal += dsp(lst[i]);
        } else {
            if ('show' in lst[i]) {
                retVal += lst[i].show();
            } else {
                retVal += "<error: " + lst[i].constructor.name + ">";
            }
        }
    }
    return retVal;
}

class AstBase {
    constructor(startOffset) {
        this.startOffset = startOffset;
        this.currentSourceInfo = currentSourceInfo;
        this.hasGen = false; // has this statement a generator version? (genEval member function?)
    }

    hasYield() {
        return false;
    }
}

class AstStmtList extends AstBase {
    constructor(statements, offset) {
        super(offset)
        this.statements = statements;
        this.hasGen = true;
        this.skipTrace = false;
        this.hasYield_ = null;
    }

    eval(frame) {
        let val = VALUE_NONE;

        if (traceMode && !this.skipTrace && this.statements.length > 1) {
            process.stderr.write(tracePrompt + "{\n");
        }

        for(let i=0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            val = stmt.eval(frame);
            //console.log("eval obj: " + stmt.constructor.name + " res: " + JSON.stringify(val));
            if (val.type >= TYPE_FORCE_RETURN) {
                break;
            }
        }

        if (traceMode && !this.skipTrace && this.statements.length > 1) {
            process.stderr.write(tracePrompt + "}\n");
        }

        return val;
    }

    *genEval(frame) {
        let val = VALUE_NONE;
        for (let i = 0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            if (stmt.hasGen) {
                val = yield* stmt.genEval(frame);
            } else {
                val = stmt.eval(frame);
            }

            if (val.type >= TYPE_FORCE_RETURN) {
                return val;
            }
        }
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            let ret = false;
            for (let i = 0; i < this.statements.length; ++i) {
                let stmt = this.statements[i];
                if (stmt.hasYield(frame)) {
                    ret = true;
                    break;
                }
            }
            this.hasYield_ = ret;
        }
        return this.hasYield_;
    }

    show() {
        return showList(this.statements);
    }
}

function makeStatementList(stmtList, offset) {
    return new AstStmtList(stmtList, offset);
}

class AstTryCatchBlock extends AstBase {
    constructor(statements, optCatchBlock, optFinallyBlock, offset) {
        super(offset);
        this.statements = statements;
        //console.log("optCatch: " + JSON.stringify(optCatchBlock));
        this.catchBlock = optCatchBlock;
        this.finallyBlock = optFinallyBlock != null ? optFinallyBlock[0] : null;
        this.hasGen = true;
        this.hasYield_ = null;
    }

    eval(frame) {
        let res = VALUE_NONE;
        let throwErr = null;
        let throwNow = false;

        try {
            // return value is the last statement of the block.
            res = this.statements.eval(frame)
        } catch(er) {
            throwErr = er;
            if (!(er instanceof RuntimeException)) {
                throwNow = true;
            }
        }

        if (throwNow) {
            throw throwErr;
        }

        if (throwErr != null) {
            if (this.catchBlock != null) {
                frame.defineVar(this.catchBlock[1][0], throwErr.toRTValue())
                try {
                    // run catch block
                    this.catchBlock[2].eval(frame);
                    throwNow = false;

                } catch (er) {
                    throwNow = true;
                    if (er instanceof RuntimeException && throwErr instanceof RuntimeException) {
                        er.stackTrace = throwErr.stackTrace.concat(er.stackTrace);
                    }
                    throwErr = er;
                    throwNow = true;
                } finally {
                    // what if variable redefined existing variables?
                    //frame.undefVar(this.catchBlock[0][0]);
                }
            } else { // no catch block, but error occurred
                throwNow = true;
            }
        }

        if (this.finallyBlock != null) {
            try {
                let res2 = this.finallyBlock.eval(frame);
                if (res2.type != TYPE_NONE) {
                    res = res2;
                }
            } catch(er) {
                if (er instanceof RuntimeException) {
                    throwErr = er;
                }
                throwNow = true;
            }
        }

        if (throwNow) {
            throw throwErr;
        }
        return res;
    }

    *genEval(frame) {
        let res = VALUE_NONE;
        let throwErr = null;
        let throwNow = false;

        try {
            // return value is the last statement of the block.
            if (this.statements.hasYield()) {
                res = yield * this.statements.genEval(frame)
            } else {
                res = this.statements.eval(frame)
            }
        } catch(er) {
            throwErr = er;
            if (!(er instanceof RuntimeException)) {
                throwNow = true;
            }
        }


        if (throwNow) {
            throw throwErr;
        }

        if (throwErr != null) {
            if (this.catchBlock != null) {
                frame.defineVar(this.catchBlock[1][0], throwErr.toRTValue())
                try {
                    // run catch block
                    this.catchBlock[2].eval(frame);
                    throwNow = false;

                } catch (er) {
                    throwNow = true;
                    if (er instanceof RuntimeException && throwErr instanceof RuntimeException) {
                        er.stackTrace = throwErr.stackTrace.concat(er.stackTrace);
                    }
                    throwErr = er;
                    throwNow = true;
                } finally {
                    // what if variable redefined existing variables?
                    //frame.undefVar(this.catchBlock[0][0]);
                }
            } else { // no catch block, but error occurred
                throwNow = true;
            }
        }

        if (this.finallyBlock != null) {
            try {
                let res2 = null;

                if (this.finallyBlock.hasYield()) {
                    res2 = yield* this.finallyBlock.genEval(frame);
                } else {
                    res2 = this.finallyBlock.eval(frame);
                }

                if (res == null || res2.type != TYPE_NONE) {
                    res = res2;
                }
            } catch(er) {
                if (er instanceof RuntimeException) {
                    throwErr = er;
                }
                throwNow = true;
            }
        }


        if (throwNow) {
            throw throwErr;
        }
        if (res == null) {
            res = VALUE_NONE;
        }
        return res;
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            let ret = false;
            if (this.statements.hasYield(frame)) {
                ret = true;
            }
            else if (this.catchBlock[2] != null && this.catchBlock[2].hasYield(frame)) {
                ret =  true;
            }
            else if (this.finallyBlock != null && this.finallyBlock.hasYield(frame)) {
                ret = true;
            }
            this.hasYield_ = ret;
        }
        return this.hasYield_;
    }
}

function makeTryCatchBlock(statements, optCatchBlock, optFinallyBlock, offset) {
    return new AstTryCatchBlock(statements, optCatchBlock, optFinallyBlock, offset);
}

class AstThrowStmt extends AstBase {
    constructor(expression, offset) {
        super(offset);
        this.expression = expression;
    }

    eval(frame) {
        let value = this.expression.eval(frame);
        throw new RuntimeException(value, [this.startOffset, this.currentSourceInfo]);
    };
}

function makeThrowStmt(expression, offset) {
    return new AstThrowStmt(expression, offset);
}

/*
class RegexConstValue extends AstBase {
    constructor(value, offset) {
        super(offset);

        this.isGlobal = value.endsWith('g');
        try {
            this.regex = new RegExp(value);
        } catch(ex) {
            throw new ParserError(ex, offset);
        }
    }

    eval(frame) {
        console.log("haha");
        return new Value(TYPE_STR, this.regex.toString());
    }

    show() {
        return this.regex.toString();
    }
}
*/

class AstConstValue extends AstBase {
    constructor(value, offset) {
        super(offset);
        this.value = value;
    }

    eval(frame) {
        return this.value;
    }

    show() {
        return this.value.show();
    }
}

function makeConstValue(type, value) {
    let val = value[0];

    if (type == TYPE_REGEX) {
        return new AstConstValue(new RegexValue(value[0]), value[1]);
    }
    if (type == TYPE_BOOL) {
        value[0] = val == "true";
    }
    if (val == "none") {
        val[0] = null;
    }
    return new AstConstValue(new Value(type, value[0]), value[1]);
}

function checkMixedType(op, lhs, rhs) {
    if (lhs.type != rhs.type) {
        throw new RuntimeException(op + " not allowed between " + typeNameVal(rhs) + " and " + typeNameVal(lhs))
    }
}

function checkMixedTypeAllowNone(op, lhs, rhs) {
    if (lhs.type != TYPE_NONE && rhs.type != TYPE_NONE) {
        if (lhs.type != rhs.type) {
            throw new RuntimeException(op + " not allowed between " + typeNameVal(rhs) + " and " + typeNameVal(lhs))
        }
    }
}

MAP_OP_TO_FUNC={
    "and" : function(lhs,rhs, frame) {
        return new Value(TYPE_BOOL, value2Bool(lhs.eval(frame)) && value2Bool(rhs.eval(frame)));
    },
    "or" : function(lhs,rhs, frame) {
        return new Value(TYPE_BOOL, value2Bool(lhs.eval(frame)) || value2Bool(rhs.eval(frame)));
    },
    "<" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType("<", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val < rhs.val); // javascript takes care of it, does it?
    },
    ">" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType(">", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val > rhs.val);
    },
    "<=" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType("<=", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val <= rhs.val);
    },
    ">=" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType(">=", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val >= rhs.val);
    },
    "==" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedTypeAllowNone("==", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val == rhs.val);
    },
    "!=" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedTypeAllowNone("!=", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val != rhs.val);
    },
    "+" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't add " + typeNameVal(lhs) + " to " + typeNameVal(rhs));
        }
        if (lhs.type == TYPE_STR) {
            /* allow add for strings - this concats the string values */
            return new Value(lhs.type, lhs.val + rhs.val);
        }
        if (lhs.type == TYPE_NUM) {
            return new Value(lhs.type, checkResNan(lhs.val + rhs.val));
        }
        if (lhs.type == TYPE_LIST) {
            // concat lists
            return new Value(TYPE_LIST, lhs.val.concat(rhs.val));
        }
        throw new RuntimeException("Can't add " + typeNameVal(lhs) + " to " + typeNameVal(rhs));
    },
    "-" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't subtract " + typeNameVal(rhs) + " from " + typeNameVal(lhs) );
        }
        if (lhs.type != TYPE_NUM) {
            throw new RuntimeException("need number types for substraction" );
        }
        return new Value(lhs.type, checkResNan(lhs.val - rhs.val));
    },
    "*" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);

        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't multiply " + typeNameVal(lhs) + " with " + typeNameVal(rhs));
        }
        if (lhs.type != TYPE_NUM) {
            throw new RuntimeException("need number types for multiplication" );
        }

        return new Value(TYPE_NUM, checkResNan(value2Num(lhs) * value2Num(rhs)));
    },
    "/" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);

        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't divide " + typeNameVal(lhs) + " by " + typeNameVal(rhs) );
        }
        if (lhs.type != TYPE_NUM) {
            throw new RuntimeException("need number types for division" );
        }

        let rhsVal = value2Num(rhs);
        if (rhsVal == 0) {
            // javascript allows to divide by zero, amazing.
            throw new RuntimeException("Can't divide by zero");
        }
        return new Value(TYPE_NUM,checkResNan(value2Num(lhs) / rhsVal));
    },
    "%" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);

        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't divide modulo " + typeNameVal(lhs) + " by " + typeNameVal(rhs) );
        }

        if (lhs.type != TYPE_NUM) {
            throw new RuntimeException("need number types for modulo division" );
        }

        let rhsVal = value2Num(rhs);
        if (rhsVal == 0) {
            // javascript allows to divide by zero, amazing.
            throw new RuntimeException("Can't divide modulo by zero");
        }
        return new Value(TYPE_NUM,value2Num(lhs) % rhsVal);
    },

}

class AstBinaryExpression extends AstBase {
    constructor(lhs, op, rhs, offset) {
        super(op[1]); //lhs.offset);
        this.lhs = lhs;
        this.rhs = rhs;
        this.op = op[0];
        this.fun = MAP_OP_TO_FUNC[op[0]];
        if (this.fun == undefined) {
            console.log("operator " + op[0] + " is not defined");
        }
    }
    
    eval(frame) {
        try {
            //let lhsVal = this.lhs.eval(frame);
            //let rhsVal = this.rhs.eval(frame);
            //return this.fun(lhsVal, rhsVal);
            return this.fun(this.lhs, this.rhs, frame);
        } catch(er) {
            if (er instanceof RuntimeException && er.firstChance) {
                er.firstChance = false;
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            }
            throw er;
        }
    }

    show() {
        return this.op + ": " + this.lhs.show() + " " + this.op + " " + this.rhs.show();
    }

}

function makeExpressionLeftToRight(exprList) {
    if (exprList.length == 1) {
        return exprList[0];
    }
    let prevExpression = null;
    let pos = exprList.length -1;

    //console.log("enter makeExpression");
    while(pos > 0) {
        if (prevExpression == null) {
            //console.log("## " + JSON.stringify(exprList[pos-2]) + " # " +   JSON.stringify(exprList[pos-1]) + " # " + JSON.stringify(exprList[pos]));
            prevExpression = new AstBinaryExpression(exprList[pos-2], exprList[pos-1], exprList[pos]);
            pos -= 3;
        } else {
            //console.log("!! " + JSON.stringify(exprList[pos-1]) + " # " +   JSON.stringify(exprList[pos]) + " # " + prevExpression);
            prevExpression = new AstBinaryExpression(exprList[pos-1], exprList[pos], prevExpression);
            pos -= 2;
        }
    }
    //console.log("exit makeExpression: " + JSON.stringify(prevExpression));
    return prevExpression;
}

function makeExpression(exprList) {
    if (exprList.length == 1) {
        return exprList[0];
    }
    let prevExpression = null;
    let pos = 0;

    //console.log("enter makeExpression");
    while(pos < exprList.length) {
        if (prevExpression == null) {
            //console.log("## " + JSON.stringify(exprList[pos-2]) + " # " +   JSON.stringify(exprList[pos-1]) + " # " + JSON.stringify(exprList[pos]));
            prevExpression = new AstBinaryExpression(exprList[pos], exprList[pos+1], exprList[pos+2]);
            pos += 3;
        } else {
            //console.log("!! " + JSON.stringify(exprList[pos-1]) + " # " +   JSON.stringify(exprList[pos]) + " # " + prevExpression);
            prevExpression = new AstBinaryExpression(prevExpression, exprList[pos], exprList[pos+1], );
            pos += 2;
        }
    }
    //console.log("exit makeExpression: " + JSON.stringify(prevExpression));
    return prevExpression;
}

MAP_UNARY_OP_TO_FUNC={
    "not": function(value) {
        return new Value(TYPE_BOOL, !value2Bool(value));

    },
    "-": function(value) {
        return new Value(TYPE_NUM, -1 * value2Num(value));
    }
}

class AstUnaryExpression extends AstBase {
    constructor(expr, op, offset) {
        super(offset);
        this.expr = expr;
        this.op = op;
        this.fun = MAP_UNARY_OP_TO_FUNC[op];
    }

    eval(frame) {
        try {
            let exprVal = this.expr.eval(frame);
            return this.fun(exprVal);
        } catch(er) {
            if (er instanceof RuntimeException && er.firstChance) {
                er.firstChance = false;
                er.currentSourceInfo = this.currentSourceInfo;
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            }
            throw er;
        }
    }

    show() {
        return this.op + " " + this.expr.show();
    }
}

class AstDictCtorExpression extends AstBase {
    constructor(exprList, offset) {
        super(offset);
        this.exprList = exprList;
    }

    eval(frame) {
        let ret = {}

        for(let i = 0; i < this.exprList.length; ++i) {
            let nameValueDef = this.exprList[i];

            let nameVal = nameValueDef[0].eval(frame);
            let name = value2Str( nameVal );
            let value = nameValueDef[1].eval(frame);

            ret[ name ] = value;
        }
        return new Value(TYPE_MAP, ret);
    }

    show() {
        return "{" + showList(this.exprList, function(arg) { return arg[0].show() + ": " + arg[1].show()}) + "}";
    }
}

function newDictListCtorExpression(exprList, offset) {
    return new AstDictCtorExpression(exprList, offset);
}

class AstListCtorExpression extends AstBase {
    constructor(exprList, offset) {
        super(offset);
        this.exprList = exprList;
    }

    eval(frame) {
        let vals = [];
        for(let i=0; i < this.exprList.length; ++i) {
            let val = this.exprList[i].eval(frame);
            vals.push(val)
        }
        return new Value(TYPE_LIST, vals);
    }

    show() {
        return "[" + showList(this.exprList, null, ", ")  + "]";
    }

}

function newListCtorExpression(exprList, offset) {
    let arg = [];
    if (exprList.length > 0) {
        arg = exprList[0];
    }
    return new AstListCtorExpression(arg, offset);
}

function makeUnaryExpression(expr, op) {
    return new AstUnaryExpression(expr, op[0], op[1]);
}

class AstLambdaExpression extends AstBase {

    constructor(functionDef) {
        super(functionDef.offset);
        this.functionDef = functionDef;
    }

    eval(frame) {
        let defaultParams = _evalDefaultParams(frame, this.functionDef.params);
        return new ClosureValue(this.functionDef, defaultParams, frame);
    }

    show() {
        return "(lambda " + this.functionDef.show() + " )";
    }
}

function makeLambdaExpression(functionDef) {
    return new AstLambdaExpression(functionDef);
}

function lookupIndex(frame, value, refExpr) {
    for(let i=0; i<refExpr.length; ++i) {
        let curValue = value.type;
        if (curValue != TYPE_LIST && curValue != TYPE_MAP && curValue != TYPE_STR) {
            throw new RuntimeException("Can't access expression of type " + typeNameVal(value) + " by index");
        }
        let expr = refExpr[i];
        let indexValue = expr.eval(frame);

        value = value.val[ indexValue.val ];
        if (value == null) {
            let ex = new RuntimeException("Can't lookup index " + indexValue.val);
            ex.addToStack([expr.startOffset, expr.currentSourceInfo]);
            throw ex;
        }

        if (curValue == TYPE_STR) {
            value = new Value(TYPE_STR, value);
        }
    }

    return value;
}

class AstIdentifierRef extends AstBase {
    constructor(identifierName, refExpr, offset) {
        super(offset);
        this.identifierName = identifierName;
        this.refExpr = refExpr;
    }

    // evaluate, if as part of expression (for assignment there is AstAssignment)
    eval(frame) {
        try {
            let value = frame.lookup(this.identifierName);
            if (this.refExpr != null) {
                value = lookupIndex(frame, value, this.refExpr)
            }
            return value;
        } catch(er) {
            if (er instanceof RuntimeException && !er.isUnwind()) {
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            }
            throw er;
        }
        //console.log("identifier ref: name: " + this.identifierName + " res: " + JSON.stringify(value));
    }

    show() {
        let ret = this.identifierName;
        if (this.refExpr != null) {
            ret += showList(this.refExpr,function (arg) {return "["+arg.show()+"]"});
        }
        return ret;
    }
}

function makeIdentifierRef(identifierName, refExpr) {
    return new AstIdentifierRef(identifierName[0], refExpr, identifierName[1]);
}

function _assignImp(frame, value, lhs) {
    let traceLhs=[];
    let traceRhs=[];

    if (lhs.length == 1 ) {
        let singleLhs = lhs[0];
        let traceVal = _assign(frame, singleLhs, value);
        if (traceMode) {
            traceLhs.push(traceVal[0]);
            traceRhs.push(traceVal[1]);
        }
    } else {
        if (value.type != TYPE_LIST) {
            throw new RuntimeException("list value expected on right hand side of assignment");
        }
        let rhsVal = value.val;
        if (lhs.length != rhsVal.length) {
            if (lhs.length < rhsVal.length) {
                throw new RuntimeException("not enough values to assign");
            } else {
                throw new RuntimeException("too many values to assign");
            }
        }
        for(let i=0; i<rhsVal.length; ++i) {
            let traceVal = _assign(frame, lhs[i], rhsVal[i]);
            if (traceMode) {
                traceLhs.push(traceVal[0]);
                traceRhs.push(traceVal[1]);
            }

        }
    }
    if (traceMode) {
        process.stderr.write(tracePrompt + traceLhs.join(", ") + " = " + traceRhs.join(",") + "\n");
    }
    return VALUE_NONE;
}

function _assign(frame, singleLhs, value) {
    let varName = singleLhs.identifierName;
    let indexExpr = singleLhs.refExpr;

    if (varName != "_") {
        if (indexExpr != null) {
            let lhsValue = frame.lookup(varName);
            let indexValues = _indexAssign(frame, lhsValue, indexExpr, value)
            if (traceMode) {
                let indexExpr = "";
                for(let i=0; i< indexValues.length; ++i) {
                    indexExpr += "[" + rtValueToJsVal(indexValues[i]) + "]";
                }
                return [ varName + indexExpr, rtValueToJsVal(value) ];
            }
        } else {
            frame.assign(varName, value);
            if (traceMode) {
                return [ varName, rtValueToJsVal(value) ];
            }
        }
    }
    if (traceMode) {
        return [ "_", rtValueToJsVal(value)];
    }
}

function _indexAssign(frame, value, refExpr, newValue) {
    let i=0;
    let traceVals = [];
    for(; i<refExpr.length; ++i) {
        if (value.type != TYPE_LIST && value.type != TYPE_MAP) {
            throw new RuntimeException("Can't index expression of variable " + this.identifierName);
        }
        let expr = refExpr[i];
        let indexValue = expr.eval(frame);

        if (traceMode) {
            traceVals.push(indexValue);
        }

        if (i != (refExpr.length-1)) {
            value = value.val[indexValue.val];
        } else {
            value.val[indexValue.val] = newValue;
        }
    }
    return traceVals;
}


class AstAssign extends AstBase {
    constructor(lhs, rhs, offset) {
        super(offset);
        this.lhs = lhs;
        this.rhs = rhs;
    }

    eval(frame) {
        let value = this.rhs.eval(frame);
        _assignImp(frame, value, this.lhs);
        return value;
    }

    show() {
        return showList(this.lhs, null, ",") + " = " + this.rhs.show();
    }
}

function makeAstAssignment(lhs, rhs, offset) {
    return new AstAssign(lhs, rhs, offset);
}

class AstIfStmt extends AstBase {
    constructor(expr, stmtList, elseStmtList, offset) {
        super(offset);
        this.ifClauses = [];
        this.addIfClause(expr, stmtList);
        this.hasGen = true;
        this.hasYield_ = null;

        //console.log("else: " + JSON.stringify(elseStmtList));
        this.elseStmtList = null;
        if (elseStmtList != null && elseStmtList.length != 0) {
            this.elseStmtList = elseStmtList[0][1];
        }
    }

    addIfClause(expr,stmtList) {
        //console.log("expr: " + JSON.stringify(expr) + " stmtList: " + stmtList);
        this.ifClauses.push([ expr, stmtList ]);
    }

    eval(frame) {
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            let val = clause[0].eval(frame);

            let boolVal = value2Bool(val);
            if (traceMode) {
                if (i == 0) {
                    process.stderr.write(tracePrompt + "if " + boolVal + (!boolVal ? " # <pass>" : "") + "\n");

                } else {
                    process.stderr.write(tracePrompt + "elif " + boolVal + (!boolVal ? " # <pass>" : "") + "\n");
                }
            }

            if (boolVal) {
                return clause[1].eval(frame);
            }
        }
        if (this.elseStmtList != null) {
            if (traceMode) {
                process.stderr.write(tracePrompt + "else\n");
            }

            return this.elseStmtList.eval(frame);
        }
        return VALUE_NONE;
    }

    *genEval(frame) {
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            let val = clause[0].eval(frame);
            if (value2Bool(val)) {
                if (clause[i].hasGen) {
                   return yield* clause[1].eval(frame);
                } else {
                    return clause[1].eval(frame);
                }
            }
        }
        if (this.elseStmtList != null) {

            if (this.elseStmtList.hasGen) {
                return yield * this.elseStmtList.genEval(frame);
            } else {
                return this.elseStmtList.eval(frame);
            }
        }
        return VALUE_NONE;
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {

            let ret = false;
            for (let i = 0; i < this.ifClauses.length; ++i) {
                let clause = this.ifClauses[i];
                if (clause[1].hasYield(frame)) {
                    ret = true;
                }
            }
            if (!ret && this.elseStmtList) {
                ret = this.elseStmtList.hasYield(frame);
            }
            this.hasYield_ = ret;
        }
        return this.hasYield_;
    }

    show() {
        let ret = "if ";
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            if (i!=0) {
                ret += "\nelif ";
            }
            ret += " " + clause[0].show() + "\n" + clause[1].show();
        }
        if (this.elseStmtList != null) {
            ret += " else " + this.elseStmtList.show();
        }
        return ret + ")";
    }
}

function makeIfStmt(expr, stmtList, elseStmtList, offset) {
    return new AstIfStmt(expr, stmtList, elseStmtList, offset);
}

class AstWhileStmt extends AstBase {
    constructor(expr, stmtList, offset) {
        super(offset);
        this.expr = expr;
        this.stmtList = stmtList;
        this.hasGen = true;
    }
    eval(frame) {
        while(true) {
            let condVal = this.expr.eval(frame);

            let cond =  value2Bool(condVal);
            if (cond == false) {
                break;
            }

            if (traceMode) {
                process.stderr.write(tracePrompt + "while " + cond + "\n" )
            }

            let rt = this.stmtList.eval(frame);

            if (rt.type >= TYPE_FORCE_RETURN) {
                if (rt.type == TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == TYPE_FORCE_RETURN) {
                    return rt;
                }
                if (rt.type ==TYPE_FORCE_CONTINUE) {
                    continue;
                }
            }
        }
        return VALUE_NONE;
    }

    *genEval(frame) {
        while(true) {
            let condVal = this.expr.eval(frame);

            let cond =  value2Bool(condVal);

            if (cond == false) {
                break;
            }

            let rt = null;

            if (this.stmtList.hasGen) {
                rt = yield* this.stmtList.genEval(frame);
                if (rt == null) {
                    continue;
                }
            } else {
                rt = this.stmtList.eval(frame);
            }

            if (rt.type >= TYPE_FORCE_RETURN) {
                if (rt.type == TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == TYPE_FORCE_RETURN) {
                    return rt;
                }
            }
        }
        return VALUE_NONE;
    }

    hasYield(frame) {
        return this.stmtList.hasYield(frame);
    }

    show() {
        return "while " + this.expr.show() + " " + this.stmtList.show();
     }
}

function makeWhileStmt(expr, stmtList, offset) {
    return new AstWhileStmt(expr, stmtList, offset);
}

class AstForStmt extends AstBase {
    constructor(lhs, expr, stmtList, offset) {
        super(offset);
        this.lhs = lhs;
        this.expr = expr;
        this.stmtList = stmtList;
        this.hasGen = true;
    }

    eval(frame) {
        if (traceMode) {
            process.stderr.write(tracePrompt + "for ");
        }
        if (this.expr instanceof AstFunctionCall && this.expr.hasYield(frame)) {
            for (let val of this.expr.genEval(frame)) {
                _assignImp(frame, val, this.lhs);
                let rt = this.stmtList.eval(frame);

                if (rt.type >= TYPE_FORCE_RETURN) {
                    if (rt.type == TYPE_FORCE_BREAK) {
                        break;
                    }
                    if (rt.type == TYPE_FORCE_RETURN) {
                        return rt;
                    }
                    if (rt.type == TYPE_FORCE_CONTINUE) {
                        continue;
                    }
                }
            }
            return VALUE_NONE;
        }

        let rt = this.expr.eval(frame);
        if (rt.type != TYPE_LIST && rt.type != TYPE_MAP) {
            throw new RuntimeException("Can't iterate over expression (expected list or map)", this.currentSourceInfo);
        }
        for(let val of genValues(rt)) {
            _assignImp(frame, val, this.lhs);

            let rt = this.stmtList.eval(frame);

            if (rt.type >= TYPE_FORCE_RETURN) {
                if (rt.type == TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == TYPE_FORCE_RETURN) {
                    return rt;
                }
            }
        }
        return VALUE_NONE;
    }

    *genEval(frame) {
        if (this.expr instanceof AstFunctionCall && this.expr.hasYield(frame)) {
            for (let val of this.expr.genEval(frame)) {
                _assignImp(frame, val, this.lhs);
                let rt = yield *this.stmtList.genEval(frame);

                if (rt != null && rt.type >= TYPE_FORCE_RETURN) {
                    if (rt.type == TYPE_FORCE_BREAK) {
                        break;
                    }
                    if (rt.type == TYPE_FORCE_RETURN) {
                        return rt;
                    }
                    if (rt.type == TYPE_FORCE_CONTINUE) {
                        continue;
                    }
                }
            }
            return VALUE_NONE;
        }

        let rt = this.expr.eval(frame);
        if (rt.type != TYPE_LIST && rt.type != TYPE_MAP) {
            throw new RuntimeException("Can't iterate over expression (expected list or map)", this.currentSourceInfo);
        }
        for(let val of genValues(rt)) {
            _assignImp(frame, val, this.lhs);
            let rt = yield* this.stmtList.genEval(frame);

            if (rt.type >= TYPE_FORCE_RETURN) {
                if (rt.type == TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == TYPE_FORCE_RETURN) {
                    return rt;
                }
            }
        }
        return VALUE_NONE;
    }


    hasYield(frame) {
        return this.stmtList.hasYield(frame);
    }

    show() {
        return "for " + showList(this.lhs)  + " " + this.expr.show() + " " + this.stmtList.show();
    }
}
function makeForStmt(lhs, expr, stmtList, offset) {
    return new AstForStmt(lhs, expr, stmtList, offset);
}

class AstReturnStmt extends AstBase {
    constructor(expr, offset) {
        super(offset);
        this.expr = expr;
    }

    eval(frame) {
        let retValue = this.expr.eval(frame);
        if (traceMode) {
            process.stderr.write(tracePrompt + "return " + rtValueToJson(retValue) + "\n");
        }
        return new Value(TYPE_FORCE_RETURN, retValue);
    }

    show() {
        return "return " + this.expr.show();
    }
}

function makeReturnStmt(expr, offset) {
    return new AstReturnStmt(expr, offset);
}

class AstYieldStmt extends AstBase {
    constructor(expr, offset) {
        super(offset);
        this.expr = expr;
        this.hasGen = true;
    }

    eval(frame) {
        return VALUE_NONE;
    }

    *genEval(frame) {
        let retValue = this.expr.eval(frame);
        yield retValue;
        return VALUE_NONE;
    }

    hasYield() {
        return true;
    }

    show() {
        return "yield " + this.expr.show();
    }
}

function makeYieldStmt(expr, offset) {
    return new AstYieldStmt(expr, offset);
}

class AstUseStatement extends AstBase {
    constructor(expr, offset, parserFunction) {
        super(offset);
        this.expr = expr;
        this.parserFunction = parserFunction;
        this.statements = null;
    }

     eval(frame) {
        if (this.statements == null) {

            let fileToInclude = this.expr.eval(frame);
            let includedFile = value2Str(fileToInclude);
            if (includedFile == "" || includedFile==null) {
                throw new RuntimeException("expression in use statement gives an empty value. (should be a string with the name of a file)", this.startOffset);
            }
            try {
                this.statements = this.parserFunction(includedFile, true);
            } catch(er) {
                throw er;
            }
        }
        return this.statements.eval(frame);
    }
}

function makeUseStmt(parser, expression, offset) {
    return new AstUseStatement(expression, offset, parser);
}


class AstBreakStmt extends AstBase {
    constructor(offset) {
        super(offset);
    }

    eval(frame) {
        if (traceMode) {
            process.stderr.write(tracePrompt + "break\n");
        }
        return new Value(TYPE_FORCE_BREAK, null);
    }

    show() {
        return "break";
    }
}

function makeBreakStmt(offset) {
    return new AstBreakStmt(offset);
}

class AstContinueStmt extends AstBase {
    constructor(offset) {
        super(offset);
    }

    eval(frame) {
        if (traceMode) {
            process.stderr.write(tracePrompt + "continue\n");
        }
        return new Value(TYPE_FORCE_CONTINUE, null);
    }

    show() {
        return "continue";
    }
}

function makeContinueStmt(offset) {
    return new AstContinueStmt(offset);
}

function _evalDefaultParams(frame, params) {
    let ret = [];
    for(let i = 0;i < params.length; ++i) {
        let param = params[i];
        if (param.length > 1) {
            let defValue = param[1][0].eval(frame);
            ret.push(defValue);
        } else {
            ret.push(null);
        }
    }
    return ret;
}

class AstFunctionDef extends AstBase {
    constructor(name, params, body, offset) {
        super(offset);
        this.name = null;
        if (name != null) {
            this.name = name[0];
        }
        this.params = params;
        this.body = body;
        this.isGeneratorFunction = false;
        this.hasYield_ = null;
    }

    eval(frame) {
        let defaultParamValues = _evalDefaultParams(frame, this.params);
        let argFrame = frame;
        if (this.name != null) {
            argFrame = null;
        }
        let closureValue = new ClosureValue(this, defaultParamValues, argFrame);
        if (this.name != null) {
            let prevValue = null
            try {
                prevValue = frame.lookup(this.name);
            } catch(er) {
                // can throw runtime exception - when value is not defined
            }
            if (prevValue != null && prevValue.type == TYPE_BUILTIN_FUNCTION) {
                throw new RuntimeException("Can't redefine built-in function " + this.name);
            }
            frame.assign(this.name, closureValue);
        }
        return closureValue;
    }

    _evalDefaultParams(frame) {
        let ret = [];
        for(let i = 0;i < this.params.length; ++i) {
            let param = this.params[i];
            if (param.length > 1) {
                let defValue = param[2].eval(frame);
                ret.push(defValue);
            } else {
                ret.push(null);
            }
        }
        return ret;
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            this.hasYield_ = this.body.hasYield(frame)
        }
        return this.hasYield_;
    }

    show() {
        let ret = "def " + this.name + "("

        ret += showList(this.params, function(arg) {
            let ret = arg[0][0];
            if (arg.length > 1) {
                ret += " = " + arg[2];
            }
            return ret;
        })
        return ret + ") " + this.body.show();
    }
}

function makeFunctionDef(name, params, body, offset) {
    return new AstFunctionDef(name, params, body, offset)
}

class AstFunctionCall extends AstBase {
    constructor(name, expressionList, offset) {
        super(offset);
        this.name = name;
        this.expressionList = expressionList;
        this.funcVal_ = null;
        this.hasYield_ = null;
    }

    eval(frame) {
        let funcVal = this._getFuncVal(frame);
        try {
            if (!funcVal.hasYield(frame)) {
                let args = this._evalCallArguments(frame);
                return evalClosure(funcVal.name, funcVal, args, frame);
            } else {
                let ret = [];

                let args = this._evalCallArguments(frame);
                for (let val of genEvalClosure(funcVal, args, frame)) {
                    ret.push(val);
                }
                return new Value(TYPE_LIST, ret);
            }
        } catch (er) {
            if (er instanceof RuntimeException && !er.isUnwind()) {
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            } else {
                if (showJavascriptStack) {
                    console.log("stack length: " + er.stack);
                }
                er = new RuntimeException("internal error: " + er);
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            }
            throw er;
        }
    }

    *genEval(frame) {
        let funcVal = this._getFuncVal(frame);
        if (funcVal.hasYield(frame)) {
            let args = this._evalCallArguments(frame);
            yield* genEvalClosure(funcVal, args, frame)
        }
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            let funcVal = this._getFuncValSimple(frame);
            this.hasYield_ = (funcVal != null) ? funcVal.hasYield(frame) : false;
        }
        return this.hasYield_;
    }

    _getFuncValSimple(frame) {
        let funcVal = null;
        if (this.name instanceof AstIdentifierRef) {
            if (this.name.refExpr == null) {
                funcVal = this.name.eval(frame);
                funcVal.name = this.name.identifierName;
                //what if identifier name comes from lookup of values?
            }
        } else {
            funcVal = frame.lookup(this.name);
            funcVal.name = this.name;
        }
        return funcVal;

    }

    _getFuncVal(frame) {

        // can't cache the value - it kills calls to callback values passed to functions. shit.
        //
        //if (this.funcVal_ != null) {
        //    return this.funcVal_;
        //}

        let funcVal = null;
        if (this.name instanceof AstIdentifierRef) {
            funcVal = this.name.eval(frame);
            funcVal.name = this.name.identifierName;
            //what if identifier name comes from lookup of values?
        } else {
            funcVal = frame.lookup(this.name);
            funcVal.name = this.name;
        }
        if (funcVal == undefined) {
            throw new RuntimeException("Can't call undefined function " + this.name, this.startOffset);
        }

        if (funcVal.type != TYPE_CLOSURE && funcVal.type != TYPE_BUILTIN_FUNCTION) {
            throw new RuntimeException("variable is not a function/closure, it is a " + typeNameVal(funcVal), this.startOffset);
        }
        this.funcVal_ = funcVal;
        return funcVal;
    }

    _evalCallArguments(frame) {
        let args = [];
        for (let i = 0; i < this.expressionList.length; ++i) {
            let argExpression = this.expressionList[i]; // parameter expression
            let argValue = argExpression.eval(frame); // evaluate parameter expression
            args.push(argValue);
        }
        return args;
    }

    show() {
        return  this.name + " (" + showList(this.expressionList) + ")";
    }

}

function makeFunctionCall(name, expressionList) {
    let expr =  expressionList;
    if (expressionList.length != 0) {
        expr = expressionList[0];
    }

    /// name is either a token ([ <token_name>, <token_offset> ]) or AstIdentifierRef
    if (name instanceof  AstIdentifierRef)
        return new AstFunctionCall(name, expr, name.startOffset);
    return new AstFunctionCall(name[0], expr, name[1]);
}

function isBreakOrContinue(arg) {
    return arg instanceof AstContinueStmt || arg instanceof AstBreakStmt;
}

function isReturnOrYield(arg) {
    return arg instanceof AstReturnStmt || arg instanceof AstYieldStmt;
}

function makeFrame(cmdLine) {
    let frame = new Frame();
    frame.vars = RTLIB;

    if (cmdLine != null) {
        let cmd = frame.lookup("ARGV");
        cmd.val = listToString(cmdLine);
    }

    return frame;

}

function listToString(lst) {
    let stringList = lst.map(function (arg) { return new Value(TYPE_STR, arg); });
    return stringList;

}
function eval(stmt, globFrame = null, cmdLine = null) {
    if (globFrame == null) {
        globFrame = makeFrame();
    }
    return stmt.eval(globFrame)
}

function addSourceToTopLevelStmts(data,ast) {
    let retList = [];
    let recImpl = function(retList, data, ast) {
        if (ast instanceof AstStmtList) {
            for(let i=0; i<ast.statements.length;++i) {
                let stmt = ast.statements[i];
                recImpl(retList, data, stmt);
            }
        } else {
            if ("posRange" in ast) {
                ast.source = data.substring(ast.posRange[0], ast.posRange[1]);
                retList.push(ast);
            }
        }
    }
    recImpl(retList, data, ast);
    return retList;
}


if (typeof(module) == 'object') {
    module.exports = {
        TYPE_BOOL,
        TYPE_NUM,
        TYPE_STR,
        TYPE_REGEX,
        TYPE_LIST,
        TYPE_MAP,
        TYPE_NONE,
        TYPE_CLOSURE,
        Value,
        RuntimeException,
        Frame,
        makeConstValue,
        makeExpression,
        makeUnaryExpression,
        makeLambdaExpression,
        makeIdentifierRef,
        newListCtorExpression,
        newDictListCtorExpression,
        makeStatementList,
        makeTryCatchBlock,
        makeThrowStmt,
        makeAstAssignment,
        makeIfStmt,
        makeWhileStmt,
        makeForStmt,
        makeReturnStmt,
        makeYieldStmt,
        makeUseStmt,
        makeBreakStmt,
        makeContinueStmt,
        makeFunctionDef,
        makeFunctionCall,
        makeFrame,
        eval,
        setLogHook,
        setEvalCallback,
        setCurrentSourceInfo,
        //setForceStopEval,
        setTraceMode,
        setErrorOnExecFail,
        setMaxStackFrames,
        rtValueToJsVal,
        isBreakOrContinue,
        isReturnOrYield,
        addSourceToTopLevelStmts
    }
}
