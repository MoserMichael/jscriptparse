
funcCats = [
 {
 "name": "functions on scalars or strings",
 "func": [ "find", "mid", "lc", "uc", "reverse", "str", "repeat", "len" ]
 },
 {
  "name": "Numeric functions",
  "func": [ "int", "max", "min", "abs", "sqrt", "sin", "cos", "tan", "atan", "pow", "random" ]
 },
 {
   "name": "Input and output functions",
   "func": [ "print", "println" ]
 },
 { "name": "Functions on arrays",
    "func": [ "len", "join", "map", "reduce", "pop", "push", "joinl", "keys", "sort", "exists", "range" ]
 },
 { "name": "function with json",
   "func": [ "parseJsonString", "toJsonString" ]
 },
 { "name": "functions for working with processes",
   "func": [ "system", "exit" ]
 },
 { "name": "Other functions",
   "func": [ "help", "type", "time", "localtime" ]
 },
 { "name": "global variables",
    "func": [ "mathconst", "ARGV", "ARGC" ]
 }
]

def doIt() {
    for e funcCats {
      println("# {e['name']}")
      for name e['func'] {
         print("<a href='#{name}'>{name}</a>&nbsp;")
      }
      println("")
    }
    println("")

    for e funcCats {
      println("<a name='#{name}'/>### {e['name']}")
      for name e['func'] {
         print("<hr>")
         fn = system("./pyx -e 'help({name})'")
         println("function: {name}")
         println("```")
         println(fn[0])
         println("```")
      }
    }
}

doIt()
