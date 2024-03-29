# PUX scripting language design document

![pux](notes/pux.jpg) - the pyx scripting langauge and REPL shell.

The programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

## Objective 

- an interpreted language that is easy to learn / educational programming language
- save some complexity, by throwing out some of the features of a regular scripting language (only one number type, no classes here, fewer variants of 'import' - fewer than in python. No equivalent concept of a python package - but you can have modules by importing a single file)
- must provide a [Read–eval–print loop/Shell](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop)  as a development environment.
- should provide for concise expression (map/reduce/short functions/possibly one line scripts)
- it should be easy to handle structured data, such as json.
- integration with shell (the REPL/shell has tab completion for commands - upon writing a special backtick operator)
- the most important thing: readable and detailed error messages. Look at what I mean as error messages for accessing lists and strings

```
accessing a list [1,2,3]
Error: Can't lookup List entry - the index value must be a number. Instead got a String
#(errorTest/11-array-access.p:7)     println(a['aa'])
                               |...............^
#(errorTest/11-array-access.p:7)     println(a['aa'])
                               |.............^
#(errorTest/11-array-access.p:7)     println(a['aa'])
                               |.....^

Error: Can't lookup List entry - the index value is out of range. Got 4 - must be smaller than 3 and greater or equal to zero
#(errorTest/11-array-access.p:14)     println(a[4]) 
                                |...............^
#(errorTest/11-array-access.p:14)     println(a[4]) 
                                |.............^
#(errorTest/11-array-access.p:14)     println(a[4]) 
                                |.....^

Error: Can't lookup List entry - the index value is out of range. Got -1 - must be smaller than 3 and greater or equal to zero
#(errorTest/11-array-access.p:20)     println(a[-1])
                                |................^
#(errorTest/11-array-access.p:20)     println(a[-1])
                                |.............^
#(errorTest/11-array-access.p:20)     println(a[-1])
                                |.....^

Error: Can't assign this List index. Index value is out of range. Got 4 - must be smaller than 3 and greater or equal to zero
#(errorTest/11-array-access.p:26)     a[4] = 1
                                |.......^

Error: Can't assign this List index . Index value of must be an number, instead got b
#(errorTest/11-array-access.p:32)     a['b'] = 1
                                |.......^

accessing a string  abc
Error: Can't lookup String entry - the index value must be a number. Instead got a String
#(errorTest/11-array-access.p:42)     println(a['aa'])
                                |...............^
#(errorTest/11-array-access.p:42)     println(a['aa'])
                                |.............^
#(errorTest/11-array-access.p:42)     println(a['aa'])
                                |.....^

Error: Can't lookup String entry - the index value is out of range. Got 4 - must be smaller than 3 and greater or equal to zero
#(errorTest/11-array-access.p:49)     println(a[4]) 
                                |...............^
#(errorTest/11-array-access.p:49)     println(a[4]) 
                                |.............^
#(errorTest/11-array-access.p:49)     println(a[4]) 
                                |.....^

Error: Can't lookup String entry - the index value is out of range. Got -1 - must be smaller than 3 and greater or equal to zero
#(errorTest/11-array-access.p:55)     println(a[-1])
                                |................^
#(errorTest/11-array-access.p:55)     println(a[-1])
                                |.............^
#(errorTest/11-array-access.p:55)     println(a[-1])
                                |.....^

Error: Can't assign this String index. Index value is out of range. Got 4 - must be smaller than 3 and greater or equal to zero
#(errorTest/11-array-access.p:61)     a[4] = 'z'
                                |.......^

Error: Can't assign this String index . Index value of must be an number, instead got b
#(errorTest/11-array-access.p:67)     a['b'] = 1
                                |.......^

Error: Can't assign string index to List right handd side value must be a string
#(errorTest/11-array-access.p:73)     a[0]=[1,2,3]
                                |.......^

```

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

- leave out confusing features
    - no += -= operators (can do a = a + 1 - bit more verbose)
    for logical operators - require and or (instead of && ||)
    - don't have 2 ** 3 for power, have a function instead
    don't have bitwise operators & | ^ ~ - have functions instead
    - object system: you can have objects as maps with elements that are closures, but don't have equivalent of javascript prototypes or python classes/metaclasses 
    (i think these concepts are a bit too difficult to teach, also you can do without it in a shell)

- features: (in a flux right now)

```
 types
   strings, floating point numbers - yes
   lists - yes
   maps - yes
   objects - as syntax sugar for maps - yes (but no prototypes or classes) 
   type hints - no
   f-strings - yes
   regular expressions - yes

 functions
   closures - YES
   named parameters - no
   parameters with default values - yes
   multiple return values, multiple assignment - as list (similar to python) - yes

f-strings - yes

 yield / generators - yes
 iterators - no (generators are good enough, less features)
 
 include of source code in another file - yes
 modules/packages - no (can skip that, as an educational language)


try/catch - yes
with statement - later(?)


```

Currently the language is defined by the [PEG parser](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js)

Also see these tests scripts [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)

