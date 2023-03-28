

const path=require("node:path");
const fs=require("fs");
const prs=require(path.join(__dirname,"prs.js"));
const rt=require(path.join(__dirname,"rt.js"));
const bs=require(path.join(__dirname,"rtbase.js"));


let theParser = null;

KEYWORDS = {
    "use" : 1,
    "as" : 1,
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
    'try' : 1,
    'catch' : 1,
    'throw' : 1,
    'finally': 1,
}

function isKeyword(arg) {
    return arg in KEYWORDS;
}

escapeCharsDct = {
    'b': '\b',
    'f': '\f',
    'n': '\n',
    'r': '\r',
    't': '\t',
    'v': '\v',
    '0': '\0',
    "\'": '\'',
    '\"': '\"',
    '\\': '\\',
};

function unescapeChar(str, pos) {
    let len = 1;
    let ch = str.at(pos);
    if (ch in escapeCharsDct) {
        return [escapeCharsDct[ch], 1];
    }
    if (ch == 'u') {
        let s = str.substring(pos+1, pos+5);
        if (!/^[0-9a-fA-F]*$/.test(s)) {
            return ["", -1];
        }
        return [ String.fromCharCode("0x" + s ), s.length+1 ];
    }
    return [ch, 1];
}

function unquote(str, posInData) {
    let res = "";
    let posInString = 0

    while(true) {
        let nextPos = str.indexOf("\\", posInString);
        if (nextPos === -1) {
            if (res != "") {
                res += str.substring(posInString);
                return res;
            }
            return str;
        }
        res += str.substring(posInString, nextPos);
        posInString = nextPos + 1;

        let [ unescapedStr, len ] = unescapeChar(str, posInString);
        if (len == -1) {
            throw new prs.ParserError("wrong unicode escape code", posInData + posInString);
        }
        res += unescapedStr;
        posInString += len;
    }
}

let skipNestedWhitespace = null;

function skipComments(state) {

    while(true) {
        skipNestedWhitespace(state);

        if (state.pos >= state.data.length) {
            break;
        }

        let ch = state.data.charAt(state.pos);
        if (ch != '#' && (ch != '/' && state.data.charAt(state.pos+1) != '/'))   {
            break
        }

        while (state.pos < state.data.length) {
            ch = state.data.charAt(state.pos);
            if (ch == '\r' || ch == '\n')
                break
            state.pos += 1;
        }
    }
}

function makeParserImp() {

    skipNestedWhitespace = prs.getSkipWhitespaceFunction();
    prs.setSkipWhitespaceFunction(skipComments);

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
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        }
    );

    let regexConst = prs.makeTransformer(
        prs.makeRegexParser(/^\/(\\\\.|[^\/])*\/[im]?/, "regular expression-const"),
        function (arg) {
            try {
                return rt.makeConstValue(bs.TYPE_REGEX, arg);
            } catch(ex) {
                throw new prs.ParserError(ex, arg[1]+1);
            }
        }
    );


    let formatStringConst = prs.makeTransformer(
        prs.makeRegexParser(/^"(\\\\.|[^"{])*"/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
            }
    );

    let trueConst = prs.makeTransformer(
        prs.makeTokenParser("true"),
        function (arg) {
            return rt.makeConstValue(bs.TYPE_BOOL, arg);
        });

    let falseConst = prs.makeTransformer(
        prs.makeTokenParser("false"),
        function (arg) {
            return rt.makeConstValue(bs.TYPE_BOOL, arg);
        });

    let noneConst = prs.makeTransformer(
        prs.makeTokenParser("none"),
        function (arg) {
            return rt.makeConstValue(bs.TYPE_NONE, arg);
        });

    // f-string tokens
    let formatStringStartConst = prs.makeTransformer(
        prs.makeRegexParser(/^"(\\\\.|[^"{])*{/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        });
    let formatStringMidConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^"{])*{/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        });
    let formatStringEndConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^"{])*"/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        })

    // backtick string tokens

    let backtickStringConst = prs.makeTransformer(
        prs.makeRegexParser(/^`(\\\\.|[^`{])*`/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return [rt.makeConstValue(bs.TYPE_STR, arg)];
        }
    );
    let backtickStringMidConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^`{])*{/, "string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        });

    let backtickStringStartConst = prs.makeTransformer(
        prs.makeRegexParser(/^`(\\\\.|[^`{])*{/, "backtick-string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        });
    let backtickStringEndConst = prs.makeTransformer(
        prs.makeRegexParser(/^}(\\\\.|[^`{])*`/, "backtick-string-const"),
        function (arg) {
            arg[0] = arg[0].slice(1, -1);
            arg[0] = unquote( arg[0], arg[1]+1);
            return rt.makeConstValue(bs.TYPE_STR, arg);
        });
    
    let forwardExpr = new prs.makeForwarder();

    let nestedExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("("),
            forwardExpr.forward(),
            prs.makeTokenParser(")"),
        ], "nested expression"),
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
        "expression list", true
    );

    let forwardIdWithOptIndex = new prs.makeForwarder();

    let functionCall = prs.makeTransformer(
        prs.makeSequenceParser([
            //identifier,
            forwardIdWithOptIndex.forward(),
            prs.makeTokenParser("("),
            prs.makeOptParser(expressionList, "optional expression list"),
            prs.makeTokenParser(")")
        ], "function call"), function (arg) {
            return rt.makeFunctionCall(arg[0], arg[2]);
        }
    );

    let listExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("["),
            prs.makeOptParser(expressionList, "optional expression list"),
            prs.makeTokenParser("]"),
        ], "list builder"), function (arg) {
            return rt.newListCtorExpression(arg[1]);
        });

    let nameValuePair = prs.makeTransformer(
        prs.makeSequenceParser([
            forwardExpr.forward(),
            prs.makeTokenParser(":"),
            forwardExpr.forward()
        ], "name-value pair in map"), function (arg) {
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
        ), "dictionary builder"
    );

    let dictExpr = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("{"),
            prs.makeOptParser(dictClause, "optional dictionary builder"),
            prs.makeTokenParser("}")
        ], "dictionary definition"), function (arg) {

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
        ], "format string"), function (arg) {
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
        ], "format string"), function (arg) {

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
                    backtickStringMidConst,
                    forwardExpr.forward()
                ]),
                0
            ),
            backtickStringEndConst
        ], "backtick string - process runner"), function (arg) {
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
        ], "backtick string - process runner"), function (arg) {

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

    let indexExpr = prs.makeRepetitionParser(
        prs.makeAlternativeParser([
            prs.makeTransformer(
                prs.makeSequenceParser([
                    prs.makeTokenParser("["),
                    forwardExpr.forward(),
                    prs.makeTokenParser("]")
                ], "index expression"), function (arg) {
                    return arg[1];
                }
            ),

            prs.makeTransformer(
                prs.makeSequenceParser([
                    prs.makeTokenParser("."),
                    identifier
                ], "dot index expression"),
                function(arg) {
                    return rt.makeConstValue(bs.TYPE_STR, arg[1]);
                }
            )
        ], "index expression"),
    0, -1, "index expression list");

    let identifierWithOptIndex = prs.makeTransformer(
        prs.makeSequenceParser([
            identifier,
            indexExpr
        ], "index lookup", false, false), function (arg) {
            if (arg.length >= 1) {
                //console.log(JSON.stringify(arg));
                return rt.makeIdentifierRef(arg[0], arg[1]);
            } else {
                return rt.makeIdentifierRef(arg[0], null);
            }
        }
    );

    forwardIdWithOptIndex.setInner(identifierWithOptIndex);

    let signedNumber = prs.makeAlternativeParser([
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("-"),
                number
            ], "negative number"), function (arg) {
                arg[1][0] = -1 * Number(arg[1][0]);
                return rt.makeConstValue(bs.TYPE_NUM, arg[1]);
            }
        ),

        prs.makeTransformer(number, function (arg) {
            arg[0] = Number(arg[0]);
            return rt.makeConstValue(bs.TYPE_NUM, arg);
        }),

        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("-"),
                forwardExpr.forward()
            ], "negative epression"), function (arg) {
                let newArg = [
                        rt.makeConstValue(bs.TYPE_NUM, [ "-1", arg[0][1] ]),
                        arg[0],
                        arg[1]
                     ];
                return rt.makeExpression(newArg);
        }),


    ], "signed expression");


    let primaryExpr = prs.makeAlternativeParser(
        [
            trueConst,
            falseConst,
            noneConst,
            regexConst,
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
        "primary expression");

    let multOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("/"),
        prs.makeTokenParser("*"),
        prs.makeTokenParser("%"),
    ], "multiplication operator");

    let multExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            primaryExpr,
            prs.makeSequenceParser([
                multOperator,
                primaryExpr
            ], "multiplication expression"),
            "multiplication expression", true
        ), rt.makeExpression);

    let addOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("+"),
        prs.makeTokenParser("-"),
    ], "add/subst operator");

    let forwardLambdaFunctionDef = new prs.makeForwarder();

    let addExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            multExpression,
            prs.makeSequenceParser([
                addOperator,
                multExpression,
            ], "add expression"),
            "add expression", true),
        rt.makeExpression);

    let relationOperator = prs.makeAlternativeParser([
        prs.makeTokenParser(">="),
        prs.makeTokenParser("<="),
        prs.makeTokenParser("<"),
        prs.makeTokenParser(">")
    ], "comparison operator")

    let relationalExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            addExpression,
            prs.makeSequenceParser([
                relationOperator,
                addExpression
            ]),
            "relation expression",
            true
        ), rt.makeExpression);

    let equalityOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("=="),
        prs.makeTokenParser("!=")
    ], "equality operator")

    let equalityExpression = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            relationalExpression,
            prs.makeSequenceParser([
                equalityOperator,
                relationalExpression
            ]),
            "equality expression",
            true
        ), rt.makeExpression);

    let logicInversion = prs.makeAlternativeParser([
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser("not"),
                equalityExpression
            ], "logical inversion"),
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
            ]), "and expression", true), rt.makeExpression);

    let logicalDisjunction = prs.makeTransformer(
        prs.makeRepetitionRecClause(
            logicalConjunction,
            prs.makeSequenceParser([
                prs.makeTokenParser("or"),
                logicalConjunction
            ]), "or expression", true), rt.makeExpression);

    let expression = prs.makeAlternativeParser([
        logicalDisjunction,
        forwardLambdaFunctionDef.forward()
    ], "expression")

    forwardExpr.setInner(expression);

    let assignLhsSingle = prs.makeAlternativeParser([
        identifierWithOptIndex,
        prs.makeTransformer(
            prs.makeTokenParser("_"),
            function (arg) {
                return rt.makeIdentifierRef(arg, null);
            }
        )
    ], "left hand side of assignment");

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
        "assignment left hand side"
    );

    let assignment = prs.makeTransformer(
        prs.makeSequenceParser([
            assignLhs,
            prs.makeAlternativeParser([
                prs.makeTokenParser("="),
                prs.makeTokenParser(":=")
            ]),
            expression
        ], "assignment"),
        function (arg) {
            return rt.makeAstAssignment(arg[0], arg[2], arg[1][1], arg[1][0] == '=');
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
                ], "elif clause"),
                0,
            ),
            prs.makeOptParser(
                prs.makeSequenceParser([
                    prs.makeTokenParser("else"),
                    statementOrStatementListFwd.forward()
                ], "else clause")
                , "optional else clause"
            )
        ], "if statement", false, false),
        function (arg) {

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
        ], "while statement"),
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
        ], "for statement"),
        function (arg) {
            return rt.makeForStmt(arg[1], arg[2], arg[3], arg[0][1]);
        }
    );


    let returnStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("return"),
            expression
        ], "return statement"),
        function (arg) {
            return rt.makeReturnStmt(arg[1], arg[0][1]);
        }
    );

    let yieldStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("yield"),
            expression

        ], "yield statement"),
        function (arg) {
            return rt.makeYieldStmt(arg[1], arg[0][1]);
        }
    );

    let useStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("use"),
            expression,
            prs.makeOptParser( 
                prs.makeSequenceParser([
                    prs.makeTokenParser("as"),
                    identifier
                ], "optional as clause for use statement")
            )
        ], "use statement / include"),
        function (arg) {
            //console.log(JSON.stringify(arg[2]));
            return rt.makeUseStmt(runParse, arg[1], arg[2], arg[0][1])
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
            prs.makeTransformer(
                prs.makeSequenceParser([
                    prs.makeTokenParser("="),
                    expression
                ], "function parameter")
                , function(arg) {
                    return arg[1];
                })
            , "optional function parameter"
        )
    ], "function parameter list");

    let paramList = prs.makeRepetitionRecClause(
        paramDef,
        prs.makeTransformer(
            prs.makeSequenceParser([
                prs.makeTokenParser(","),
                paramDef
            ], "oarameter list"), function (arg) {
                return arg[1];
            }
        ),
        "parameter list"
    );

    let lambdaFunctionDef = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("def"),
            prs.makeTokenParser("("),
            prs.makeOptParser(paramList, "optional parameter list"),
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ], "function without name"), function (arg) {

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
            prs.makeOptParser(paramList, "optional parameter list"),
            prs.makeTokenParser(")"),
            statementOrStatementListFwd.forward(),
        ], "function definition"), function (arg) {
            //console.log("function-def stmt: " + JSON.stringify((arg[5])));
            let param = [];
            if (arg[3].length != 0) {
                param = arg[3][0];
            }
            return rt.makeFunctionDef(arg[1], param, arg[5], arg[0][1]);
        }
    );

    let tryCatchBlock = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("try"),
            statementOrStatementListFwd.forward(),
            prs.makeSequenceParser([
                prs.makeTokenParser("catch"),
                identifier,
                statementOrStatementListFwd.forward()
            ], "catch block"),
            prs.makeOptParser(
                prs.makeTransformer(
                    prs.makeSequenceParser([
                        prs.makeTokenParser("finally"),
                        statementOrStatementListFwd.forward()
                    ], "finally block"), function(arg) {
                        return arg[1];
                    }
                ),
                "optional finally block"
            )
        ], "try-catch block"), function(arg) {
            return rt.makeTryCatchBlock(arg[1], arg[2], arg[3])
        }
    );

    let throwStmt = prs.makeTransformer(
        prs.makeSequenceParser([
            prs.makeTokenParser("throw"),
            forwardExpr.forward()
        ], "throw statement"), function( arg ) {
            return rt.makeThrowStmt(arg[1], arg[0][1]);
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
        //useStmt,
        expression,
        tryCatchBlock,
        throwStmt
    ], "statement")


    let statementList = prs.makeTransformer(
        prs.makeRepetitionParser(
            statement,
            0, -1, "sequence of statements"
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
            ], "statement list"), function (arg) {
                return arg[1];
            }
        ),
        prs.makeTransformer(
            statement,
            function (arg) {
                return rt.makeStatementList([arg], arg.offset);
            }
        )
    ], "statement or statement list");

    statementOrStatementListFwd.setInner(statementOrStatementList);

    // top level
    let statementTopLevel = prs.makeTransformer(
        prs.makeAlternativeParser([
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
            expression,
            tryCatchBlock,
            throwStmt
        ], "statement"),
        function(arg, posRange) {
            if (rt.isBreakOrContinue(arg)) {
                throw new prs.ParserError("statement must be in a loop", arg.startOffset, null, true);
            }
            if (rt.isReturnOrYield(arg)) {
                throw new prs.ParserError("statement must be in a function", arg.startOffset, null, true);
            }
            arg.posRange = posRange;
            return arg;
        }
    );


    let statementListTopLevel = prs.makeTransformer(
        prs.makeRepetitionParser(
            statementTopLevel,
            0, -1, "sequence of statements"
        ),
        function (arg) {
            return rt.makeStatementList(arg);
        }
    );

    statementListTopLevel.skipTrace = true;

    return prs.makeConsumeAll(statementListTopLevel);

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

function runParse(data, openFile, isRepl) {
    let parseFromData = function(data) {
        let state = new prs.State(0, data);
        let parser = makeParser();

        return parser(state);
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
            throw new bs.RuntimeException("Can't read used/included file " + filePath);
        }
    }

    

    try {
        let prevValue = rt.setCurrentSourceInfo([ origPath, data]);
        let rVal = parseFromData(data);
        rt.setCurrentSourceInfo(prevValue);
        return rVal;
    } catch(er) {
        if (er instanceof prs.ParserError) {
            let msg = prs.formatParserError(er, data);
            if (!isRepl) {
                //console.debug("---\n" + er.show() + "\n###\n");
                console.log(msg);
            } else {
                let res = er.pos >= data.length;
                throw new ScriptError(msg, res, er.noRecover, er.pos);
            }
        }
        throw er;
    }
}

class ScriptError extends Error {
    constructor(message, eof, noRecover, pos) {
        super(message);
        this.eof = eof;
        this.pos = pos;
        this.noRecover = noRecover;
    }
}


function runParserAndEval(data, openFile,  frame, replCommandParsedCallback = null, cmdLine = null) {

    try {
        let ast = runParse(data, openFile, replCommandParsedCallback != null);
        let evalRet = rt.eval(ast, frame, cmdLine);
        if (replCommandParsedCallback != null) {
            let lst = rt.addSourceToTopLevelStmts(data,ast);
            for(let i=0; i<lst.length; ++i) {
                replCommandParsedCallback(lst[i].source);
            }
        }
        return evalRet;

    } catch(er) {
        if (er instanceof bs.RuntimeException) {
            if (!er.isUnwind()) {
                er.showStackTrace();
            }
        } else if (er instanceof ScriptError) {
            throw er;
        }
        else if (!(er instanceof  prs.ParserError) ) {
            console.log(prs.formatParserError(er));
        }
    }
    return null;
}

if (typeof(module) == 'object') {
    module.exports = {
        ScriptError,
        runParserAndEval,
        runParse,
        KEYWORDS,
    }
}

