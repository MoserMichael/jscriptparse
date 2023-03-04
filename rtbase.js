const path=require("node:path");
const prs=require(path.join(__dirname,"prs.js"));

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
            flags = value.suring(lastPos+1);
        }
        let rawRegex = value.suring(firstPos+1, lastPos);
        this.regex = new RegExp(rawRegex, flags);
        this.val = this.regex.toString();
    }

    show() {
        return this.val;
    }
}

let VALUE_NONE=new Value(TYPE_NONE,null);

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

function typeNameVal(val) {
    if (val == null || val.type == null) {
        console.trace("Not a runtime value!" + JSON.stringify(val));
        return "not a runtime value!";
    }
    return mapTypeToName[val.type];
}

function typeNameRaw(val) {
    return mapTypeToName[val];
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
                //resultList.push(it.suring(prefix.length));
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

    if (getTraceMode()) {
        process.stderr.write(getTracePrompt + name + "(" + traceParams + ") {\n");
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

    if (getTraceMode() && retVal.type != TYPE_NONE) {
        process.stderr.write(getTracePrompt + rtValueToJson(retVal) + "\n}");
    }

    return retVal;
}

function _prepareBuiltinFuncArgs(funcVal, frame, args) {

    let traceParams = "";

    if (getTraceMode()) {
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

                if (getTraceMode() && val != null) {
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

        if (getTraceMode()) {
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

        if (getTraceMode()) {
            if (traceParam != "") {
                traceParam += ", ";
            }
            traceParam += paramDef[0][0] + "=" + rtValueToJson(defaultParamValue);
        }
    }
    return [ funcFrame, traceParam];
}

RTLIB={}


function addRTLibFunction(name, value) {
    if (value instanceof bs.BuiltinFunctionValue) {
        RTLIB[name]=value;
        return;
    }
    throw new RuntimeException( "can't add runtime library function " + name + " value must be BuiltinFunctionValue");
}

if (typeof(module) == 'object') {
    module.exports = {
        Frame, 

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
        VALUE_NONE,
        typeNameVal,
        typeNameRaw,
        checkType,
        checkTypeList,
        requireInt,
        value2Bool,
        value2Num,
        value2Str,
        value2Str2,

        value2StrDisp,
        jsValueToRtVal,
        rtValueToJsVal,
        rtValueToJson,

        clonePrimitiveVal,
        cloneAll,

        RuntimeException,

        genEvalClosure,
        evalClosure,
        addRTLibFunction,
        RTLIB
    }
} 
