
TYPE_BOOL=0
TYPE_NUM=1
TYPE_STR=2
TYPE_LIST=3
TYPE_MAP=4
TYPE_NONE=5
TYPE_CLOSURE=6
TYPE_FORCE_RETURN=7

class ClosureValueImp {
    // needs the function definition and the frame of the current function (for lookup of captured vars)
    constructor(functionDef, frame) {
        this.functionDef = functionDef;
        this.frame = frame;
    }
}
class Value {
    constructor(type, val) {
        this.type = type;
        this.val = val;
    }
}

VALUE_NONE=new Value(TYPE_NONE,null);

class RuntimeException  extends Error {
    constructor(message, nextException = null) {
        super(message);
        this.nextException = nextException;
    }
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
                val[indexExpr] = value;
            }
            return;
        }
        if (this.parentFrame != null) {
            this.parentFrame.assign(name, value);
            return;
        }
        throw new RuntimeException("undefined variable: " + name );
    }
}

class AstFunctionDef {
    constructor(args, statements, frame) {
        this.args = args;
        this.statements = statements;
        this.frame = frame;
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
    "<" : function(lhs,rhs) {
    }
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

class AstLambdaExpression {
    constructor(functionDef)
    {
        this.functionDef = functionDef;
        this.parentFrame = null;
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
            let whileExpr = this.expr.eval(frame);
            // convert to boolean
            if (whileExpr.type == TYPE_BOOL && whileExpr.val == false) {
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


class AstFunctionDef {
    constructor(name, params, body) {
        this.name = name;
        this.params = params;
        this.body = body;
    }
}

function makeFunctionDef(name, params, body) {
    return new AstFunctionDef(name, params, body)
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
        makeLambdaExpression,
        makeIdentifierRef,
        makeStatementList,
        makeAstAssignment,
        makeIfStmt,
        makeWhileStmt,
        makeReturnStmt,
        makeFunctionDef
    }
}
