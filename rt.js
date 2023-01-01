
TYPE_BOOL=0
TYPE_NUM=1
TYPE_STR=2
TYPE_LIST=3
TYPE_MAP=4
TYPE_NONE=5
TYPE_CLOSURE=6
TYPE_FORCE_RETURN=7

mapTypeToName = {
    TYPE_BOOL : "Boolean",
    TYPE_NUM : "Number",
    TYPE_STR : "String",
    TYPE_LIST : "List",
    TYPE_MAP : "Map",
    TYPE_NONE : "None",
    TYPE_CLOSURE : "Closure",
    TYPE_FORCE_RETURN : "ForceReturn"
}

class ClosureValueImp {
    // needs the function definition and the frame of the current function (for lookup of captured vars)
    constructor(functionDef, defaultParamValues, frame) {
        this.functionDef = functionDef;
        this.defaultParamValues = defaultParamValues;
        this.frame = frame;
    }
}
class Value {
    constructor(type, val) {
        this.type = type;
        this.val = val;
    }
}

function value2Bool(val) {
    if (val.type == TYPE_BOOL) {
        return val.val;
    } else if (val.type == TYPE_NUM) {
        return val.val != 0;
    } else if (val.type == TYPE_STR) {
        return val.val == "true";
    }
    throw new Error("can't convert " + mapTypeToName[val.type] + " to boolean");
}

function value2Num(val) {
    if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return val.val;
    } else if (val.type == TYPE_STR) {
        return parseFloat(val.val);
    }
    throw new Error("can't convert " + mapTypeToName[val.type] + " to מוצנקר");
}

function value2Str(val) {
    if (val.type == TYPE_STR) {
        return val.val;
    } else if (val.type == TYPE_BOOL || val.type == TYPE_NUM) {
        return toString(val.val);
    } else {
        throw new Error("can't convert " + mapTypeToName[val.type] + " to string");
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

class Frame {
    constructor(parentFrame = null) {
        this.vars = {}; // maps variable name to Value instance
        this.parentFrame = parentFrame;
    }

    lookup(name, indexExpr =  null) {
        if (name in this.vars) {
            return this.vars[name];
        }
        if (this.parentFrame != null) {
            let retVal =  this.parentFrame.lookup(name);
            if (indexExpr != null) {
                retVal = retVal[indexExpr];
            }
            return retVal;
        }
        throw new RuntimeException("undefined variable: " + name );
    }

    assign(name, value, indexExpr =  null) {
        if (name in this.vars) {
            if (indexExpr == null) {
                this.vars[name] = value;
            } else {
                let val = this.vars[name];
                val[indexExpr] = copyPrimitiveVal(value);
            }
            return;
        }
        if (this.parentFrame != null) {
            this.parentFrame.assign(name, copyPrimitiveVal(value));
            return;
        }
        throw new RuntimeException("undefined variable: " + name );
    }

    defineVar(name, value) {
       this.vars[name] = copyPrimitiveVal(value);
    }
}

class AstStmtList {
    constructor(statements) {
        this.statements = statements;
    }

    eval(frame) {
        for(let i=0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            let val = stmt.eval(frame);
            if (val.type == TYPE_FORCE_RETURN) {
                return val;
            }
        }
        return VALUE_NONE;
    }
}

function makeStatementList(stmtList) {
    return new AstStmtList(stmtList);
}

class AstConstValue {
    constructor(value) {
        this.value = value;
    }
}

function makeConstValue(type, value) {
    return new AstConstValue( new Value(type, value) );
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

class AstBinaryExpression {
    constructor(lhs, rhs , op) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.op = op;
        this.fun = MAP_OP_TO_FUNC[op];
    }
    
    eval(frame) {
        let lhsVal = this.lhs.eval(frame);
        let rhsVal = this.rhs.eval(frame);
        return this.fun(lhsVal, rhsVal);
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
            prevExpression = new AstBinaryExpression(exprList[pos-2], exprList[pos-1], exprList[pos]);
            pos -= 3;
        } else {
            prevExpression = new AstBinaryExpression(exprList[pos-1], exprList[pos-1], prevExpression);
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

class AstUnaryExpression {
    constructor(expr, op) {
        this.expr = expr;
        this.op = op;
        this.fun = MAP_UNARY_OP_TO_FUNC[op];
    }

    eval(frame) {
        let exprVal = this.expr.eval(frame);
        return this.fun(exprVal);
    }
}

class AstDictCtorExpression {
    constructor(exprList) {
        this.exprList = exprList;
    }

    eval(frame) {
        let ret = {}

        for(let i = 0; i < this.exprList.length; ++i) {
            let nameValueDef = this.exprList[i];

            let nameVal = nameValueDef[0].eval(frame);
            let name = value2Str( nameVal );
            let value = nameValueDef[2].eval(frame);

            ret[ name ] = value;
        }
        return new Value(TYPE_MAP, ret);
    }
}

function newDictListCtorExpression(exprList) {
    return new AstDictCtorExpression(exprList);
}

class AstListCtorExpression {
    constructor(exprList) {
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
}

function newListCtorExpression(exprList) {
    return new AstListCtorExpression(exprList);
}

function makeUnaryExpression(expr, op) {
    return new AstUnaryExpression(expr, op);
}

class AstLambdaExpression {

    constructor(functionDef) {
        this.functionDef = functionDef;
        this.parentFrame = null;
    }

    eval(frame) {
        let defaultParams = _evalDefaultParams(this.parentFrame, this.functionDef.params);
        let cval = new ClosureValueImp(this.functionDef, defaultParams, this.parentFrame);
        return new Value(TYPE_CLOSURE, cval);
    }
}

function makeLambdaExpression(functionDef) {
    return new AstLambdaExpression(functionDef);
}


class AstIndentifierRef {
    constructor(identifierName, refExpr) {
        this.identifierName = identifierName;
        this.refExpr = refExpr;
    }

    // evaluate, if as part of expression (for assignment there is AstAssignment)
    eval(frame) {
        return frame.lookup(this.identifierName, this.refExpr);
    }
}

function makeIdentifierRef(identifierName, refExpr) {
    return new AstIndentifierRef(identifierName, refExpr);
}

class AstAssign {
    constructor(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
    }

    eval(frame) {
        let value = this.rhs.eval(frame);
        if (this.lhs.length == 1) {
            let singleLhs = this.lhs[0]
            this._assign(singleLhs, value);
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
                this._assign(this.lhs[i], rhsVal[i]);
            }
        }
        return VALUE_NONE;
    }

    _assign(frame, singleLhs, value ) {
        let varName = singleLhs.identifierName;
        let indexExpr = singleLhs.refExpr;

        if (varName != "_") {
            let indexVal = null;
            if (indexExpr != null) {
                indexVal = indexExpr.eval(frame);
            }
            frame.assign(varName, value, indexVal);
        }
    }
}

function makeAstAssignment(lhs, rhs) {
    return new AstAssign(lhs, rhs);
}

class AstIfStmt {
    constructor(expr, stmtList, elseStmtList) {
        this.ifClauses = [];
        this.addIfClause(expr, stmtList);
        this.elseStmtList = elseStmtList;
    }

    addIfClause(expr,stmtList) {
        this.ifClauses.push([ expr, stmtList ]);
    }
}

function makeIfStmt(expr, stmtList, elseStmtList) {
    return new AstIfStmt(expr, stmtList, elseStmtList);
}

class AstWhileStmt {
    constructor(expr, stmtList) {
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
}

function makeWhileStmt(expr, stmtList) {
    return new AstWhileStmt(expr, stmtList);
}

class AstReturnStmt {
    constructor(expr) {
        this.expr = expr;
    }

    eval(frame) {
        let retValue = this.expr.eval(frame);
        return new Value(TYPE_FORCE_RETURN, retValue);
    }
}

function makeReturnStmt(expr) {
    return new AstReturnStmt(expr);
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

class AstFunctionDef {
    constructor(name, params, body) {
        this.name = name;
        this.params = params;
        this.body = body;
    }

    eval(frame) {
        let defaultParamValues = _evalDefaultParams(frame, this.params);
        let closureImp = new ClosureValueImp(this, defaultParamValues, frame);
        let closureValue = new Value(TYPE_CLOSURE, closureImp);
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
}

function makeFunctionDef(name, params, body) {
    return new AstFunctionDef(name, params, body)
}

class AstFunctionCall {
    constructor(name, expressionList) {
        this.name = name;
        this.expressionList = expressionList;
    }

    eval(frame) {
        let funcVal = frame.lookup(this.name);
        if (funcVal == null) {
            throw new Error("Can't call undefined function " + this.name);
        }
        if (funcVal.type != TYPE_CLOSURE) {
            throw new Error("variable " + this.name + " is not a function, it is a " + mapTypeToName[funcVal.type]);
        }

        let closureVal = funcVal.val;
        let functionDef = closureVal.functionDef;
        let funcFrame = new Frame(frame);

        if (this.expressionList.length > functionDef.params.length) {
            throw new Error(this.name + " takes " + functionDef.params.length + " params, but " + this.expressionList.length + " were given");
        }

        // define all provided parameters in the new function frmae
        let i=0;
        for(; i<this.expressionList.length;++i) {
            let argExpression = this.expressionList[i]; // parameter expression
            let argValue = argExpression.eval(frame); // evaluate parameter expression
            let paramDef = functionDef.params[i]; // name of parameter

            funcFrame.defineVar(paramDef[0], argValue);
        }

        // provide values for arguments with default values
        for(;i < functionDef.params.length; ++i) {
            let paramDef = functionDef.params[i]; // name of parameter

            let defaultParamValue = closureVal.defaultParamValues[i];
            if (defaultParamValue == null) {
                throw new Error("function " + this.name + " no value for parameter " + paramDef[0] );
            }
            funcFrame.defineVar(paramDef[0], defaultParamValue);
        }

        // frame is ready, evaluate the statement list
        let rval = functionDef.body.eval(funcFrame);
        if (rval.type == TYPE_FORCE_RETURN) {
            return rval.val;
        }
        return VALUE_NONE
    }
}

function makeFunctionCall(name, expressionList) {
    return new AstFunctionCall(name, expressionList);
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
        makeFunctionCall
    }
}
