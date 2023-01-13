## prs.js - A small Javascript module for building parser combinators

A module to build parser combinators ```prs.js``` - the resulting parser is a top-down parser, also known a parsing expression parser [PEG](https://en.wikipedia.org/wiki/Parsing_expression_grammar)

This is a standalone script, you can use it both with nodejs and in a browser.
See the [generated documentation](https://mosermichael.github.io/jscriptparse/out/index.html)

## pyx scripting language

![pux](pux.jpg) - the pyx scripting langauge and REPL shell.

The scripting language and interpreter for the pyx language. 

- the interpreter/repl script is [here](https://github.com/MoserMichael/jscriptparse/blob/main/pyx) - you need to have node installed for this.
- Example tests scripts are [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)
- The parser/syntax tree is built [here](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js) the runtime for the interpeter is [here](https://github.com/MoserMichael/jscriptparse/blob/main/rt.js) 

(don't judge the scripting language too harshly, it is my new tinker toy - very much a work in progress)
 
## Documentation of the module

See the [generated documentation](https://mosermichael.github.io/jscriptparse/out/index.html)

## what I learned while writing this project

i am learning about interpreted languages (such as python, php, javascript, perl, etc...) 
Now I keep noticing quite a lot of details, while writing my little interpreter. I am keeping some notes [here](https://github.com/MoserMichael/jscriptparse/blob/main/notes/notes.txt)

The moral: you can learn a lot with this type of project! (i think the important part is to keep notes, otherwise you tend to forget the details...)

