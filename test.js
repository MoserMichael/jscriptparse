
const path=require("node:path");
const scr=require(path.join(__dirname,"scripty.js"));
const rt=require(path.join(__dirname,"rt.js"));

class TestCase {
    constructor(sourceCode, expectedOutput="", expectSuccess= true) {
        this.sourceCode = sourceCode;
        this.expectedOutput = expectedOutput;
        this.expectSuccess = expectSuccess;
    }
}

let test_programs = [

//-----------
    new TestCase("aaa=1 println(aaa)", "1\n"),
//-----------
    new TestCase("a=3+12/4 println(a)", "6\n"),
//-----------
    new TestCase("b=2 a=3 e=4 d=b*(4-a*e) println(d)", "-16\n"),
//-----------
    new TestCase(`
def inc(x) {
    return x + 1
}
println(inc(21))
`, "22\n"),
//-----------
    new TestCase(`
def foo(val) {
    if val < 12
        println("should be happy years")
    elif val <= 30
        println("youth age")                
    else {
        println("after youth age")
    }
}
foo(6)
foo(20)
foo(42)
`,
`should be happy years
youth age
after youth age
`        ),
//-----------
    new TestCase(`
def fact(n) {
   if n<=1 {
      return 1
   }
   return n * fact(n-1)
}
println(fact(1))
println(fact(2))
println(fact(7))
`,
`1
2
5040
`        ),
//-----------
    new TestCase(`
def tri(a,b) {
    return sqrt(a * a + b * b)
 }    
 
 println( tri(3, 4) )
`,"5\n"),
//-----------
    new TestCase(`
    a = 2
    b = 3

    c = [ "product: ", a * b , " sum product of squares: ", (a *a) + (b * b) ]
    println(join(c))
    println(join([ "product: ", a * b , " sum product of squares: ", (a *a) + (b * b) ]))
`,
`product: 6 sum product of squares: 13
product: 6 sum product of squares: 13
`),
//-----------
    new TestCase(`
    this=3
    that=4
    print("sum: {this + that} product: {this * that} diff: {this - that}.")
`, "sum: 7 product: 12 diff: -1."),
//-----------
    new TestCase(`
    a=[1, 2, 3]
    tmp = a[0]
    a[0]=a[1]
    a[1]=a[2]
    a[2]=tmp
    println("first: {a[0]} second: {a[1]} third: {a[2]}")
` , "first: 2 second: 3 third: 1\n"),
//-----------
    new TestCase(`
    num = { 1: "one", 2: "two", 3: "three" }
    println("first: {num['1']} second: {num['2']} third: {num['3']}")
`, "first: one second: two third: three\n"),
//-----------
    new TestCase(`
    def makeAdder(num) {
        return def(arg) {
            return num + arg
       }
    }
    ad = makeAdder(10)
    println( ad(42) )
`, "52\n"),
//-----------
    new TestCase(`
    a = [1, 2, 3, 4]
    b = map(a, def(x) { return x * x })
    
    print("b: {b[0]} {b[1]} {b[2]} {b[3]}")
    
    c = reduce(b, def(x, y) { return x + y }, 0)
    println(c)        
`, "b: 1 4 9 1630\n"),

    new TestCase(`    
    def rec(num) {
        if num == 0 {
            return 1 / 0
        }
        return rec(num - 1)
    }        
    
    rec(5)
`,
`Error: Can't divide by zero
#(13)             return 1 / 0
       ....................^
#(12)     def rec(num) {
       ...^
#(11)         return rec(num - 1)
       ..............^
#(10)     def rec(num) {
       ...^
#(9)         return rec(num - 1)
      ..............^
#(8)     def rec(num) {
      ...^
#(7)         return rec(num - 1)
      ..............^
#(6)     def rec(num) {
      ...^
#(5)         return rec(num - 1)
      ..............^
#(4)     def rec(num) {
      ...^
#(3)         return rec(num - 1)
      ..............^
#(2)     def rec(num) {
      ...^
#(1)     rec(5)
      ...^
`, false),

    new TestCase(`    
    dct = { "persons": { "id": "323412343123", "name": "Michael", "surname": "Moser", "age": 52 }, "stuff": [3, 2, 1] }
    js = variable2json( dct )
    println( "json: {js}" )
    
    vl = json2variable(js)
    vl['persons']['id'] = 123
    vl['persons']['age'] = 22
    js = variable2json(vl)
    println( "json: {js}" )
       
`,
`json: {"persons":{"id":"323412343123","name":"Michael","surname":"Moser","age":52},"stuff":[3,2,1]}
json: {"persons":{"id":123,"name":"Michael","surname":"Moser","age":22},"stuff":[3,2,1]}
`)
];

let evalPrintMsg = "";

function logHook(msg) {
    evalPrintMsg += msg;
}

function testParser() {

    let parser = scr.makeParser();
    let showAst = false;

    let i = 0;
    let failures = 0;

    for(i=0;i<test_programs.length;++i) {
        let prog = test_programs[i];
        console.log("-------------------");
        console.log("Source:")
        console.log(prog.sourceCode);
        console.log("\nEvaluation:");

        evalPrintMsg = "";
        rt.setLogHook(logHook);

        let result = scr.runParserAndEval(parser, prog.sourceCode, showAst);

        console.log("--\n" + evalPrintMsg + "\n--");

        if (result != prog.expectSuccess) {
            failures += 1;
            continue;
        }

        if (prog.expectedOutput != null && prog.expectedOutput != evalPrintMsg) {
            console.log("Failure: output is not expected\n???\n" + prog.expectedOutput + "\n???");
            failures += 1;
        }
    }
    console.log("+++++++++++");
    if (failures == 0) {
        console.log("All tests passed")
    } else {
        console.log("SOME_TESTS_FAILED: Number of failed tests: " + failures + " out of " + test_programs.length);
    }
}

testParser();
