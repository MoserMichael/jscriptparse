# PUX scripting language design document

![pux](notes/pux.jpg) - the pyx scripting langauge and REPL shell.

The programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

## Objective 

- an interpreted language that is easy to learn / educational programming language
- save some complexity, by throwing out some of the features of a regular scripting language (no classes here, no separated namespaces/imports - you can still include source into the same namespace)
- must provide a [Read–eval–print loop/Shell](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop)  as a development environment.
- should provide for concise expression (map/reduce/short functions/possibly one line scripts)
- it should be easy to handle structured data, such as json.

Now the interesting part is that all these features are also required for a good shell. I think we need a shell that is better at handling complex nested data, you have that a lot when dealing with JSON and YAML. I think the bash language is reaching it's limits, when dealing with this class of problem: it is possible to deal do that with jq, but it's not a very easy and pleasant thing to do.

However the objective of a general purpose shell may be out of scope, due to the following reasons:
- The current project is written in nodejs/javascript; now a shell is more resource constrained environment. This means that the current approach is not quite optimal for an OS shell. However it may be possible to rewrite this solution in Rust, if needed. 
- need to add lots of features, again (like regular expressions etc. etc). This might contradict the primary goal.

## Features

- the language is not typed, simple language 

- the runtime is interpreter that works on the AST (abstract syntax tree)
  
  Strictness of semantics: should be similar to python: 
    - reading undefined variables is an error, 
    - do not allow too much type conversion. (don't allow to add string to number - unlike javascript)
    - multi assignment: it is an error if the number of elements in the right hand side does not match the number of left hand side

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
   regular expressions - (don't have them yet)

 functions
   closures - YES
   named parameters - NO
   parameters with default values - yes
   multiple return values, multiple assignment - as list (similar to python) - yes

f-strings - yes

 yield / generators - yes
 iterators - no (generators are good enough, less features)
 
 include of source code in another file - yes
 modules/packages - no (can skip that, as an educational language)


with statement - later
 try/catch - maybe later


```

Currently the language is defined by the [PEG parser](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js)

Also see these tests scripts [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)

