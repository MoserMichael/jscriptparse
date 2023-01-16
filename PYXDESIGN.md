# PUX scripting language design document

![pux](pux.jpg) - the pyx scripting langauge and REPL shell.

The programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

## Objective 

- an interpreted language that is easy to learn / educational programming language.
- must provide a [Read–eval–print loop/Shell](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop)  as a development environment.
- should provide for concise expression (map/reduce/short functions/possibly one line scripts)
- it should be easy to handle structured data, such as json.

## Features


- the language is not typed, simple language 

- the runtime is interpreter that works on the AST (abstract syntax tree)
  
  Strictness of semantics: should be similar to python: reading undefined variables is an error, does not allow too much type conversion.

- syntax: go - like syntax (in the sense of: less frequent braces, but without strong typing)

- features: (in a flux right now)

```
 types
   strings, floating point numbers - yes
   lists - yes
   maps - yes
   objects - as syntax sugar for maps - NO (can skip that, as an educational language) 
   type hints - NO
   f-strings - yes
 functions
  closures - YES
  named parameters - NO
  parameters with default values - yes
  multiple return values, multiple assignment - as list (similar to python) - yes
 yield / generators - yes
 with statement - later
 iterators - no (generators are good enough, less features)
 modules/packages - no (can skip that, as an educational language)
 try/catch - maybe later
```

Currently the language is defined by the [PEG parser](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js)

Also see these tests scripts [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)
