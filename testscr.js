

// features of the scripting language:
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


const prs=require("./prs.js");

function simplifyArray(arg) {
    if (arg.length == 1) {
        return arg[0];
    }
    return arg;
}

function makeParser() {
    let identifier = prs.makeRegexParser( /^[a-zA-Z][a-zA-Z0-9\_]*/, "identifier" );
    let number = prs.makeRegexParser( /^[\+\-]?[0-9]+([\.][0-9]+)?([eE][\+\-]?[0-9]+)?/, "number" );
    let stringConst = prs.makeRegexParser( /^'(\\\\.|[^'])*'/, "string-const" );
    let formatStringConst = prs.makeRegexParser( /^"(\\\\.|[^"{])*"/, "string-const" );


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

    let functionCall = prs.makeSequenceParser( [
        identifier,
        prs.makeTokenParser("("),
        expressionList,
        prs.makeTokenParser( ")")
    ])

    let listExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("["),
            expressionList,
            prs.makeTokenParser( "]"),
        ]), function(arg) {
            return arg[1]
        });

    let nameValuePair = prs.makeSequenceParser([
        forwardExpr.forward(),
        prs.makeTokenParser(":"),
        forwardExpr.forward()
    ])

    let dictExpr = prs.makeSequenceParser([
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
    ])

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

    let identifierWithOptIndex = prs.makeSequenceParser([
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
    ]);

    let primaryExpr = prs.makeAlternativeParser(
        [
            functionCall,
            identifierWithOptIndex,
            number,
            stringConst,
            formatStringConst,
            prs.makeTokenParser("true"),
            prs.makeTokenParser("false"),
            prs.makeTokenParser("none"),
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
        ), simplifyArray);

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
        simplifyArray);

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
        ), simplifyArray);

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
        ), simplifyArray);

    let logicInversion = prs.makeAlternativeParser([
        prs.makeSequenceParser([
            prs.makeTokenParser("not"),
            equalityExpression
        ]),
        equalityExpression
    ]);

    let logicalConjunction = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            logicInversion,
            prs.makeSequenceParser([
                prs.makeTokenParser("and"),
                logicInversion
            ])), simplifyArray);

    let logicalDisjunction = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            logicalConjunction,
            prs.makeSequenceParser([
                prs.makeTokenParser("or"),
                logicalConjunction
            ])), simplifyArray);

    let expression = prs.makeAlternativeParser([
        logicalDisjunction,
        forwardLambdaFunctionDef.forward()
    ])

    forwardExpr.setInner(expression);

    let assignLhsSingle = prs.makeAlternativeParser([
        identifierWithOptIndex,
        prs.makeTokenParser("_")
    ])

    let assignLhs = prs.makeRepetitionRecClause(
        assignLhsSingle,
        prs.makeSequenceParser([
            prs.makeTokenParser(","),
            assignLhsSingle
        ]),
        "assignmentLhs",
    )


    let assignment = prs.makeSequenceParser([
        assignLhs,
        prs.makeTokenParser("="),
        expression
    ],"assignment");


    let statementOrStatementListFwd = new prs.makeForwarder();

    let ifStmt = prs.makeSequenceParser([
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
    ], "if-stmt");

    let whileStmt = prs.makeSequenceParser([
        prs.makeTokenParser("while"),
        expression,
        statementOrStatementListFwd.forward(),
    ]);

    let returnStmt = prs.makeSequenceParser([
        prs.makeTokenParser("return"),
        expression
    ]);

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

    let lambdaFunctionDef = prs.makeSequenceParser([
        prs.makeTokenParser("function"),
        prs.makeTokenParser("("),
        prs.makeOptParser(paramList),
        prs.makeTokenParser(")"),
        statementOrStatementListFwd.forward(),
    ]);

    forwardLambdaFunctionDef.setInner(lambdaFunctionDef);


    let functionDef = prs.makeSequenceParser([
        prs.makeTokenParser("function"),
        identifier,
        prs.makeTokenParser("("),
        paramList,
        prs.makeTokenParser(")"),
        statementOrStatementListFwd.forward(),
    ]);

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
        statement,
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

