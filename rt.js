const path=require("node:path");
const fs=require("fs");
const cp=require("node:child_process");
const prs=require(path.join(__dirname,"prs.js"));
//const {TYPE_STR} = require("./rt");

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

TYPE_BOOL=0
TYPE_NUM=1
TYPE_STR=2
TYPE_LIST=3
TYPE_MAP=4
TYPE_NONE=5
TYPE_CLOSURE=6
TYPE_BUILTIN_FUNCTION=7

TYPE_FORCE_RETURN=8
TYPE_FORCE_BREAK=9


mapTypeToName = {
    0 : "Boolean",
    1 : "Number",
    2 : "String",
    3 : "List",
    4 : "Map",
    5 : "None",
    6 : "Closure",
    7 : "BuiltinFunction",
    8 : "ForceReturn",
    9 : "Break"
}

class ClosureValue {
    // needs the function definition and the frame of the current function (for lookup of captured vars)
    constructor(functionDef, defaultParamValues, frame) {
        this.type = TYPE_CLOSURE;
        this.functionDef = functionDef;
        this.defaultParamValues = defaultParamValues; // default params are set when function/closure is evaluated.
        this.frame = frame;
    }
}

class BuiltinFunctionValue {
    constructor(numParams, funcImpl, defaultParamValues = []) {
        this.type = TYPE_BUILTIN_FUNCTION;
        this.numParams = numParams;
        this.funcImpl = funcImpl;
        this.defaultParamValues = defaultParamValues;
    }
}

class Value {
    constructor(type, val) {
        this.type = type;
        this.val = val;
    }

    show() { return "(" + mapTypeToName[ this.type.toString() ] + " " + this.val +  ")"; }
}

VALUE_NONE=new Value(TYPE_NONE,null);

function value2Bool(val) {
    if (val.type == TYPE_BOOL) {
        return val.val;
    } else if (val.type == TYPE_NUM) {
        return val.val != 0;
    } else if (val.type == TYPE_STR) {
        return val.val == "true";
    }
    throw new RuntimeException("can't convert " + mapTypeToName[val.type.toString()] + " to boolean");
}

function value2Num(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val;
    } else if (val.type == TYPE_STR) {
        return parseFloat(val.val);
    }
    throw new RuntimeException("can't convert " + mapTypeToName[val.type.toString]);
}

function value2Str(val) {
    if (val.type == TYPE_STR) {
        return val.val;
    } else if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val.toString();
    } else if (val.type == TYPE_NONE) {
        return "none";
    } else {
        throw new RuntimeException("can't convert " + mapTypeToName[val.type.toString] + " to string");
    }
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

    if (value.type == TYPE_STR || value.type == TYPE_BOOL || value.type == TYPE_NUM) {
        return value.val;
    }
    throw new RuntimeException("Can't convert value " + mapTypeToName[ value.type ] );
}


class RuntimeException  extends Error {
    constructor(message, frameInfo = null) {
        super(message);
        this.stackTrace = [];
        if (frameInfo != null) {
            this.addToStack(frameInfo);
        }
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
            ret += (Array(prefix.length+2).join(' ')) +  Array(entry[1]).join(".") + "^\n";
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

function evalClosure(funcVal, args, frame) {
    if (funcVal.type == TYPE_CLOSURE) {
        if (funcVal.frame != null) {
            return _evalClosure(funcVal, funcVal.frame, args);
        }
        return _evalClosure(funcVal, frame, args);
    }
    return _evalBuiltinFunc(funcVal, frame, args);
}

function _evalBuiltinFunc(funcVal, frame, args) {
    if (funcVal.defaultParamValues != null) {
        // try to add omitted params with default values;
        if (args.length < funcVal.defaultParamValues.length) {
            for(let i = args.length;i<funcVal.defaultParamValues.length;++i) {
                args.push( funcVal.defaultParamValues[i] );
            }
        }
    }

    if (funcVal.numParams != args.length) {
        throw new RuntimeException("function takes " + funcVal.numParams + " parameters, whereas " + args.length +
            "  parameters are passed in call");
    }
    let retVal = funcVal.funcImpl(args);
    if (retVal == undefined) {
        return VALUE_NONE;
    }
    return retVal;
}

function _evalClosure(funcVal, frame, args) {
    let functionDef = funcVal.functionDef;
    let funcFrame = new Frame(frame);

    if (args.length > functionDef.params.length) {
        throw new RuntimeException("function takes " + functionDef.params.length + " params, but " + args.length + " were given", [funcVal.startOffset, funcVal.currentSourceInfo]);
    }

    // define all provided parameters in the new function frmae
    let i = 0;
    for (; i < args.length; ++i) {
        let argValue = args[i];
        let paramDef = functionDef.params[i]; // name of parameter
        funcFrame.defineVar(paramDef[0][0], argValue);
    }

    // provide values for arguments with default values
    for (; i < functionDef.params.length; ++i) {
        let paramDef = functionDef.params[i]; // name of parameter

        let defaultParamValue = funcVal.defaultParamValues[i];
        if (defaultParamValue == null) {
            throw new RuntimeException(" no value for parameter " + paramDef[0], [funcVal.startOffset, funcVal.currentSourceInfo]);
        }
        funcFrame.defineVar(paramDef[0][0], defaultParamValue);
    }

    try {
        // frame is ready, evaluate the statement list
        let rVal = functionDef.body.eval(funcFrame);

        if (rVal.type == TYPE_FORCE_RETURN) {
            return rVal.val;
        }
        return VALUE_NONE
    } catch(er) {
        if (er instanceof RuntimeException) {
            er.addToStack([functionDef.startOffset, functionDef.currentSourceInfo]);
        }
        throw er;
    }
}

function _system(cmd) {
    let status = 0;
    let out = "";
    try {
        out = cp.execSync(cmd).toString();
    } catch(e) {
        status = 1;//e.status;
    }
    let val = [ new Value(TYPE_STR, out), new Value(TYPE_NUM, status) ];
    return new Value(TYPE_LIST, val);
}

// the runtime library is defined here
RTLIB={

    // function on scalars or strings
    "find": new BuiltinFunctionValue(3, function(arg) {
        let hay = value2Str(arg[0]);
        let needle = value2Str(arg[1]);
        let index = 0;
        if (arg[2] != null) {
            index = parseInt(value2Num(arg[2]));
        }

        let res = hay.indexOf(needle, index)
        return new Value(TYPE_NUM, res);
    }, [null, null, null]),
    "mid": new BuiltinFunctionValue(3, function(arg) {
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
    "lc": new BuiltinFunctionValue(1, function(arg) {
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val.toLowerCase());
    }),
    "uc": new BuiltinFunctionValue(1, function(arg) {
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val.toUpperCase());
    }),
    "reverse": new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_LIST) {
            return new Value(TYPE_LIST, arg[0].val.reverse());
        }
        let val = value2Str(arg[0]);
        return new Value(TYPE_STR, val.split("").reverse().join(""));
    }),

    // Numeric functions
    "max" : new BuiltinFunctionValue(2, function(arg) {
        let num = value2Num(arg[0]);
        let num2 = value2Num(arg[1]);
        let res = num;
        if (num2 > num) {
            res = num2;
        }
        return new Value(TYPE_NUM, res);
    }),
    "min" : new BuiltinFunctionValue(2, function(arg) {
        let num = value2Num(arg[0]);
        let num2 = value2Num(arg[1]);
        let res = num;
        if (num2 < num) {
            res = num2;
        }
        return new Value(TYPE_NUM, res);
    }),
    "abs" : new BuiltinFunctionValue(1, function(arg) {
        let num = value2Num(arg[0]);
        if (num < 0) {
            num = -num;
        }
        return new Value(TYPE_NUM, num);
    }),
    "sqrt" : new BuiltinFunctionValue(1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.sqrt(num));
    }),
    "sin" : new BuiltinFunctionValue(1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.sin(num));
    }),
    "cos" : new BuiltinFunctionValue(1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.cos(num));
    }),
    "tan" : new BuiltinFunctionValue(1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.tan(num));
    }),
    "atan" : new BuiltinFunctionValue(1, function(arg) {
        let num = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.atan(num));
    }),
    "pow" : new BuiltinFunctionValue(2, function(arg) {
        let pow = value2Num(arg[0]);
        let exp = value2Num(arg[0]);
        return new Value(TYPE_NUM, Math.pow(pow,exp));
    }),
    "random" : new BuiltinFunctionValue(0, function(arg) {
        return new Value(TYPE_NUM, Math.random());
    }),

    // Input and output functions
    "print" : new BuiltinFunctionValue(1, function(arg) {
        let msg = value2Str(arg[0]);
        doLogHook(msg)
    }),
    "println" : new BuiltinFunctionValue(1, function(arg) {
        let msg = value2Str(arg[0]);
        doLogHook(msg + "\n")
    }),

    // function for arrays
    "len" : new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_STR && arg[0].type == TYPE_LIST) {
            return new Value(TYPE_NUM, arg[0].val.length);
        }
        throw new RuntimeException("string or list argument required");
    }),
    "join": new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_LIST) {
            return new Value(TYPE_STR, arg[0].val.map(value2Str).join(""));
        }
        throw new RuntimeException("list argument required. is: " + mapTypeToName[ arg[0].type ]);
    }),
    "map": new BuiltinFunctionValue(2, function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + mapTypeToName[arg[0].type]);
        }
        if (arg[1].type != TYPE_CLOSURE) {
            throw new RuntimeException("second argument: function argument required. is: " + mapTypeToName[arg[0].type]);
        }
        let ret = [];
        let argList = arg[0];
        let funVal = arg[1];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [ argList.val[i] ];
            let mapVal = evalClosure(funVal, arg, frame);
            ret.push(mapVal);
        }
        return new Value(TYPE_LIST, ret);
    }),
    "reduce": new BuiltinFunctionValue(3, function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + mapTypeToName[arg[0].type]);
        }
        if (arg[1].type != TYPE_CLOSURE) {
            throw new RuntimeException("second argument: function argument required. is: " + mapTypeToName[arg[0].type]);
        }
        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [rVal, argList.val[i]];
            rVal = evalClosure(funVal, arg, frame);
        }
        return rVal;
    }),
    "pop": new BuiltinFunctionValue(1,function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + mapTypeToName[arg[0].type]);
        }
        if (arg[0].val.length == 0) {
            throw new RuntimeException("Can't pop from an empty list");
        }
        return arg[0].val.pop(arg[1]);
    }),
    "push": new BuiltinFunctionValue(2, function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + mapTypeToName[arg[0].type]);
        }
        arg[0].val.push(arg[1]);
        return arg[0];
    }),
    "joinl": new BuiltinFunctionValue(2,function(arg, frame) {
        if (arg[0].type != TYPE_LIST) {
            throw new RuntimeException("first argument: list argument required. is: " + mapTypeToName[arg[0].type]);
        }
        if (arg[1].type != TYPE_LIST) {
            throw new RuntimeException("second argument: list argument required. is: " + mapTypeToName[arg[1].type]);
        }
        let lst = arg[0].val.join(arg[1].val);
        return new Value(TYPE_LIST, lst);
    }),

    // functions for maps/hashes
    "keys": new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_MAP) {
            let keys = Object.keys(arg[0].val);
            let rt = [];
            for(let i=0; i<keys.length;++i) {
                rt.push( new Value(TYPE_STR, str(rt[i]) ));
            }
            return new Value(TYPE_LIST, rt);
        }
        throw new RuntimeException("map argument required");
    }),

    // functions for working with json
    "parseJsonString": new BuiltinFunctionValue(1,function(arg, frame) {
        if(arg[0].type != TYPE_STR) {
            throw new RuntimeException("first argument: string argument required. is: " + mapTypeToName[arg[0].type]);
        }
        let val = JSON.parse(arg[0].val);
        let rt = jsValueToRtVal(val);
        console.log(JSON.stringify(rt));
        return rt;
    }),
    "toJsonString": new BuiltinFunctionValue(1,function(arg, frame) {
        let jsVal = rtValueToJsVal(arg[0]);
        return new Value(TYPE_STR, JSON.stringify(jsVal));
    }),

    // functions for working with processes
    "system": new BuiltinFunctionValue(1,function(arg, frame) {

        let cmd ="";

        if (arg[0].type == TYPE_STR) {
            cmd = arg[0].val;
        } else {
            if (arg[0].type == TYPE_LIST) {
                cmd = arg[0].val.map(value2Str).join(" ");
            }
        }
        return _system(cmd);
    }),

    "system#backtick": new BuiltinFunctionValue(1,function(arg, frame) {

        let cmd ="";

        if (arg[0].type == TYPE_LIST) {
           cmd = arg[0].val.map(value2Str).join("");
        } else {
            throw new RuntimeException("list parameter required");
        }
        return _system(cmd);
    })
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
        throw new RuntimeException("undefined variable: " + name );
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
}

function showList(lst, dsp = null) {
    if (lst == null) {
        return "(null-list)";
    }
    let retVal = "";
    for (let i = 0; i < lst.length; ++i) {
        if (i > 0) {
            retVal += ", ";
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
    }
}

class AstStmtList extends AstBase {
    constructor(statements, offset) {
        super(offset)
        this.statements = statements;
    }

    eval(frame) {
        let val = VALUE_NONE;
        for(let i=0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            val = stmt.eval(frame);
            //console.log("eval obj: " + stmt.constructor.name + " res: " + JSON.stringify(val));
            if (val.type >= TYPE_FORCE_RETURN) {
                return val;
            }
        }
        return val;
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
        return "(const " + this.value.show() + ")"
    }
}

function makeConstValue(type, value) {
    let val = value[0];
    if (val == "none") {
        val = null;
    }
    return new AstConstValue(new Value(type, value[0]), value[1]);
}



MAP_OP_TO_FUNC={
    "and" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Bool(lhs) && value2Bool(rhs));
    },
    "or" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Bool(lhs) || value2Bool(rhs));
    },
    "<" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, lhs.val < rhs.val);
    },
    ">" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, lhs.val > rhs.val);
    },
    "<=" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, lhs.val <= rhs.val);
    },
    ">=" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, lhs.val >= rhs.val);
    },
    "==" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, lhs.val == rhs.val);
    },
    "!=" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, lhs.val != rhs.val);
    },
    "+" : function(lhs,rhs) {
        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't add " + mapTypeToName[lhs.type] + " to " + mapTypeToName[rhs.type] );
        }
        return new Value(lhs.type, lhs.val + rhs.val);
    },
    "-" : function(lhs,rhs) {
        if (lhs.type != rhs.type) {
            throw new RuntimeException("Can't subtract " + mapTypeToName[lhs.type] + " to " + mapTypeToName[rhs.type] );
        }
        return new Value(lhs.type, lhs.val - rhs.val);
    },
    "." : function(lhs,rhs) {
        if (lhs.type != TYPE_STR) {
            throw new RuntimeException("First argument must be a string");
        }
        if (rhs.type != TYPE_STR) {
            throw new RuntimeException("Second argument must be a string");
        }
        return new Value(TYPE_STR, lhs.val + rhs.val);
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
        return "(" + this.op + ": " + this.lhs.show() + " ," + this.rhs.show() + ")";
    }

}

function makeExpression(exprList) {
    if (exprList.length == 1) {
        return exprList[0];
    }
    let prevExpression = null;
    let pos = exprList.length -1;

    //console.log("@@" + JSON.stringify(exprList));
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
        return "(" + this.op + " " + this.expr.show() + ")";
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
        let rval = "{";
        rval += showList(this.exprList, function(arg) { return arg[0].show() + ": " + arg[1].show()})
        return rval + "}";
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
        return "[" + showList(this.exprList)  + "]";
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
        if (value.type != TYPE_LIST && value.type != TYPE_MAP) {
            throw new RuntimeException("Can't index expression of variable " + this.identifierName);
        }
        let expr = refExpr[i];
        let indexValue = expr.eval(frame);

        value = value.val[ indexValue.val ];
        if (value == null) {
            throw new RuntimeException("Can't lookup value " + indexValue.val)
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


class AstAssign extends AstBase {
    constructor(lhs, rhs, offset) {
        super(offset);
        this.lhs = lhs;
        this.rhs = rhs;
    }

    eval(frame) {
        let value = this.rhs.eval(frame);
        if (this.lhs.length == 1 ) {
            let singleLhs = this.lhs[0]
            this._assign(frame, singleLhs, value);
        } else {
            if (value.type != TYPE_LIST) {
                throw new RuntimeException("list value expected on right hand side of assignment");
            }
            let rhsVal = value.val;
            if (this.lhs.length != rhsVal.length) {
                if (this.lhs.length < rhsVal.length) {
                    throw new RuntimeException("not enough values to assign");
                } else {
                    throw new RuntimeException("too many values to assign");
                }
            }
            for(let i=0; i<rhsVal.length; ++i) {
                this._assign(frame, this.lhs[i], rhsVal[i]);
            }
        }
        return VALUE_NONE;
    }

    _assign(frame, singleLhs, value) {
        let varName = singleLhs.identifierName;
        let indexExpr = singleLhs.refExpr;

        if (varName != "_") {
            if (indexExpr != null) {
                let lhsValue = frame.lookup(varName);
                this._indexAssign(frame, lhsValue, indexExpr, value)
            } else {
                frame.assign(varName, value);
            }
        }
    }

    _indexAssign(frame, value, refExpr, newValue) {
        let i=0;
        for(; i<refExpr.length; ++i) {
            if (value.type != TYPE_LIST && value.type != TYPE_MAP) {
                throw new RuntimeException("Can't index expression of variable " + this.identifierName);
            }
            let expr = refExpr[i];
            let indexValue = expr.eval(frame);

            if (i != (refExpr.length-1)) {
                value = value.val[indexValue.val];
            } else {
                value.val[indexValue.val] = newValue;
            }
        }
    }

    show() {
        return "(" + showList(this.lhs) + " := " + this.rhs.show() + ")";
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
            if (value2Bool(val)) {
                return clause[1].eval(frame);
            }
        }
        if (this.elseStmtList != null) {
            return this.elseStmtList.eval(frame);
        }
        return VALUE_NONE;
    }

    show() {
        let ret = "(";
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            if (i==0) {
                ret += "if";
            } else {
                ret += "else";
            }
            ret += " " + clause[0].show() + " " + clause[1].show();
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
    }
    eval(frame) {
        while(true) {
            let condVal = this.expr.eval(frame);

            let cond =  value2Bool(condVal);

             if (cond.type == TYPE_BOOL && cond.val == false) {
                break;
            }

            let rt = this.stmtList.eval(frame);
            if (rt.type >= TYPE_FORCE_RETURN) {
                if (rt.type == TYPE_FORCE_BREAK) {
                    break;
                }
                return rt;
            }
        }
        return VALUE_NONE;
    }

    show() {
        return "(while " + this.expr.show() + " " + this.stmtList.show() + " )";
     }
}

function makeWhileStmt(expr, stmtList, offset) {
    return new AstWhileStmt(expr, stmtList, offset);
}

class AstReturnStmt extends AstBase {
    constructor(expr, offset) {
        super(offset);
        this.expr = expr;
    }

    eval(frame) {
        let retValue = this.expr.eval(frame);
        return new Value(TYPE_FORCE_RETURN, retValue);
    }

    show() {
        return "(return " + this.expr.show() + " )";
    }
}

function makeReturnStmt(expr, offset) {
    return new AstReturnStmt(expr, offset);
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
    constructor(expr, offset) {
        super(offset);
        this.expr = expr;
    }

    eval(frame) {
        let retValue = this.expr.eval(frame);
        return new Value(TYPE_FORCE_BREAK, retValue);
    }

    show() {
        return "(break)";
    }
}

function makeBreakStmt(offset) {
    return new AstBreakStmt(offset);
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

    show() {
        let ret = "(funcDef " + this.name + "("

        ret += showList(this.params, function(arg) {
            let ret = arg[0][0];
            if (arg.length > 1) {
                ret += " = " + arg[2];
            }
            return ret;
        })
        return ret + ") " + this.body.show() + ")";
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
    }

    eval(frame) {
        let funcVal = frame.lookup(this.name);
        if (funcVal == undefined) {
            throw new RuntimeException("Can't call undefined function " + this.name, this.startOffset);
        }
        try {
            return this._evalFunc(funcVal, frame);
        } catch(er) {
            if (er instanceof RuntimeException) {
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            }
            throw er;
        }
    }

    _evalFunc(funcVal, frame) {
        if (funcVal.type != TYPE_CLOSURE && funcVal.type != TYPE_BUILTIN_FUNCTION) {
            throw new RuntimeException("variable is not a function/closure, it is a " + mapTypeToName[funcVal.type.toString()], this.startOffset);
        }

        let args = [];
        for (let i = 0; i < this.expressionList.length; ++i) {
            let argExpression = this.expressionList[i]; // parameter expression
            let argValue = argExpression.eval(frame); // evaluate parameter expression
            args.push(argValue);
        }
        return evalClosure(funcVal, args, frame);
    }

    show() {
        return "(functionCall " + this.name + " (" + showList(this.expressionList) + "))";
    }

}

function makeFunctionCall(name, expressionList) {
    let expr =  expressionList;
    if (expressionList.length != 0) {
        expr = expressionList[0];
    }
    return new AstFunctionCall(name[0], expr, name[1]);
}

function eval(stmt, globFrame = null) {
    if (globFrame == null) {
        globFrame = new Frame();
    }
    globFrame.vars = RTLIB;

    return stmt.eval(globFrame)
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
        makeReturnStmt,
        makeUseStmt,
        makeBreakStmt,
        makeFunctionDef,
        makeFunctionCall,
        eval,
        setLogHook,
        setCurrentSourceInfo,
        rtValueToJsVal,
    }
}
