const path=require("node:path");
const fs=require("fs");
const cp=require("node:child_process");
const prs=require(path.join(__dirname,"prs.js"));
const yaml=require("yaml");

let doLogHook = function(msg) { process.stdout.write(msg); }

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

// doesn't seem to make a difference...
let evalForceStop = false;

function setForceStopEval() {
    console.log("force stop");
    evalForceStop = true;
}

function checkEvalForceStop() {
    if (evalForceStop) {
        evalForceStop = false;
        throw new RuntimeException("_forcedStop_", null, true);
    }
}

TYPE_BOOL=0
TYPE_NUM=1
TYPE_STR=2
TYPE_LIST=3
TYPE_MAP=4
TYPE_NONE=5
TYPE_CLOSURE=6
TYPE_BUILTIN_FUNCTION=7

TYPE_FORCE_RETURN=8
TYPE_FORCE_BREAK=10
TYPE_FORCE_CONTINUE=11


mapTypeToName = {
    0 : "Boolean",
    1 : "Number",
    2 : "String",
    3 : "List",
    4 : "Map",
    5 : "None",
    6 : "Closure",
    7 : "BuiltinFunction",
    8 : "Return",
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

let VALUE_NONE=new Value(TYPE_NONE,null);

function typeName(val) {
    return mapTypeToName[val.type];

}
function value2Bool(val) {
    if (val.type == TYPE_BOOL) {
        return val.val;
    } else if (val.type == TYPE_NUM) {
        return val.val != 0;
    } else if (val.type == TYPE_STR) {
        return val.val;
    }
    throw new RuntimeException("can't convert " + typeName(val) + " to boolean");
}

function value2Num(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val;
    } else if (val.type == TYPE_STR) {
        return parseFloat(val.val);
    }
    throw new RuntimeException("can't convert " + typeName(val));
}


function value2Str(val) {
    if (val.type == TYPE_STR) {
        return val.val;
    } else if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val.toString();
    } else if (val.type == TYPE_NONE) {
        return "none";
    } else {
        throw new RuntimeException("can't convert " + typeName(val) + " to string");
    }
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

    if (value.type == TYPE_STR || value.type == TYPE_BOOL || value.type == TYPE_NUM || value.type == TYPE_NONE) {
        return value.val;
    }

    if (value.type == TYPE_CLOSURE || value.type == TYPE_BUILTIN_FUNCTION) {
        return "<function>";
    }

    throw new RuntimeException("Can't convert value " + typeName(value) );
}

function rtValueToJson(val) {
    return JSON.stringify(rtValueToJsVal(val));
}


class RuntimeException  extends Error {
    constructor(message, frameInfo = null, forcedStop = false) {
        super(message);
        this.stackTrace = [];
        if (frameInfo != null) {
            this.addToStack(frameInfo);
        }
        this.forcedStop = forcedStop;
        this.firstChance = true;
    }
    addToStack(frameInfo) {
        this.stackTrace.push(frameInfo);
    }

    showStackTrace() {
        let ret = "Error: " + this.message + "\n";

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
            let prefix = "#(" + fname + nFrame + ") ";
            ret += prefix + entry[0] + "\n";
            ret += (Array(prefix.length-1).join(' ')) + "|" +  Array(entry[1]+1).join(".") + "^\n";
        }
        doLogHook(ret);
        return ret;
    }
}

function copyPrimitiveVal(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_STR || val.type == TYPE_NUM) {
        return new Value(val.type, val.val);
    }
    return val;
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
            if (er instanceof RuntimeException) {
                er.addToStack([funcVal.functionDef.startOffset, funcVal.functionDef.currentSourceInfo]);
            }
            throw er;
        }
        return;
    }

    // builtin functions
    _prepareBuiltinFuncArgs(funcVal, frame, args);

    // function call
    if (funcVal.numParams != args.length) {
        throw new RuntimeException("generator takes " + funcVal.numParams + " parameters, whereas " + args.length +
            "  parameters are passed in call");
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
            [ funcFrame, traceParam ] = _prepareClosureFrame(funcVal, frame, args);
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
            if (er instanceof RuntimeException) {
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
    if (funcVal.numParams != args.length) {
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
            throw new RuntimeException(" no value for parameter " + paramDef[0], [funcVal.startOffset, funcVal.currentSourceInfo]);
        }
        funcFrame.defineVar(paramDef[0][0], defaultParamValue);

        if (traceParam != "") {
            traceParam += ", ";
        }
        traceParam += paramDef[0][0] + "=" + rtValueToJson(defaultParamValue);
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
        status = 1;//e.status;
        out = e.message;
    }
    let val = [ new Value(TYPE_STR, out), new Value(TYPE_NUM, status) ];
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

// the runtime library is defined here
RTLIB={

    // function on scalars or strings
    "find": new BuiltinFunctionValue(`> find("big cat", "big")
0
> find("big cat", "cat")
4
> find("big cat", "bear")
-1

`, 3, function(arg) {
        let hay = value2Str(arg[0]);
        let needle = value2Str(arg[1]);
        let index = 0;

        if (arg[2] != null) {
            index = parseInt(value2Num(arg[2]));
        }
        let res = hay.indexOf(needle, index)
        return new Value(TYPE_NUM, res);
    }, [null, null, null]),
    "mid": new BuiltinFunctionValue(`> mid("I am me", 2)
"am me"
> mid("I am me", 2, 4)
"am"`, 3, function(arg) {
        let sval = value2Str(arg[0]);
        let from = parseInt(value2Num(arg[1]), 10);
        let to = null;

        if (arg[2] != null) {
            to = parseInt(value2Num(arg[2]), 10);
        }

        if (to == null) {
            sval = sval.substring(from)
        } else {
            sval = sval.substring(from, to);
        }

        return new Value(TYPE_STR, sval);
    }, [null, null, null]),
    "lc": new BuiltinFunctionValue(`> lc("BIG little")
"big little"`, 1, function(arg) {
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val.toLowerCase());
    }),
    "uc": new BuiltinFunctionValue(`> uc("BIG little")
"BIG LITTLE"`, 1, function(arg) {
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val.toUpperCase());
    }),
    "reverse": new BuiltinFunctionValue(`> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"`, 1, function(arg) {
        if (arg[0].type == TYPE_LIST) {
            return new Value(TYPE_LIST, arg[0].val.reverse());
        }
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val.split("").reverse().join(""));
    }),
    "split": new BuiltinFunctionValue(`> split("first line\\nsecond line")
["first line","second line"]
> split("a,b,c", ",")
["a","b","c"]
> split("a:b:c", ":")
["a","b","c"]
> split("a:b:c", "")
["a",":","b",":","c"]`, 2,function *(arg, frame) {
        let hay = value2Str(arg[0]);
        let delim = "\n";
        if (arg[1] != null) {
            delim = value2Str(arg[1]);
        }
        for(let n of hay.split(delim)) {
            yield new Value(TYPE_STR, n);
        }
    }, [null, null], true),
    "str": new BuiltinFunctionValue(`> str(123)
"123"
> str("abc")
"abc"`, 1, function(arg) {
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val);
    }),
    "repeat" : new BuiltinFunctionValue(`> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"`, 2, function(arg) {
        let val = value2Str(arg[0]);
        let rep = value2Num(arg[1]);
        return new Value(TYPE_STR, val.repeat(rep));
    }),

// Numeric functions
    "int": new BuiltinFunctionValue(`> int("123")
123
> int("123.5")
123
> int(123.5)
123
> int(123)
123`, 2, function(arg) {
        if (arg[0].type != TYPE_STR && arg[0].type != TYPE_NUM) {
            throw new RuntimeException("first argument must be a string or number, is " + typeName(arg[0]));
        }
        if (arg[1].type != TYPE_NUM) {
            throw new RuntimeException("second argument must be a number, is " + typeName(arg[1]));
        }
        let res = parseInt(arg[0].val, arg[1].val);

        if (res == null) {
            throw new RuntimeException("Can't convert " + arg[0].val + " to integer with base " + parseInt(arg[1].val));
        }
        return new Value(TYPE_NUM, res);
    }, [0, new Value(TYPE_NUM, 10)]),
    "max" : new BuiltinFunctionValue(`> max(3,4)
4
> max(4,3)
4`, 2, function(arg) {
        let num = value2Num(arg[0]);
        let num2 = value2Num(arg[1]);
        let res = num;
        if (num2 > num) {
            res = num2;
        }
        return new Value(TYPE_NUM, res);
    }),
    "min" : new BuiltinFunctionValue(`> min(4,3)
3
> min(3,4)
3`, 2, function(arg) {
        let num = value2Num(arg[0]);
        let num2 = value2Num(arg[1]);
        let res = num;
        if (num2 < num) {
            res = num2;
        }
        return new Value(TYPE_NUM, res);
    }),
    "abs" : new BuiltinFunctionValue(`> abs(-3)
3
> abs(3)
3`, 1, function(arg) {
        let num = value2Num(arg[0]);
        if (num < 0) {
            num = -num;
        }
        return new Value(TYPE_NUM, num);
    }),
    "sqrt" : new BuiltinFunctionValue(`> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095`, 1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.sqrt(num));
    }),
    "sin" : new BuiltinFunctionValue(`returns the sine of a number in radians
> sin(mathconst['pi']/2)
1`, 1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.sin(num));
    }),
    "cos" : new BuiltinFunctionValue(`returns the cosine of a number in radians
> cos(mathconst['pi'])
-1`, 1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.cos(num));
    }),
    "tan" : new BuiltinFunctionValue(`returns the tangent of a number in radians`, 1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.tan(num));
    }),
    "atan" : new BuiltinFunctionValue(`returns the inverse tangent (in radians) of a number`, 1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.atan(num));
    }),
    "pow" : new BuiltinFunctionValue(`> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16`, 2, function(arg) {
        let pow = value2Num(arg[0]);
        let exp = value2Num(arg[1]);
        return new Value(TYPE_NUM, Math.pow(pow,exp));
    }),
    "random" : new BuiltinFunctionValue(`# returns random number with value between 0 and 1

> random()
0.8424952895811049
`, 0, function(arg) {
        return new Value(TYPE_NUM, Math.random());
    }),

    // Input and output functions
    "print" : new BuiltinFunctionValue("# prints argument value to console", 1, function(arg) {
        let msg = value2Str(arg[0]);
        doLogHook(msg)
    }),
    "println" : new BuiltinFunctionValue("# prints argument value to console, followed by newline", 1, function(arg) {
        let msg = value2Str(arg[0]);
        doLogHook(msg + "\n")
    }),
    "readFile" : new BuiltinFunctionValue(`
# read text file and return string

> fileText = readFile("fileName.txt")    
    `, 1, function(arg) {
        let fname = value2Str(arg[0]);
        try {
            let res = fs.readFileSync(fname, {encoding: 'utf8', flag: 'r'});
            return new Value(TYPE_STR,res);
        } catch(err) {
            throw new RuntimeException("Can't read file: " + fname + " error: " + err);
        };
    }),
    "writeFile" : new BuiltinFunctionValue(`
# write string parameter into text file

> writeFile("fileName.txt","fileContent")

# append file

> writeFile("fileName.txt","add this after end of file", "append")
   
    `, 3, function(arg) {
        let fname = value2Str(arg[0]);
        let data = value2Str(arg[1]);
        let append = false;
        if (arg[2] != null ) {
            let mode = value2Str(arg[2]);
            if (mode == "append") {
                append = true;
            } else if (mode == "write") {
                append = false;
            } else {
                throw new RuntimeException("third argument is either 'append' or 'write'");
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
    // function for arrays
    "len" : new BuiltinFunctionValue(`> len("abc")
3
> len([1,2,3])
3`, 1, function(arg) {
        if (arg[0].type == TYPE_STR || arg[0].type == TYPE_LIST) {
            return new Value(TYPE_NUM, arg[0].val.length);
        }
        throw new RuntimeException("string or list argument required");
    }),
    "join": new BuiltinFunctionValue(`> join(["a: ",1," b: ", true])
"a: 1 b: true"`, 2, function(arg) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("list argument required. is: " + typeName(arg[0]));
        }

        let delim ="";
        if (arg[1] != null) {
            delim = value2Str(arg[1]);
        }
        return new Value(TYPE_STR, arg[0].val.map(value2StrDisp).join(delim));
    }, [null, null]),
    "map": new BuiltinFunctionValue(`> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

a={ 'Ernie': 3, 'Bert': 4, 'Cookie-Monster' : 5, 'GraphCount': 100 }
map(a,def(k,v) { "key: {k} age: {v}" })
> ["key: Ernie age: 3","key: Bert age: 4","key: Cookie-Monster age: 5","key: GraphCount age: 100"]
`, 2, function(arg, frame) {
        if (arg[0].type != TYPE_LIST && arg[0].type != TYPE_MAP) {
            throw new RuntimeException("first argument: list or map argument required. is: " + typeName(arg[0]));
        }
        if (arg[1].type != TYPE_CLOSURE && arg[1].type != TYPE_BUILTIN_FUNCTION) {
            throw new RuntimeException("second argument: function argument required. is: " + typeName(arg[1]));
        }

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
    "mapIndex": new BuiltinFunctionValue(`> mapIndex([3,4,5,6],def(x,y) [2*x, y])
[[6,0],[8,1],[10,2],[12,3]]`, 2, function(arg, frame) {
        if (arg[0].type !== TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + typeName(arg[0]));
        }
        if (arg[1].type != TYPE_CLOSURE && arg[1].type != TYPE_BUILTIN_FUNCTION) {
            throw new RuntimeException("second argument: function argument required. is: " + typeName(arg[1]));
        }
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
    "reduce": new BuiltinFunctionValue(`> reduce([1,2,3], def (x,y) x+y, 0)
6

# same as:

> (((0+1)+2)+3)
6

> reduce([1,2,3], def (x,y) x+y, 2)
8

# same as:
 
> (((0+1)+2)+3)
6
`, 3, function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + typeName(arg[0]));
        }
        if (arg[1].type != TYPE_CLOSURE) {
            throw new RuntimeException("second argument: function argument required. is: " + typeName(arg[1]));
        }
        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [rVal, argList.val[i]];
            rVal = evalClosure("", funVal, arg, frame);
        }
        return rVal;
    }),

    "reduceFromEnd": new BuiltinFunctionValue(`> def div(a,b) a/b

> reduceFromEnd([4,8,32], div, 1024)
1

same as:

> (((1024/32) / 8) / 4)
1`, 3, function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + typeName(arg[0]));
        }
        if (arg[1].type != TYPE_CLOSURE) {
            throw new RuntimeException("second argument: function argument required. is: " + typeName(arg[1]));
        }
        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=argList.val.length-1; i>=0; i--) {
            let arg = [rVal, argList.val[i]];
            rVal = evalClosure("", funVal, arg, frame);
        }
        return rVal;
    }),

    "pop": new BuiltinFunctionValue(`> a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]`, 1,function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + typeName(arg[0]));
        }
        if (arg[0].val.length == 0) {
            throw new RuntimeException("Can't pop from an empty list");
        }
        return arg[0].val.pop(arg[1]);
    }),
    "push": new BuiltinFunctionValue(`> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]`, 2, function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + typeName(arg[0]));
        }
        arg[0].val.push(arg[1]);
        return arg[0];
    }),
    "joinl": new BuiltinFunctionValue(`> joinl([1,2],[3,4])
[1,2,3,4]`, 2,function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + typeName(arg[0]));
        }
        if (arg[1].type != TYPE_LIST) {
            throw new RuntimeException("second argument: list argument required. is: " + typeName(arg[1]));
        }
        let lst = arg[0].val.concat(arg[1].val);
        return new Value(TYPE_LIST, lst);
    }),
    "sort": new BuiltinFunctionValue(`> sort([3,1,4,2,5])
[1,2,3,4,5]
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
            if (funVal.type != TYPE_CLOSURE && funVal.type != TYPE_BUILTIN_FUNCTION) {
                throw new RuntimeException("second argument must be a function. is: " + typeName(funVal));
            }
        }

        if (arg[0].type == TYPE_LIST) {

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
        }
        throw new RuntimeException("list argument required");
    }, [null, null]),

    // functions for maps/hashes
    "each" : new BuiltinFunctionValue( `
> each({"a":1,"b":2,"c":3})
[["a",1],["b",2],["c",3]]

> pairs = each({"a":1,"b":2,"c":3})
> map( pairs, def (arg) [ arg[0]+arg[0], arg[1]*arg[1] ] )
[["aa",1],["bb",4],["cc",9]]    
`, 1, function*(arg) {
        if (arg[0].type != TYPE_MAP && arg[0].type != TYPE_LIST) {
            throw new RuntimeException("map or list expected. got " + typeName(arg[0]));
        }
        yield* genValues(arg[0]);
    },null, true),
    "keys": new BuiltinFunctionValue(`> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]`, 1, function(arg) {
        if (arg[0].type == TYPE_MAP) {
            let keys = Object.keys(arg[0].val);
            let rt = [];
            for(let i=0; i<keys.length;++i) {
                rt.push( new Value(TYPE_STR, keys[i] ) );
            }
            return new Value(TYPE_LIST, rt);
        }
        throw new RuntimeException("map argument required");
    }),

    // functions for working with json
    "parseJsonString": new BuiltinFunctionValue(`> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]`, 1,function(arg, frame) {
        if(arg[0].type != TYPE_STR) {
            throw new RuntimeException("first argument: string argument required. is: " + typeName(arg[0]));
        }
        let val = JSON.parse(arg[0].val);
        let rt = jsValueToRtVal(val);
        return rt;
    }),
    "toJsonString": new BuiltinFunctionValue(`> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\\"name\\":\\"Pooh\\",\\"family\\":\\"Bear\\",\\"likes\\":[\\"Honey\\",\\"Songs\\",\\"Friends\\"]}"`, 1,function(arg, frame) {
        return new Value(TYPE_STR, rtValueToJson(arg[0]));
    }),

    //functions for working with yaml
    "parseYamlString": new BuiltinFunctionValue(`
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
        if(arg[0].type != TYPE_STR) {
            throw new RuntimeException("first argument: string argument required. is: " + typeName(arg[0]));
        }
        let val = yaml.parse(arg[0].val);
        let rt = jsValueToRtVal(val);
        return rt;
    }),
    "toYamlString": new BuiltinFunctionValue(`
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
    "system": new BuiltinFunctionValue(`> a=system("ls /")
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
    "sleep": new BuiltinFunctionValue(`    
# sleep for three seconds    
sleep(3)
`, 1,function(arg, frame) {
        let num = value2Num(arg[0]) * 1000;

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
            cmd = arg[0].val.map(value2Str).join("");
        } else {
            throw new RuntimeException("list parameter required");
        }
        return _system(cmd, frame);
    }),

    // control flow
    "exit": new BuiltinFunctionValue(`# exit() - exit program with status 0 (success)\n# exit(1) - exit program with status 1 (failure)`,
        1,function(arg, frame) {
        let num = 0;
        if (arg[0] != null) {
            num = value2Num(arg[0]);
        }
        process.exit(num);
    }),

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
        if (arg[1].type == TYPE_MAP) {
           // check if map has first argument as key
           let key = value2Str(arg[0]);
           return new Value(TYPE_BOOL, key in arg[1].val);
        }
        if (arg[1].type == TYPE_LIST) {
            return new Value(TYPE_BOOL, arg[1].val.some( function(a) {
                return arg[0].type == a.type && arg[0].val == a.val;
            }));
        }
        throw new RuntimeException("second argument must be list or map, is: " + typeName(arg[1]));
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
                console.log(typeName(arg[0]));
            }
        }
        return VALUE_NONE
    }, [null]),

    "type": new BuiltinFunctionValue(`> type(1)
"Number"
> type("abc")
"String"
> type([1,2,3])
"List"
> type({"first": 1, "second": 2})
"Map"
> type(def(x) 1+x)
"Closure"`, 1,function(arg, frame) {
        return new Value(TYPE_STR, typeName(arg[0]));
    }),

    "setTrace": new BuiltinFunctionValue(`
# trace the running of a program (for debugging)
setTrace(true)

# stop tracing
setTrace(false)
`, 1,function(arg, frame) {
        traceMode = value2Bool(arg[0]);
    }),


    // generators
    "range": new BuiltinFunctionValue(`> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3`, 3,function *(arg, frame) {
        let from = value2Num(arg[0]);
        let to = value2Num(arg[1]);
        let step = 1;
        if (arg[2] != null) {
            step = value2Num(arg[2]);
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
            date = new Date(value2Num(arg[0]) * 1000);
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


    "mathconst" : new Value(TYPE_MAP, {
        pi: new Value(TYPE_NUM, Math.PI),
        e: new Value(TYPE_NUM, Math.E),
        ln10: new Value(TYPE_NUM, Math.LN10),
        ln2: new Value(TYPE_NUM, Math.LN2),
        log10e: new Value(TYPE_NUM, Math.LOG10E),
        log2e: new Value(TYPE_NUM, Math.LOG2E),
        sqrt1_2: new Value(TYPE_NUM, Math.SQRT1_2),
        sqrt2: new Value(TYPE_NUM, Math.SQRT2),
    }, `# map of mathematical constant

# the number PI
    
> mathconst['pi']
3.141592653589793

# the Euler constant 

> mathconst['e']
2.718281828459045

# The square root of two

> mathconst["sqrt2"]
1.4142135623730951

# Other values: 
mathconst["sqrt1_2"] # - square root of one half.
mathconst["log2e"]   # - base e logarithm of 2 
mathconst["log10e"]  # - base e logarithm of 10
mathconst["log2e"]   # - base 2 logarithm of e
mathconst["log10e"]  # - base 10 logarithm of e    
    `),

    "ARGV" : new Value(TYPE_LIST,
        process.argv.map(x => x).reduce(
            (prev,current)=>{
                prev.push(new Value(TYPE_STR, current));
                return prev
            } , []),
        "# command line arguments (array)"
    ),

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
            this.vars[name] = copyPrimitiveVal(value);
        }
    }

    _assign(name, value) {
        if (name in this.vars) {
            this.vars[name] = copyPrimitiveVal(value);
            return true;
        }
        if (this.parentFrame != null) {
            return this.parentFrame._assign(name, value);
        }
        return false;
    }

    defineVar(name, value) {
       this.vars[name] = copyPrimitiveVal(value);
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
    }

    eval(frame) {
        let val = VALUE_NONE;

        if (traceMode && this.skipTrace) {
            process.stderr.write(tracePrompt + "{\n");
        }

        for(let i=0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            checkEvalForceStop();

            val = stmt.eval(frame);
            //console.log("eval obj: " + stmt.constructor.name + " res: " + JSON.stringify(val));
            if (val.type >= TYPE_FORCE_RETURN) {
                if (val.type == TYPE_FORCE_CONTINUE) {
                    val = VALUE_NONE;
                }
                break;
            }
        }

        if (traceMode && !this.skipTrace) {
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
                if (val.type == TYPE_FORCE_CONTINUE) {
                    return VALUE_NONE;
                }
                return val;
            }
        }
    }

    hasYield(frame) {

        for (let i = 0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];
            if (stmt.hasYield(frame)) {
                return true;
            }
        }

        return false;
    }

    show() {
        return showList(this.statements);
    }
}

function makeStatementList(stmtList, offset) {
    return new AstStmtList(stmtList, offset);
}

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
        throw new RuntimeException(op + " not allowed between " + typeName(rhs) + " and " + typeName(lhs))
    }
}

MAP_OP_TO_FUNC={
    "and" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Bool(lhs) && value2Bool(rhs));
    },
    "or" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Bool(lhs) || value2Bool(rhs));
    },
    "<" : function(lhs,rhs) {
        checkMixedType("<", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val < rhs.val); // javascript takes care of it, does it?
    },
    ">" : function(lhs,rhs) {
        checkMixedType(">", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val > rhs.val);
    },
    "<=" : function(lhs,rhs) {
        checkMixedType("<=", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val <= rhs.val);
    },
    ">=" : function(lhs,rhs) {
        checkMixedType(">=", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val >= rhs.val);
    },
    "==" : function(lhs,rhs) {
        checkMixedType("==", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val == rhs.val);
    },
    "!=" : function(lhs,rhs) {
        checkMixedType("!=", lhs, rhs);
        return new Value(TYPE_BOOL, lhs.val != rhs.val);
    },
    "+" : function(lhs,rhs) {
        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't add " + typeName(lhs) + " to " + typeName(rhs));
        }
        return new Value(lhs.type, lhs.val + rhs.val);
    },
    "-" : function(lhs,rhs) {
        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't subtract " + typeName(lhs) + " to " + typeName(rhs) );
        }
        return new Value(lhs.type, lhs.val - rhs.val);
    },
    "*" : function(lhs,rhs) {
        return new Value(TYPE_NUM, value2Num(lhs) * value2Num(rhs));
    },
    "/" : function(lhs,rhs) {
        let rhsVal = value2Num(rhs);
        if (rhsVal == 0) {
            // javascript allows to divide by zero, amazing.
            throw new RuntimeException("Can't divide by zero");
        }
        return new Value(TYPE_NUM,value2Num(lhs) / rhsVal);
    },
    "%" : function(lhs,rhs) {
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
            let lhsVal = this.lhs.eval(frame);
            let rhsVal = this.rhs.eval(frame);
            return this.fun(lhsVal, rhsVal);
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

function makeExpression(exprList) {
    if (exprList.length == 1) {
        return exprList[0];
    }
    let prevExpression = null;
    let pos = exprList.length -1;

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
            throw new RuntimeException("Can't access expression of type " + typeName(value) + " by index");
        }
        let expr = refExpr[i];
        let indexValue = expr.eval(frame);

        value = value.val[ indexValue.val ];
        if (value == null) {
            throw new RuntimeException("Can't lookup index " + indexValue.val)
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
        let value = frame.lookup(this.identifierName);
        if (this.refExpr != null) {
            value = lookupIndex(frame, value, this.refExpr)
        }
        //console.log("identifier ref: name: " + this.identifierName + " res: " + JSON.stringify(value));
        return value;
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
        let singleLhs = lhs[0]
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
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            if (clause[1].hasYield(frame)) {
                return true;
            }
        }
        if (this.elseStmtList) {
            return this.elseStmtList.hasYield(frame);
        }
        return false;
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

            checkEvalForceStop();

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
            let defValue = param[2].eval(frame);
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
    }

    eval(frame) {
        let defaultParamValues = _evalDefaultParams(frame, this.params);
        let argFrame = frame;
        if (this.name != null) {
            argFrame = null;
        }
        let closureValue = new ClosureValue(this, defaultParamValues, argFrame);
        if (this.name != null) {
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
        return this.body.hasYield(frame)
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
    }

    eval(frame) {
        checkEvalForceStop();

        let funcVal = this._getFuncVal(frame);
        try {
            if (!funcVal.hasYield(frame)) {
                let args = this._evalCallArguments(frame);
                return evalClosure(this.name, funcVal, args, frame);
            } else {
                let ret = [];

                let args = this._evalCallArguments(frame);
                for (let val of genEvalClosure(funcVal, args, frame)) {
                    ret.push(val);
                }
                return new Value(TYPE_LIST, ret);
            }
        } catch (er) {
            if (er instanceof RuntimeException) {
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
        let funcVal = this._getFuncVal(frame);
        return funcVal.hasYield(frame);
    }

    _getFuncVal(frame) {
        if (this.funcVal_ != null) {
            return this.funcVal_;
        }
        let funcVal = frame.lookup(this.name);
        if (funcVal == undefined) {
            throw new RuntimeException("Can't call undefined function " + this.name, this.startOffset);
        }

        if (funcVal.type != TYPE_CLOSURE && funcVal.type != TYPE_BUILTIN_FUNCTION) {
            throw new RuntimeException("variable is not a function/closure, it is a " + typeName(funcVal), this.startOffset);
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
    return new AstFunctionCall(name[0], expr, name[1]);
}

function isBreakOrContinue(arg) {
    return arg instanceof AstContinueStmt || arg instanceof AstBreakStmt;
}

function isReturnOrYield(arg) {
    return arg instanceof AstReturnStmt || arg instanceof AstYieldStmt;
}

function makeFrame() {
    let frame = new Frame();
    frame.vars = RTLIB;
    return frame;

}


function eval(stmt, globFrame = null) {
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
        setCurrentSourceInfo,
        setForceStopEval,
        setTraceMode,
        rtValueToJsVal,
        isBreakOrContinue,
        isReturnOrYield,
        addSourceToTopLevelStmts
    }
}
