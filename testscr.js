

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
    let formatStringStartConst = prs.makeRegexParser( /^"(\\\\.|[^"{])*{/, "string-const" );
    let formatStringMidConst = prs.makeRegexParser( /^}(\\\\.|[^"{])*{/, "string-const" );
    let formatStringEndConst = prs.makeRegexParser( /^}(\\\\.|[^"{])*"/, "string-const" );


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
        prs.makeSequenceParser([
            prs.makeTokenParser(","),
            forwardExpr
        ])
    );


    let functionCall = prs.makeSequenceParser( [
        identifier,
        prs.makeTokenParser("("),
        expressionList,
        prs.makeTokenParser( ")")
    ])

    let listExpr = prs.makeSequenceParser([
        prs.makeTokenParser("["),
        expressionList,
        prs.makeTokenParser( "]"),
    ])

    let nameValuePair = prs.makeSequenceParser([
        forwardExpr.forward(),
        prs.makeTokenParser(":"),
        forwardExpr.forward()
    ])

    let dictExpr = prs.makeSequenceParser([
        prs.makeTokenParser("{"),
        prs.makeRepetitionRecClause(nameValuePair,
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                nameValuePair
            ])),
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

    let primaryExpr = prs.makeAlternativeParser(
        [ functionCall, identifier, number, stringConst, formatStringConst, nestedExpr, listExpr, dictExpr, formatExpr ],
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
            "multExpression"
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
        "addExpression"),
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

    let expression = prs.makeAlternativeParser([
        equalityExpression,
        forwardLambdaFunctionDef.forward()
    ])

    forwardExpr.setInner(expression);

    let assignLhs = prs.makeRepetitionRecClause(
        identifier,
        prs.makeSequenceParser([
            prs.makeTokenParser(","),
            identifier
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
               "elif",
               expression,
               statementOrStatementListFwd.forward(),
            ]),
            0
        ),
        prs.makeOptParser(
            prs.makeSequenceParser([
                prs.makeTokenParser("else"),
                statementOrStatementListFwd.forward()
            ])
        )
    ]);

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
        prs.makeSequenceParser([
            prs.makeTokenParser("{"),
            statementList,
            prs.makeTokenParser( "}")
        ])
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
        "c=1+2",
        "aaa=1",
        "aaa=1 aaa=1",
        "aaa=1 print(aaa)",
        "a=3+12/4",
        "d=b*(4-a*e)",
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
         print("show this: {this} product: {this * that}")`
    ];


    let i = 0;
    for(i=0;i<data.length;++i) {
        runParser(parser, data[i]);
    }

}

testParser();

