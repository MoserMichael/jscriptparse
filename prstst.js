const path=require("node:path");
const prs=require(path.join(__dirname,"prs.js"));
const test =require("node:test");
const assert =require('node:assert');

function makeParser() {

    let number = prs.makeRegexParser(/^[\+\-]?[0-9]+([\.][0-9]+)?([eE][\+\-]?[0-9]+)?/, "number")

    let forwardExpression = new prs.makeForwarder();

    let nestedExpr =
        prs.makeSequenceParser([
            prs.makeTokenParser("("),
            forwardExpression.forward(),
            prs.makeTokenParser(")"),
        ]);


    let signedNumber = prs.makeAlternativeParser([
        prs.makeSequenceParser([
            prs.makeTokenParser("-"),
            number
        ]),
        number
    ]);


    let primaryExpr = prs.makeAlternativeParser(
        [
            signedNumber,
            nestedExpr
        ],
        "primary expression");

    let multOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("/"),
        prs.makeTokenParser("*"),
        prs.makeTokenParser("%"),
    ], "multiplication operator");

    let multExpression =
        prs.makeRepetitionRecClause(
            primaryExpr,
            prs.makeSequenceParser([
                multOperator,
                primaryExpr
            ], "multiplication expression"),
            "multiplication expression",

        );

    let addOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("+"),
        prs.makeTokenParser("-"),
    ], "add/subst operator");

    let forwardLambdaFunctionDef = new prs.makeForwarder();

    let addExpression =
        prs.makeRepetitionRecClause(
            multExpression,
            prs.makeSequenceParser([
                addOperator,
                multExpression,
            ], "add expression"),
            "add expression");

    let relationOperator = prs.makeAlternativeParser([
        prs.makeTokenParser(">="),
        prs.makeTokenParser("<="),
        prs.makeTokenParser("<"),
        prs.makeTokenParser(">")
    ])

    let relationalExpression =
        prs.makeRepetitionRecClause(
            addExpression,
            prs.makeSequenceParser([
                relationOperator,
                addExpression
            ]),
            "relation expression",
            true
        );

    let equalityOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("=="),
        prs.makeTokenParser("!=")
    ]);

    let equalityExpression =
        prs.makeRepetitionRecClause(
            relationalExpression,
            prs.makeSequenceParser([
                equalityOperator,
                relationalExpression
            ]),
            "equality expression",
            true
        );

    let logicInversion = prs.makeAlternativeParser([
        prs.makeSequenceParser([
            prs.makeTokenParser("not"),
            equalityExpression
        ]),
        equalityExpression
    ]);

    let logicalConjunction = prs.makeRepetitionRecClause(
            logicInversion,
            prs.makeSequenceParser([
                prs.makeTokenParser("and"),
                logicInversion
            ], "andExpr", true));

    let logicalDisjunction =
        prs.makeRepetitionRecClause(
            logicalConjunction,
            prs.makeSequenceParser([
                prs.makeTokenParser("or"),
                logicalConjunction
            ]), "or expression", true);

    let expression = prs.makeAlternativeParser([
        logicalDisjunction,
        forwardLambdaFunctionDef.forward()
    ])

    forwardExpression.setInner(expression);

    return expression;
}

let parser = makeParser();


test.test('arithmetic expr', (t) => {
    // This test passes because it does not throw an exception.
    let result = prs.parseString(parser, "3*2+1*4-5");
    let json = JSON.stringify(result);
    //console.log(json);
    assert(json == "[[[\"3\",[\"*\",\"2\"]],[\"+\",[\"1\",[\"*\",\"4\"]]],[\"-\",[\"5\"]]]]")

});


test.test('arithmetic expr with ()', (t) => {
    // This test passes because it does not throw an exception.
    let result = prs.parseString(parser, " (2*3)+(4*5)");
    let json = JSON.stringify(result);
    assert(json=="[[[[\"(\",[[[\"2\",[\"*\",\"3\"]]]],\")\"]],[\"+\",[[\"(\",[[[\"4\",[\"*\",\"5\"]]]],\")\"]]]]]");

    result = prs.parseString(parser, " 2*3+4*5");
    json = JSON.stringify(result);
    assert(json=="[[[\"2\",[\"*\",\"3\"]],[\"+\",[\"4\",[\"*\",\"5\"]]]]]");

});


test.test('arithmetic expr with relation', (t) => {

    let result = prs.parseString(parser, " (2*3)+(4*5) > 100");
    let json = JSON.stringify(result);
    assert(json == "[[[[\"(\",[[[\"2\",[\"*\",\"3\"]]]],\")\"]],[\"+\",[[\"(\",[[[\"4\",[\"*\",\"5\"]]]],\")\"]]],\">\",[[\"100\"]]]]");

});

test.test('arithmetic expr with logical op', (t) => {
    let result = prs.parseString(parser, " 2 < 3 and 3 < 10 or 5 != 10");
    let json = JSON.stringify(result);
    assert(json == "[[[\"2\"],\"<\",[[\"3\"]]],[\"and\",[\"3\"],\"<\",[[\"10\"]]],\"or\",[[[\"5\"],\"!=\",[[\"10\"]]]]]");
});