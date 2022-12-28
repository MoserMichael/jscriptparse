
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
   "func": [ "print", "println", "readFile", "writeFile" ]
 },
 { "name": "Functions on arrays",
    "func": [ "len", "join", "map", "reduce", "pop", "push", "joinl", "sort", "exists", "range", "mapIndex" ]
 },
 { "name": "functions for maps/hashes",
    "func": [ "each", "keys", "exists" ]
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
    "func": [ "mathconst", "ARGV", "ENV" ]
 }
]

def doIt() {
    println("# pyxfunc - PYX functions reference by category")
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

         if not first
            print("&nbsp;,&nbsp;")

         first = false

         print("<a href='#{link_name}'>{name}</a>")
      }
      println("")
    }
    println("")

    for e funcCats {
      for name e['func'] {

         link_name = link_map[name]
         println("<a id='{link_name}'/>")

         print("<hr>")
         fn = system("./pyx -e 'help({name})'")
         println("function: <b>{name}</b>")

         println("")
         println("```python")
         println(fn[0])
         println("```")
      }
    }
}

doIt()
