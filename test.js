
const prs=require("./prs.js");

function makeParser() {
    let identifier = prs.makeRegexParser( /^[a-zA-Z][a-zA-Z0-9\_]*/, "identifier" );
    let number = prs.makeRegexParser( /^[\+\-]?[0-9]+([\.][0-9]+)?([eE][\+\-]?[0-9]+)?/, "number" );
    let stringConst = prs.makeRegexParser( /^"(\\\\.|[^"])*"/, "string-const" );

    let forwardExpr = new prs.makeForwarder();

    let nestedExpr = prs.makeSequenceParser( [
        prs.makeTokenParser("("),
        forwardExpr.forward(),
        prs.makeTokenParser(")"),
    ], "nestedExpression");

    let primaryExpr = prs.makeAlternativeParser(
        [ identifier, number, stringConst, nestedExpr ],
        "primaryExpression");

    let multOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("/"),
        prs.makeTokenParser("*"),
    ], "multOperation");

    let multExpression = prs.makeSequenceParser( [
        primaryExpr,
        prs.makeRepetitionParser(
            prs.makeSequenceParser([
            multOperator,
            primaryExpr,
            ], "multExpressionSeq"),
            0, -1, "multExpressionRep"),
        ],
        "multExpression"
    );

    let addOperator = prs.makeAlternativeParser([
        prs.makeTokenParser("+"),
        prs.makeTokenParser("-"),
    ], "addOperation");

    let expression = prs.makeSequenceParser( [
        multExpression,
        prs.makeRepetitionParser(
            prs.makeSequenceParser([
            addOperator,
            multExpression,
        ], "addExpressionSeq"), 0,  -1,"addExpressionRep"),
    ], "addExpression");

    forwardExpr.setInner(expression);

    let statement = prs.makeSequenceParser([
        identifier,
        prs.makeTokenParser("="),
        expression
    ],"assignment");

    let statementList = prs.makeSequenceParser( [
        statement,
        prs.makeRepetitionParser(
            prs.makeSequenceParser( [
                prs.makeTokenParser(","),
                statement
            ], "statementListRep"),
            0, -1,"statementListCont"
        )
    ], "statementList");

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

    let parser = makeParser();

    let data = [
        "aaa=1",
        "c=1+2",
        "a=3+12/4",
        "d=b*(4-a*e)"
    ];
    let i = 0;
    for(i=0;i<data.length;++i) {
        runParser(parser, data[i]);
    }

}

testParser();

