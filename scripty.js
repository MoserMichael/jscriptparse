


const path=require("node:path");
const prs=require(path.join(__dirname,"prs.js"));
const rt=require(path.join(__dirname,"rt.js"));
const fs=require("fs");

let theParser = null;

KEYWORDS = {
    "use" : 1,
    'def': 1,
    'return': 1,
    'break': 1,
    'continue' : 1,
    'yield' : 1,
    'if':   1,
    'else': 1,
    'elif': 1,
    'for' : 1,
    'while': 1,
    'not': 1,
    'or': 1,
    'and': 1,
    'true': 1,
    'false': 1,
    'none': 1,
}

function isKeyword(arg) {
    return arg in KEYWORDS;
}

function makeParserImp() {

    prs.setKeepLocationWithToken(true);
    //prs.setTrace(true);

    let identifier = prs.makeTransformer(
        prs.makeRegexParser(/^[a-zA-Z][a-zA-Z0-9\_]*/, "identifier"),
        function (arg) {
            if (isKeyword(arg[0])) {
                throw new prs.ParserError("identifier expected", arg[1]);
            }
            return arg;
        }
    );
    let number = prs.makeRegexParser(/^[\+\-]?[0-9]+([\.][0-9]+)?([eE][\+\-]?[0-9]+)?/, "number")

    let stringConst = prs.makeTransformer(
        prs.makeRegexParser(/^'(\\\\.|[^'])*'/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        }
    );

    let formatStringConst = prs.makeTransformer(
        prs.makeRegexParser(/^"(\\\\.|[^"{])*"/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        }
    );

    let trueConst = prs.makeTransformer(
        prs.makeTokenParser("true"),
        function (arg) {
            return rt.makeConstValue(rt.TYPE_BOOL, arg);
        });

    let falseConst = prs.makeTransformer(
        prs.makeTokenParser("false"),
        function (arg) {
            return rt.makeConstValue(rt.TYPE_BOOL, arg);
        });

    let noneConst = prs.makeTransformer(
        prs.makeTokenParser("none"),
        function (arg) {
            return rt.makeConstValue(rt.TYPE_NONE, arg);
        });

    // f-string tokens
    let formatStringStartConst = prs.makeTransformer(
        prs.makeRegexParser(/^"(\\\\.|[^"{])*{/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        });
    let formatStringMidConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^"{])*{/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        });
    let formatStringEndConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^"{])*"/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        })

    // backtick string tokens

    let backtickStringConst = prs.makeTransformer(
        prs.makeRegexParser(/^`(\\\\.|[^`{])*`/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return [rt.makeConstValue(rt.TYPE_STR, arg)];
        }
    );

    let backtickStringStartConst = prs.makeTransformer(
        prs.makeRegexParser(/^`(\\\\.|[^`{])*{/, "backtick-string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        });
    let backtickStringEndConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^`{])*`/, "backtick-string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        });

    let forwardExpr = new prs.makeForwarder();

    let nestedExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("("),
            forwardExpr.forward(),
            prs.makeTokenParser(")"),
        ], "nestedExpression"),
        function (arg) {
            return arg[1];
        });

    let expressionList = prs.makeRepetitionRecClause(
        forwardExpr.forward(),
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                forwardExpr.forward()
            ]),
            function (arg) {
                return arg[1];
            }),
        "expressionList", true
    );

    let functionCall = prs.makeTransformer(
        prs.makeSequenceParser([
            identifier,
            prs.makeTokenParser("("),
            prs.makeOptParser(expressionList),
            prs.makeTokenParser(")")
        ]), function (arg) {
            return rt.makeFunctionCall(arg[0], arg[2]);
        }
    );

    let listExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("["),
            prs.makeOptParser(expressionList),
            prs.makeTokenParser("]"),
        ]), function (arg) {
            return rt.newListCtorExpression(arg[1]);
        });

    let nameValuePair = prs.makeTransformer(
        prs.makeSequenceParser([
            forwardExpr.forward(),
            prs.makeTokenParser(":"),
            forwardExpr.forward()
        ]), function (arg) {
            return [arg[0], arg[2]];
        }
    );

    let dictClause = prs.makeRepetitionRecClause(
        nameValuePair,
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                nameValuePair
            ]), function (arg) {
                return arg[1];
            }
        ), "dictionaryClause"
    );

    let dictExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("{"),
            prs.makeOptParser(dictClause),
            prs.makeTokenParser("}")
        ]), function (arg) {

            let innerArg = arg[1];
            let cl = [];
            if (innerArg.length != 0) {
                cl = innerArg[0]
            }
            return rt.newDictListCtorExpression(cl, arg[0][1]);
        }
    );

    // f-strings
    let formatStringContinuation = prs.makeTransformer(
        prs.makeSequenceParser([
            forwardExpr.forward(),
            prs.makeRepetitionParser(
                prs.makeSequenceParser([
                    formatStringMidConst,
                    forwardExpr.forward()
                ]),
                0
            ),
            formatStringEndConst
        ]), function (arg) {
            let rVal = [];

            rVal.push(arg[0]);
            let mid = arg[1];
            for (let i = 0; i < mid.length; ++i) {
                let seqMid = mid[i];
                rVal.push(seqMid[0]);
                rVal.push(seqMid[1]);
            }
            rVal.push(arg[2]);
            return rVal;
        }
    );

    let formatExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            formatStringStartConst,
            formatStringContinuation
        ]), function (arg) {

            let argExpr = [arg[0]];

            if (arg[1].length != 0) {
                argExpr = argExpr.concat(arg[1]);
            }

            let funcTok = ["join", arg[0].startOffset];

            let a = [];
            a[0] = argExpr;
            let argVal = [rt.newListCtorExpression(a, arg[0].offset)];

            return rt.makeFunctionCall(funcTok, [argVal]);
        }
    );

    //backtick strings
    let backtickStringContinuation = prs.makeTransformer(
        prs.makeSequenceParser([
            forwardExpr.forward(),
            prs.makeRepetitionParser(
                prs.makeSequenceParser([
                    formatStringMidConst,
                    forwardExpr.forward()
                ]),
                0
            ),
            backtickStringEndConst
        ]), function (arg) {
            let rVal = [];

            rVal.push(arg[0]);
            let mid = arg[1];
            for (let i = 0; i < mid.length; ++i) {
                let seqMid = mid[i];
                rVal.push(seqMid[0]);
                rVal.push(seqMid[1]);
            }
            rVal.push(arg[2]);
            return rVal;
        }
    );

    let backtickExpr = prs.makeTransformer(
        prs.makeAlternativeParser([
            prs.makeSequenceParser([
                backtickStringStartConst,
                backtickStringContinuation
            ]),
            backtickStringConst
        ]), function (arg) {

            //console.log("system-arg: " + JSON.stringify(arg));

            let argExpr = [arg[0]];

            if (arg.length > 1) {
                if (arg[1].length != 0) {
                    argExpr = argExpr.concat(arg[1]);
                }
            }

            let funcTok = ["_system_backtick", arg[0].startOffset];

            let a = [];
            a[0] = argExpr;


            let argVal = [rt.newListCtorExpression(a, arg[0].offset)];
            return rt.makeFunctionCall(funcTok, [argVal]);
        }
    );


    let identifierWithOptIndex = prs.makeTransformer(
        prs.makeSequenceParser([
            identifier,
            prs.makeRepetitionParser(
                prs.makeTransformer(
                    prs.makeSequenceParser([
                        prs.makeTokenParser("["),
                        forwardExpr.forward(),
                        prs.makeTokenParser("]")
                    ]), function (arg) {
                        return arg[1];
                    }
                ), 0
            )
        ]), function (arg) {
            if (arg.length >= 1) {
                //console.log(JSON.stringify(arg));
                return rt.makeIdentifierRef(arg[0], arg[1]);
            } else {
                return rt.makeIdentifierRef(arg[0], null);
            }
        }
    );

    let signedNumber = prs.makeAlternativeParser([
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("-"),
                number
            ]), function (arg) {
                arg[1][0] = -1 * Number(arg[1][0]);
                return rt.makeConstValue(rt.TYPE_NUM, arg[1]);
            }
        ),
        prs.makeTransformer(number, function (arg) {
            arg[0] = Number(arg[0]);
            return rt.makeConstValue(rt.TYPE_NUM, arg);
        })
    ]);


    let primaryExpr = prs.makeAlternativeParser(
        [
            trueConst,
            falseConst,
            noneConst,
            functionCall,
            identifierWithOptIndex,
            signedNumber,
            stringConst,
            formatStringConst,
            nestedExpr,
            listExpr,
            dictExpr,
            formatExpr,
            backtickExpr
        ],
        "primaryExpression");

    let multOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("/"),
        prs.makeTokenParser("*"),
        prs.makeTokenParser("%"),
    ], "multOperation");

    let multExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            primaryExpr,
            prs.makeSequenceParser([
                multOperator,
                primaryExpr
            ], "multExpressionSeq"),
            "multExpression", true
        ), rt.makeExpression);

    let addOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("+"),
        prs.makeTokenParser("-"),
    ], "addOperation");

    let forwardLambdaFunctionDef = new prs.makeForwarder();

    let addExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            multExpression,
            prs.makeSequenceParser([
                addOperator,
                multExpression,
            ], "addExpressionSeq"),
            "addExpression", true),
        rt.makeExpression);

    let relationOperator = prs.makeAlternativeParser([
        prs.makeTokenParser(">="),
        prs.makeTokenParser("<="),
        prs.makeTokenParser("<"),
        prs.makeTokenParser(">")
    ])

    let relationalExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            addExpression,
            prs.makeSequenceParser([
                relationOperator,
                addExpression
            ]),
            "relationExpr",
            true
        ), rt.makeExpression);

    let equalityOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("=="),
        prs.makeTokenParser("!=")
    ])

    let equalityExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            relationalExpression,
            prs.makeSequenceParser([
                equalityOperator,
                relationalExpression
            ]),
            "equalityExpression",
            true
        ), rt.makeExpression);

    let logicInversion = prs.makeAlternativeParser([
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("not"),
                equalityExpression
            ]),
            function (arg) {
                return rt.makeUnaryExpression(arg[1], arg[0]);
            }
        ),
        equalityExpression
    ]);

    let logicalConjunction = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            logicInversion,
            prs.makeSequenceParser([
                prs.makeTokenParser("and"),
                logicInversion
            ], "andExpr", true)), rt.makeExpression);

    let logicalDisjunction = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            logicalConjunction,
            prs.makeSequenceParser([
                prs.makeTokenParser("or"),
                logicalConjunction
            ]), "orExpression", true), rt.makeExpression);

    let expression = prs.makeAlternativeParser([
        logicalDisjunction,
        forwardLambdaFunctionDef.forward()
    ])

    forwardExpr.setInner(expression);

    let assignLhsSingle = prs.makeAlternativeParser([
        identifierWithOptIndex,
        prs.makeTransformer(
            prs.makeTokenParser("_"),
            function (arg) {
                return rt.makeIdentifierRef(arg, null);
            }
        )
    ]);

    let assignLhs = prs.makeRepetitionRecClause(
        assignLhsSingle,
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                assignLhsSingle
            ]), function (arg) {
                return arg[1]
            },
        ),
        "assignmentLhs"
    );

    let assignment = prs.makeTransformer(
        prs.makeSequenceParser([
            assignLhs,
            prs.makeTokenParser("="),
            expression
        ], "assignment"),
        function (arg) {
            return rt.makeAstAssignment(arg[0], arg[2], arg[1][1]);
        }
    );


    let statementOrStatementListFwd = new prs.makeForwarder();

    let ifStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("if"),
            expression,
            statementOrStatementListFwd.forward(),

            prs.makeRepetitionParser(
                prs.makeSequenceParser([
                    prs.makeTokenParser("elif"),
                    expression,
                    statementOrStatementListFwd.forward(),
                ], "elif"),
                0,
            ),
            prs.makeOptParser(
                prs.makeSequenceParser([
                    prs.makeTokenParser("else"),
                    statementOrStatementListFwd.forward()
                ], "else")
            )
        ], "if-stmt"),
        function (arg) {

            //console.log("elsiff: " + JSON.stringify(arg));

            let ret = rt.makeIfStmt(arg[1], arg[2], arg[4], arg[0][1]);
            let elsIfClauses = arg[3];

            for (let i = 0; i < elsIfClauses.length; i++) {
                let oneElIf = elsIfClauses[i];
                if (oneElIf != undefined) {
                    //console.log("OneElIf: " + JSON.stringify(oneElIf));

                    let elseCond = oneElIf[1];
                    let elseStmt = oneElIf[2];
                    ret.addIfClause(elseCond, elseStmt);
                }
            }

            return ret;
        }
    );

    let whileStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("while"),
            expression,
            statementOrStatementListFwd.forward(),
        ]),
        function (arg) {
            return rt.makeWhileStmt(arg[1], arg[2], arg[0][1]);
        }
    );

    let forStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("for"),
            assignLhs,
            expression,
            statementOrStatementListFwd.forward(),
        ]),
        function (arg) {
            return rt.makeForStmt(arg[1], arg[2], arg[3], arg[0][1]);
        }
    );


    let returnStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("return"),
            expression
        ], "returnStatement"),
        function (arg) {
            return rt.makeReturnStmt(arg[1], arg[0][1]);
        }
    );

    let yieldStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("yield"),
            expression
        ], "yieldStatement"),
        function (arg) {
            return rt.makeYieldStmt(arg[1], arg[0][1]);
        }
    );

    let useStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("use"),
            expression
        ], "useStatement"),
        function (arg) {
            return rt.makeUseStmt(runParse, arg[1], arg[0][1])
        }
    );


    let breakStmt = prs.makeTransformer(
        prs.makeTokenParser("break"),
        function (arg) {
            return rt.makeBreakStmt(arg[1]);
        }
    );

    let continueStmt = prs.makeTransformer(
        prs.makeTokenParser("continue"),
        function (arg) {
            return rt.makeContinueStmt(arg[1]);
        }
    );

    let paramDef = prs.makeSequenceParser([
        identifier,
        prs.makeOptParser(
            prs.makeSequenceParser([
                prs.makeTokenParser("="),
                expression
            ], "functionParameter")
        )
    ], "functionParameterList");

    let paramList = prs.makeRepetitionRecClause(
        paramDef,
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                paramDef
            ]), function (arg) {
                return arg[1];
            }
        )
    );

    let lambdaFunctionDef = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("def"),
            prs.makeTokenParser("("),
            prs.makeOptParser(paramList),
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ], "lambdaDef"), function (arg) {

            let param = [];
            if (arg[2].length != 0) {
                param = arg[2][0];
            }
            let functionDef = rt.makeFunctionDef(null, param, arg[4], arg[0][1]);
            return rt.makeLambdaExpression(functionDef);
        }
    );

    forwardLambdaFunctionDef.setInner(lambdaFunctionDef);

    let functionDef = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("def"),
            identifier,
            prs.makeTokenParser("("),
            prs.makeOptParser(paramList),
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ]), function (arg) {
            //console.log("function-def stmt: " + JSON.stringify((arg[5])));
            let param = [];
            if (arg[3].length != 0) {
                param = arg[3][0];
            }
            return rt.makeFunctionDef(arg[1], param, arg[5], arg[0][1]);
        }
    );

    let statement = prs.makeAlternativeParser([
        ifStmt,
        whileStmt,
        forStmt,
        breakStmt,
        continueStmt,
        assignment,
        functionDef,
        returnStmt,
        yieldStmt,
        useStmt,
        expression
    ], "anyOfStatement")


    let statementList = prs.makeTransformer(
        prs.makeRepetitionParser(
            statement,
            0, -1, "statementsRep"
        ),
        function (arg) {
            return rt.makeStatementList(arg);
        }
    );

    let statementOrStatementList = prs.makeAlternativeParser([
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("{"),
                statementList,
                prs.makeTokenParser("}")
            ]), function (arg) {
                return arg[1];
            }
        ),
        prs.makeTransformer(
            statement,
            function (arg) {
                return rt.makeStatementList([arg], arg.offset);
            }
        )
    ], "statementOrStatementList");

    statementOrStatementListFwd.setInner(statementOrStatementList);
    return prs.makeConsumeAll(statementList);

}

function makeParser() {
    if (theParser != null) {
        return theParser;
    }
    theParser = makeParserImp();
    return theParser;
}


function resolvePath(fileName) {
    return path.resolve(fileName);
}

function runParse(data, openFile) {
    let parseFromData = function(data) {
        let state = new prs.State(0, data);
        let parser = makeParser();

        state = parser(state);
        return state.result;
    }

    let filePath = null
    let origPath = null

    if (openFile) {
        try {
            origPath = data;
            filePath = resolvePath(data);
        } catch(er) {
            throw new Error("Can't find used/included file: " + data + " : " + er);
        }

        if (filePath == null) {
            throw new Error("Can't find used/included file: " + data + " : " + er);
        }

        try {
            data = fs.readFileSync(filePath).toString();
        } catch(er) {
            throw new Error("Can't read used/included file " + filePath);
        }

    }

    try {
        let prevValue = rt.setCurrentSourceInfo([ origPath, data]);
        let rVal = parseFromData(data);
        rt.setCurrentSourceInfo(prevValue);
        return rVal;
    } catch(er) {
        if (er instanceof prs.ParserError) {
            //console.log(JSON.stringify(er));
            let origError = er.getDeepest();
            if (origError.data == null) {
                if (filePath != null) {
                    origError.filePath = path.parse(filePath).base;
                }
                origError.data = data;
            }
        }
        throw er;
    }

}

function runParserAndEval(data, openFile,  frame = null, passException = false) {

    try {
        let result = runParse(data, openFile);
        return rt.eval(result, frame);

    } catch(er) {
        if (er instanceof rt.RuntimeException) {
            if (!er.forcedStop) {
                er.showStackTrace();
            } else {
                console.log("on break");
            }
        } else {
            if (!passException) {
                console.log(prs.formatParserError(er, data));
            } else {
                throw er;
            }
        }
    }
    return null;
}

if (typeof(module) == 'object') {
    module.exports = {
        runParserAndEval,
        KEYWORDS,
    }
}

