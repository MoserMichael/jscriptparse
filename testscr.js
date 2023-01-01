

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
const {makeIfStmt, makeIdentifierRef} = require("./rt");

function makeParser() {
    let identifier = prs.makeRegexParser( /^[a-zA-Z][a-zA-Z0-9\_]*/, "identifier" );
    let number = prs.makeRegexParser( /^[\+\-]?[0-9]+([\.][0-9]+)?([eE][\+\-]?[0-9]+)?/, "number" )

    let stringConst = prs.makeTransformer(
        prs.makeRegexParser( /^'(\\\\.|[^'])*'/, "string-const" ),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_STR, arg);
        }
    );

    let formatStringConst = prs.makeTransformer(
            prs.makeRegexParser( /^"(\\\\.|[^"{])*"/, "string-const" ),
            function(arg) {
            return rt.makeConstValue(rt.TYPE_STR, arg);
        }
    );

    let trueConst = prs.makeTransformer(
        prs.makeTokenParser("true"),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_BOOL,true);
        });

    let falseConst = prs.makeTransformer(
        prs.makeTokenParser("false"),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_BOOL,true);
        });

    let noneConst = prs.makeTransformer(
        prs.makeTokenParser("none"),
        function(arg) {
            return rt.makeConstValue(rt.TYPE_NONE, null);
        });

    let formatStringStartConst = prs.makeTransformer(
        prs.makeRegexParser( /^"(\\\\.|[^"{])*{/, "string-const" ),
        function(arg) {
            return arg.slice(0,-1);
        });
    let formatStringMidConst = prs.makeTransformer(
        prs.makeRegexParser( /^}(\\\\.|[^"{])*{/, "string-const" ),
        function(arg) {
            return arg.slice(1,-1);
        });
    let formatStringEndConst = prs.makeTransformer(
        prs.makeRegexParser( /^}(\\\\.|[^"{])*"/, "string-const" ),
        function(arg) {
            return arg.slice(1);
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
            })
    );

    let functionCall = prs.makeTransformer(
            prs.makeSequenceParser( [
            identifier,
            prs.makeTokenParser("("),
            expressionList,
            prs.makeTokenParser( ")")
        ]), function(arg) {
            return rt.makeFunctionCall(arg[0], arg[2]);
        }
    );

    let listExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("["),
            expressionList,
            prs.makeTokenParser( "]"),
        ]), function(arg) {
            return rt.newListCtorExpression(arg[1]);
        });

    let nameValuePair = prs.makeSequenceParser([
        forwardExpr.forward(),
        prs.makeTokenParser(":"),
        forwardExpr.forward()
    ])

    let dictExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("{"),
            prs.makeRepetitionRecClause(nameValuePair,
                prs.makeTransformer(
                    prs.makeSequenceParser([
                        prs.makeTokenParser(","),
                        nameValuePair
                    ]), function (arg) {
                        return arg[1];
                    }
                )
            ),
            prs.makeTokenParser( "}")
        ]), function(arg) {
            return rt.newDictListCtorExpression(arg[1]);
        }
    );

    let formatStringContinuation = prs.makeSequenceParser([
        forwardExpr.forward(),
        prs.makeRepetitionParser(
            prs.makeSequenceParser([
                formatStringMidConst,
                forwardExpr.forward()
            ]),
            0
        ),
        formatStringEndConst
    ]);

    let formatExpr = prs.makeRepetitionRecClause(
        formatStringStartConst,
        formatStringContinuation
    );

    let identifierWithOptIndex = prs.makeTransformer(
            prs.makeSequenceParser([
            identifier,
            prs.makeOptParser(
                prs.makeTransformer(
                    prs.makeSequenceParser([
                        prs.makeTokenParser("["),
                        forwardExpr.forward(),
                        prs.makeTokenParser("]")
                    ]), function(arg) {
                        return arg[1];
                    }
                )
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
        prs.makeTransformer( prs.makeSequenceParser([
            prs.makeTokenParser("-"),
            number
        ]),function(arg) {
            return rt.makeConstValue(rt.TYPE_NUM, -1 * Number(arg[1]));
        }),
        prs.makeTransformer(number, function(arg) {
            return rt.makeConstValue(rt.TYPE_NUM, Number(arg));
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
            ])
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
            "equalityExpression"
        ), rt.makeExpression);

    let logicInversion = prs.makeAlternativeParser([
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("not"),
                equalityExpression
            ]),
            function(arg) {
                return rt.makeUnaryExpression(arg[1], "not");
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
            ])), rt.makeExpression);

    let logicalDisjunction = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            logicalConjunction,
            prs.makeSequenceParser([
                prs.makeTokenParser("or"),
                logicalConjunction
            ])), rt.makeExpression);

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
                return makeIdentifierRef("_", null);
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
            return rt.makeAstAssignment(arg[0], arg[2]);
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
            let ret = makeIfStmt(arg[1], arg[2], arg[4]);
            let elsIfClauses = arg[3];
            if (elsIfClauses != null) {
                for(let i=0; elsIfClauses.length; ++i) {
                    ret.addIfClause(elsIfClauses[i][1], elsIfClauses[2]);
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
            return rt.makeWhileStmt(arg[1], arg[2]);
        }
    );

    let returnStmt = prs.makeTransformer(
            prs.makeSequenceParser([
            prs.makeTokenParser("return"),
            expression
        ]),
        function(arg) {
                return rt.makeReturnStmt(arg[1]);
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
        prs.makeSequenceParser([
            prs.makeTokenParser(","),
            paramDef
        ])
    );

    let lambdaFunctionDef = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("function"),
            prs.makeTokenParser("("),
            prs.makeOptParser(paramList),
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ]), function(arg) {
            let functionDef = rt.makeFunctionDef(null, arg[2], arg[4]);
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
            return rt.makeFunctionDef(arg[1], arg[3], arg[5]);
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


    let statementList = prs.makeRepetitionRecClause(
        statement,
        statement,
        "statementList",
        false
    );

    let statementOrStatementList = prs.makeAlternativeParser([
        prs.makeTransformer(
            statement,
            function(arg) {
                return rt.makeStatementList([ arg ] );
            }
        ),
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("{"),
                statementList,
                prs.makeTokenParser( "}")
            ]), function(arg) {
                return rt.makeStatementList(arg[1]);
            }
        )
    ],"statementOrStatementList");

    statementOrStatementListFwd.setInner(statementOrStatementList);

    return prs.makeConsumeAll(statementList);
}

function runParser(parser, data) {

    console.log("test case: " + data);
    let s = new prs.State(0, data);

    try {
        let result = parser(s);
        console.log("parsing succeeded!")
        console.log(result.show());
    } catch(er) {
        console.log(prs.formatParserError(er, data));
    }
}

function testParser() {

    //prs.setTrace(true);

    let parser = makeParser();

    let data = [
        "aaa=1 print(aaa)",

        "a=3+12/4",

        "d=b*(4-a*e)",

        `
        function foo(val) {
            if val < 12
                print("less than 10")
            elif val <= 30
                print("youth age: {val}")                
            else {
                print("after youth age: {val}")
            }
        }
        foo(6)
        foo(20)
        foo(42)        
        `,

        `
function fact(n) {
   if n<=1 {
      return 1
   }
   return n * fact(n-1)
}
fib(10)`,

        `this=3
         that=4
         print("show this: {this} product: {this * that}")`,
        `a=[1, 2, 3]
         tmp = a[0]
         a[0]=a[1]
         a[1]=a[2]
         a[2]=tmp
        `,

        `num = { 1: "one", 2: "two", 3: [1, 2, 3] }
         print(num)
        `
    ];


    let i = 0;
    for(i=0;i<data.length;++i) {
        runParser(parser, data[i]);
    }

}

testParser();

