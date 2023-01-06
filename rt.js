
TYPE_BOOL=0
TYPE_NUM=1
TYPE_STR=2
TYPE_LIST=3
TYPE_MAP=4
TYPE_NONE=5
TYPE_CLOSURE=6
TYPE_BUILTIN_FUNCTION=7
TYPE_FORCE_RETURN=8

mapTypeToName = {
    0 : "Boolean",
    1 : "Number",
    2 : "String",
    3 : "List",
    4 : "Map",
    5 : "None",
    6 : "Closure",
    7 : "BuiltinFunction",
    8 : "ForceReturn"
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
    constructor(numParams, funcImpl) {
        this.type = TYPE_BUILTIN_FUNCTION;
        this.numParams = numParams;
        this.funcImpl = funcImpl;
    }
}

class Value {
    constructor(type, val) {
        this.type = type;
        this.val = val;
    }

    show() { return "(" + mapTypeToName[ this.type.toString() ] + " " + this.val +  ")"; }
}

function value2Bool(val) {
    if (val.type == TYPE_BOOL) {
        return val.val;
    } else if (val.type == TYPE_NUM) {
        return val.val != 0;
    } else if (val.type == TYPE_STR) {
        return val.val == "true";
    }
    throw new Error("can't convert " + mapTypeToName[val.type.toString()] + " to boolean");
}

function value2Num(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val;
    } else if (val.type == TYPE_STR) {
        return parseFloat(val.val);
    }
    throw new Error("can't convert " + mapTypeToName[val.type.toString()] + " to מוצנקר");
}

function value2Str(val) {
    if (val.type == TYPE_STR) {
        return val.val;
    } else if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val.toString();
    } else {
        throw new Error("can't convert " + mapTypeToName[val.type.toString] + " to string");
    }
}

VALUE_NONE=new Value(TYPE_NONE,null);

class RuntimeException  extends Error {
    constructor(message, nextException = null) {
        super(message);
        this.nextException = nextException;
    }
}

function copyPrimitiveVal(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_STR || val.type == TYPE_NUM) {
        return new Value(val.type, val.val);
    }
    return val;
}

RTLIB={
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
    "print" : new BuiltinFunctionValue(1, function(arg) {
        let msg = value2Str(arg[0]);
        console.log( "print> : " +  msg );
    }),
    "len" : new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_STR && arg[0].type == TYPE_LIST) {
            return new Value(TYPE_NUM, arg[0].val.length);
        }
        throw new Error("string or list argument required");
    }),
    "join": new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_LIST) {
            return new Value(TYPE_STR, arg[0].val.map(value2Str).join(""));
        }
        throw new Error("list argument required. is: " + mapTypeToName[ arg[0].type ]);
    }),
    "keys": new BuiltinFunctionValue(1, function(arg) {
        if (arg[0].type == TYPE_MAP) {
            return new Value(TYPE_LIST, Object.keys(arg[0].val));
        }
        throw new Error("map argument required");
    }),
}

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
    }
}

class AstStmtList extends AstBase {
    constructor(statements, offset) {
        super(offset)
        this.statements = statements;
    }

    eval(frame) {
        for(let i=0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            let val = stmt.eval(frame);
            //console.log("eval obj: " + stmt.constructor.name + " res: " + JSON.stringify(val));
            if (val.type == TYPE_FORCE_RETURN) {
                return val;
            }
        }
        return VALUE_NONE;
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
        return new Value(TYPE_BOOL, value2Num(lhs) < value2Num(rhs));
    },
    ">" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Num(lhs) > value2Num(rhs));
    },
    "<=" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Num(lhs) <= value2Num(rhs));
    },
    ">=" : function(lhs,rhs) {
        return new Value(TYPE_BOOL, value2Num(lhs) >= value2Num(rhs));
    },
    "+" : function(lhs,rhs) {
        return new Value(TYPE_NUM, value2Num(lhs) + value2Num(rhs));
    },
    "-" : function(lhs,rhs) {
        return new Value(TYPE_NUM, value2Num(lhs) - value2Num(rhs));
    },
    "*" : function(lhs,rhs) {
        return new Value(TYPE_NUM, value2Num(lhs) * value2Num(rhs));
    },
    "/" : function(lhs,rhs) {
        return new Value(TYPE_NUM,value2Num(lhs) / value2Num(rhs));
    },
}

class AstBinaryExpression extends AstBase {
    constructor(lhs, op, rhs, offset) {
        super(lhs.offset);
        this.lhs = lhs;
        this.rhs = rhs;
        this.op = op[0];
        this.fun = MAP_OP_TO_FUNC[op[0]];
        if (this.fun == undefined) {
            console.log("operator " + op[0] + " is not defined");
        }
    }
    
    eval(frame) {
        let lhsVal = this.lhs.eval(frame);
        let rhsVal = this.rhs.eval(frame);
        return this.fun(lhsVal, rhsVal);
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
        let exprVal = this.expr.eval(frame);
        return this.fun(exprVal);
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
        this.parentFrame = null;
    }

    eval(frame) {
        let defaultParams = _evalDefaultParams(this.parentFrame, this.functionDef.params);
        return new ClosureValue(this.functionDef, defaultParams, this.parentFrame);
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
            throw new Error("Can't index expression of variable " + this.identifierName);
        }
        let expr = refExpr[i];
        let indexValue = expr.eval(frame);

        value = value.val[ indexValue.val ];
        if (value == null) {
            throw new Error("Can't lookup value " + indexValue.val)
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
                throw new Error("list value expected on right hand side of assignment");
            }
            let rhsVal = value.val;
            if (this.lhs.length != rhsVal.length) {
                if (this.lhs.length < rhsVal.length) {
                    throw new Error("not enough values to assign");
                } else {
                    throw new Error("too many values to assign");
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
                throw new Error("Can't index expression of variable " + this.identifierName);
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
            if (rt.type == TYPE_FORCE_RETURN) {
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
            throw new Error("Can't call undefined function " + this.name);
        }
        if (funcVal.type != TYPE_CLOSURE && funcVal.type != TYPE_BUILTIN_FUNCTION) {
            throw new Error("variable " + this.name + " is not a function, it is a " + mapTypeToName[funcVal.type.toString()]);
        }

        if (funcVal.type == TYPE_CLOSURE) {
            return this._evalClosure(funcVal, frame);
        }
        return this._evalBuiltinFunc(funcVal, frame);
    }

    _evalBuiltinFunc(funcVal, frame) {
        if (funcVal.numParams != this.expressionList.length) {
            throw new Error(this.name + " takes " + funcVal.numParams + " parameters, whereas " + this.expressionList.length +
                "  parameters are passed in call");
        }
        let args = [];
        for (let i = 0; i < this.expressionList.length; ++i) {
            let argExpression = this.expressionList[i]; // parameter expression
            let argValue = argExpression.eval(frame); // evaluate parameter expression
            args.push(argValue);
        }
        let retVal = funcVal.funcImpl(args);
        if (retVal == undefined) {
            return VALUE_NONE;
        }
        return retVal;
    }

    _evalClosure(funcVal, frame) {

        if (funcVal.frame != null) { // for closures: for evaluation we use the frame of the enclosing function
            console.log("_use_funcVal_");
            frame = funcVal.frame;
        }
        let functionDef = funcVal.functionDef;
        let funcFrame = new Frame(frame);

        if (this.expressionList.length > functionDef.params.length) {
            throw new Error(this.name + " takes " + functionDef.params.length + " params, but " + this.expressionList.length + " were given");
        }

        // define all provided parameters in the new function frmae
        let i = 0;
        for (; i < this.expressionList.length; ++i) {
            let argExpression = this.expressionList[i]; // parameter expression
            let argValue = argExpression.eval(frame); // evaluate parameter expression

            let paramDef = functionDef.params[i]; // name of parameter
            funcFrame.defineVar(paramDef[0][0], argValue);
        }

        // provide values for arguments with default values
        for (; i < functionDef.params.length; ++i) {
            let paramDef = functionDef.params[i]; // name of parameter

            let defaultParamValue = funcVal.defaultParamValues[i];
            if (defaultParamValue == null) {
                throw new Error("function " + this.name + " no value for parameter " + paramDef[0]);
            }
            funcFrame.defineVar(paramDef[0][0], defaultParamValue);
        }

        //console.log("funcFrame: " + JSON.stringify(funcFrame.vars));

        // frame is ready, evaluate the statement list
        let rval = functionDef.body.eval(funcFrame);

        if (rval.type == TYPE_FORCE_RETURN) {
            return rval.val;
        }
        return VALUE_NONE
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

function eval(stmt) {
    let glob = new Frame()
    glob.vars = RTLIB
    return stmt.eval(glob)
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
        makeFunctionDef,
        makeFunctionCall,
        eval,
        showList
    }
}
