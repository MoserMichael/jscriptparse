

// features of the scripting language (supposed to be used in a shell)
//
// runtime: ast interpreter
//
// go - like syntax (in the sense of: less frequent braces, but without strong typing)
// types
//   strings, floating point numbers - yes
//   lists - yes
//   maps - yes
//   objects - as syntax sugar for maps - NO
//   type hints - NO
//   f-strings - yes
// functions
//  closures - YES
//  named parameters - NO
//  parameters with default values - yes
//  multiple return values, multiple assignment - as list (similar to python) - yes
// yield / generators / with statement - maybe later....
//
// modules/packages - no
// try/catch - maybe later


const prs=require("./prs.js");
const rt=require("./rt.js");

function makeParser() {

    prs.setKeepLocationWithToken(true);

    let identifier = prs.makeRegexParser( /^[a-zA-Z][a-zA-Z0-9\_]*/, "identifier" );
    let number = prs.makeRegexParser( /^[\+\-]?[0-9]+([\.][0-9]+)?([eE][\+\-]?[0-9]+)?/, "number" )

    let stringConst = prs.makeTransformer(
        prs.makeRegexParser( /^'(\\\\.|[^'])*'/, "string-const" ),
        function(arg) {
            arg[0] = arg[0].slice(1,-1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        }
    );

    let formatStringConst = prs.makeTransformer(
            prs.makeRegexParser( /^"(\\\\.|[^"{])*"/, "string-const" ),
            function(arg) {
            arg[0] = arg[0].slice(1,-1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        }
    );

    let trueConst = prs.makeTransformer(
        prs.makeTokenParser("true"),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_BOOL,arg);
        });

    let falseConst = prs.makeTransformer(
        prs.makeTokenParser("false"),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_BOOL,arg);
        });

    let noneConst = prs.makeTransformer(
        prs.makeTokenParser("none"),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_NONE, arg);
        });

    let formatStringStartConst = prs.makeTransformer(
        prs.makeRegexParser( /^"(\\\\.|[^"{])*{/, "string-const" ),
        function(arg) {
            arg[0] = arg[0].slice(1,-1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        });
    let formatStringMidConst = prs.makeTransformer(
        prs.makeRegexParser( /^}(\\\\.|[^"{])*{/, "string-const" ),
        function(arg) {
            arg[0] = arg[0].slice(1,-1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        });
    let formatStringEndConst = prs.makeTransformer(
        prs.makeRegexParser( /^}(\\\\.|[^"{])*"/, "string-const" ),
        function(arg) {
            arg[0] = arg[0].slice(1,-1);
            return rt.makeConstValue(rt.TYPE_STR, arg);
        })


    let forwardExpr = new prs.makeForwarder();

    let nestedExpr = prs.makeTransformer(
        prs.makeSequenceParser( [
            prs.makeTokenParser("("),
            forwardExpr.forward(),
            prs.makeTokenParser(")"),
        ], "nestedExpression"),
        function(arg) {
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
            prs.makeSequenceParser( [
            identifier,
            prs.makeTokenParser("("),
            prs.makeOptParser(expressionList),
            prs.makeTokenParser( ")")
        ]), function(arg) {
            return rt.makeFunctionCall(arg[0], arg[2]);
        }
    );

    let listExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("["),
            prs.makeOptParser(expressionList),
            prs.makeTokenParser( "]"),
        ]), function(arg) {
            return rt.newListCtorExpression(arg[1]);
        });

    let nameValuePair = prs.makeTransformer(
        prs.makeSequenceParser([
            forwardExpr.forward(),
            prs.makeTokenParser(":"),
            forwardExpr.forward()
        ]), function(arg) {
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
        ), 0
    );

    let dictExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("{"),
            prs.makeOptParser(dictClause),
            prs.makeTokenParser( "}")
        ]), function(arg) {

            arg = arg[1];

            let cl = [];
            if (arg.length != 0) {
                cl = arg[0]
            }

            console.log("arg: " + JSON.stringify(cl));

            return rt.newDictListCtorExpression(cl, arg[0][1]);
        }
    );

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
        ]), function(arg) {
            let rVal = [];

            rVal.push(arg[0]);
            let mid = arg[1];
            for(let i=0; i< mid.length;++i) {
                let seqMid = mid[i];
                rVal.push( seqMid[0] );
                rVal.push( seqMid[1] );
            }
            rVal.push(arg[2]);
            return rVal;
        }
    );

    let formatExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            formatStringStartConst,
            formatStringContinuation
        ]), function(arg) {

            let argExpr = [ arg[0] ];

            if (arg[1].length != 0) {
                argExpr = argExpr.concat(arg[1]);
            }

            let funcTok = [ "join", arg[0].startOffset ];

            let a = [];
            a[0] = argExpr;
            let argVal = [ rt.newListCtorExpression(a, arg[0].offset) ];

            return rt.makeFunctionCall(funcTok, [ argVal ]);
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
                    ]), function(arg) {
                        return arg[1];
                    }
                ), 0
            )
        ]), function(arg) {
            if (arg.length >= 1) {
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
            ]),function(arg) {
                arg[0] =  -1 * Number(arg[0]);
                return rt.makeConstValue(rt.TYPE_NUM, -1 * Number(arg[1]));
            }
        ),
        prs.makeTransformer(number, function(arg) {
            arg[0] =  Number(arg[0]);
            return rt.makeConstValue(rt.TYPE_NUM, arg);
        })
    ]);


    let primaryExpr = prs.makeAlternativeParser(
        [
            functionCall,
            identifierWithOptIndex,
            signedNumber,
            stringConst,
            formatStringConst,
            trueConst,
            falseConst,
            noneConst,
            nestedExpr,
            listExpr,
            dictExpr,
            formatExpr
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
        prs.makeTokenParser("-")
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
            function(arg) {
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
            function(arg) {
                return rt.makeIdentifierRef(arg, null);
            }
        )
    ]);

    let assignLhs = prs.makeRepetitionRecClause(
        assignLhsSingle,
        prs.makeSequenceParser([
            prs.makeTokenParser(","),
            assignLhsSingle
        ]),
        "assignmentLhs",
    );

    let assignment = prs.makeTransformer(
        prs.makeSequenceParser([
            assignLhs,
            prs.makeTokenParser("="),
            expression
        ],"assignment"),
        function(arg) {
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
                ] ,"elif"),
                0,
            ),
            prs.makeOptParser(
                prs.makeSequenceParser([
                    prs.makeTokenParser("else"),
                    statementOrStatementListFwd.forward()
                ], "else")
            )
        ], "if-stmt"),
        function(arg) {

            //console.log("elsiff: " + JSON.stringify(arg));

            let ret = rt.makeIfStmt(arg[1], arg[2], arg[4], arg[0][1]);
            let elsIfClauses = arg[3];

            for(let i=0; i<elsIfClauses.length; i++) {
                let  oneElIf = elsIfClauses[i];
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
        function(arg) {
            return rt.makeWhileStmt(arg[1], arg[2], arg[0][1]);
        }
    );

    let returnStmt = prs.makeTransformer(
            prs.makeSequenceParser([
            prs.makeTokenParser("return"),
            expression
        ]),
        function(arg) {
                return rt.makeReturnStmt(arg[1], arg[0][1]);
        }
    );

    let paramDef = prs.makeSequenceParser([
            identifier,
            prs.makeOptParser(
                prs.makeSequenceParser([
                    prs.makeTokenParser("="),
                    expression
                ])
            )
        ]);

    let paramList = prs.makeRepetitionRecClause(
        paramDef,
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                paramDef
            ]), function(arg) {
                return arg[1];
            }
        )
    );

    let lambdaFunctionDef = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("function"),
            prs.makeTokenParser("("),
            prs.makeOptParser(paramList),
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ]), function(arg) {
            let functionDef = rt.makeFunctionDef(null, arg[2], arg[4], arg[0][1]);
            return rt.makeLambdaExpression( functionDef );
        }
    );

    forwardLambdaFunctionDef.setInner(lambdaFunctionDef);

    let functionDef = prs.makeTransformer(
            prs.makeSequenceParser([
            prs.makeTokenParser("function"),
            identifier,
            prs.makeTokenParser("("),
            paramList,
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ]), function(arg) {
            //console.log("function-def stmt: " + JSON.stringify((arg[5])));
            return rt.makeFunctionDef(arg[1], arg[3], arg[5], arg[0][1]);
        }
    );

    let statement = prs.makeAlternativeParser([
        ifStmt,
        whileStmt,
        assignment,
        functionCall,
        functionDef,
        returnStmt
    ], "anyOfStatement")


    let statementList = prs.makeTransformer(
        prs.makeRepetitionParser(
            statement,
            0
        ),
        function(arg) {
            return rt.makeStatementList(arg);
        }
    );

    let statementOrStatementList = prs.makeAlternativeParser([
        prs.makeTransformer(
            statement,
            function(arg) {
                //let stmts = []
                //stmts[0] = rt.makeStatementList([ arg ], arg.offset );
                //return stmts;
                return rt.makeStatementList([ arg ], arg.offset );
            }
        ),
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("{"),
                statementList,
                prs.makeTokenParser( "}")
            ]), function(arg) {
                return arg[1];
            }
        )
    ],"statementOrStatementList");

    statementOrStatementListFwd.setInner(statementOrStatementList);

    return prs.makeConsumeAll(statementList);
}

function runParser(parser, data, showAst = false) {

    console.log("test case: " + data);
    let s = new prs.State(0, data);

    try {
        let state = parser(s);

        let result = state.result;

        if (showAst) {
            console.log("parsing succeeded!");
            console.log("parse result: " + result.show());
        }

        rt.eval(result);

    } catch(er) {
        console.log(prs.formatParserError(er, data));

    }
}

if (typeof(module) == 'object') {
    module.exports = {
        makeParser,
        runParser,
    }
}

