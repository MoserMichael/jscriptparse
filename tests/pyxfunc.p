
funcCats = [
 {
  "name": "Numeric functions",
  "func": [ "int", "round", "num", "max", "min", "abs", "sqrt", "sin", "cos", "tan", "atan", "pow", "random", "bit_and", "bit_or", "bit_xor", "bit_neg", "bit_shiftl", "bit_shiftr"  ]
 },
 { "name": "Functions for lists",
    "func": [ "dim", "dimInit", "len", "join", "map", "mid", "reduce", "reduceFromEnd", "pop", "push", "joinl", "sort", "exists", "range", "mapIndex", "shift", "unshift" ]
 },
 { "name": "Functions for maps",
    "func": [ "each", "keys", "exists", "len", "map" ]
 },
 {
 "name": "Functions for scalars or strings",
 "func": [ "find", "mid", "lc", "uc", "reverse", "str", "repeat", "len", "replace", "split", "trim" ]
 },
 {
  "name": "Functions for regular expressions",
  "func": [ "find", "split", "match", "matchAll", "replacere" ]
 },
 { "name": "functions for working with binary data",
     "func": [ "buffer", "mid", "len", "writeFile", "httpSendBinary", "readBinaryFile" ]
 },
 {
   "name": "Input and output functions",
   "func": [ "print", "println", "readFile", "writeFile", "readBinaryFile",  "httpSend", "httpSendBinary", "httpServer" ]
 },
 {
   "name": "Files for working with files",
   "func": [ "rename", "unlink", "isfile", "stat" ]
 },
 { "name": "Function for working with json/yaml",
   "func": [ "parseJsonString", "toJsonString", "parseYamlString", "toYamlString" ]
 },
 { "name": "functions for working with processes",
   "func": [ "system", "runcmd", "exit", "sleep", "exec", "kill", "chdir", "getcwd" ]
 },
 { "name": "Time functions",
   "func": [ "time", "localtime" ]
 },
 { "name": "Other functions",
   "func": [ "assert", "help", "type", "getPYXOptions", "setPYXOptions", "eval", "clone" ]
 },
 { "name": "Global variables",
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

      for name sort(e['func']) {
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
