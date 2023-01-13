# PUX scripting language design document

![pux](pux.jpg) - the pyx scripting langauge and REPL shell.

The programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

- the language is not typed, simple language - supposed to be used in a REPL/shell

- the runtime is interpreter that works on the AST (abstract syntax tree)

- syntax: go - like syntax (in the sense of: less frequent braces, but without strong typing)

- features: (in a flux right now)

```
 types
   strings, floating point numbers - yes
   lists - yes
   maps - yes
   objects - as syntax sugar for maps - NO
   type hints - NO
   f-strings - yes
 functions
  closures - YES
  named parameters - NO
  parameters with default values - yes
  multiple return values, multiple assignment - as list (similar to python) - yes
 yield / generators / with statement - maybe later....

 modules/packages - no
 try/catch - maybe later
```

Instead of a language definition you currently get these tests scripts [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)
