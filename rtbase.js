
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
    }
} 
