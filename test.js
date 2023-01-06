
const scr=require("./scripty.js");

function testParser() {

    //prs.setTrace(true);

    let parser = scr.makeParser();

    let data = [
        "aaa=1 print(aaa)",

        "a=3+12/4 print(a)",

        "b=2 a=3 e=4 d=b*(4-a*e) print(d)",

        `
function inc(x) {
    return x + 1
}
print(21)
`,

`
function foo(val) {
    if val < 12
        print("should be happy years")
    elif val <= 30
        print("youth age")                
    else {
        print("after youth age")
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
print(fact(1))
print(fact(2))
print(fact(7))
`,

`
function tri(a,b) {
    return a * a + b * b
 }    
 
 print( tri(3, 4) )
`,

`
    a = 2
    b = 3

    c = [ "product: ", a * b , " sum product of squares: ", (a *a) + (b * b) ]
    print(join(c))
    print(join([ "product: ", a * b , " sum product of squares: ", (a *a) + (b * b) ]))
`,

        `
    this=3
    that=4
    print("sum: {this + that} product: {this * that} diff: {this - that}.")
`,

`
    a=[1, 2, 3]
    tmp = a[0]
    a[0]=a[1]
    a[1]=a[2]
    a[2]=tmp
    print("first: {a[0]} second: {a[1]} third: {a[2]}")
`,
`
    num = { 1: "one", 2: "two", 3: "three" }
    print("first: {num['1']} second: {num['2']} third: {num['3']}")
`,
`
    function makeAdder(num) {
        return function(arg) {
            return num + arg
       }
    }
    
    ad = makeAdder(10);
    print( ad(42) )
`
    ];

    let i = 0;
    for(i=0;i<data.length;++i) {
        scr.runParser(parser, data[i], true);
    }
}

testParser();
