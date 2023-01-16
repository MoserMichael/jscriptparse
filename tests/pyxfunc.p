
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
    println("#PYX functions by Category")
    println("")

    link_num=1
    link_map={}

    for e funcCats {
      println("## {e['name']}")
      first = true

      for name e['func'] {
         link_name="s-{link_num}"
         if exists(name, link_map)
           link_name = link_map[name]
         else
           link_name="s-{link_num}"
           link_map[name] = link_name
           link_num = link_num + 1

         if not first print(";&nbsp")
           first = false

         print("<a href='#{link_name}'>{name}</a>&nbsp;")
      }
      println("")
    }
    println("")

    for e funcCats {
      for name e['func'] {

         link_name = link_map[name]
         println("<a id='{link_name}'/>\n## {e['name']}")

         print("<hr>")
         fn = system("./pyx -e 'help({name})'")
         println("function: {name}")

         println("")
         println("```")
         println(fn[0])
         println("```")
      }
    }
}

doIt()
