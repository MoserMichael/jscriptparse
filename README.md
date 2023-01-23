## pyx scripting language

![pux](notes/pux.jpg) - the pyx educational programming language / scripting langauge and REPL shell.  With pyx you can write code in functional and procedural style.

This programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

The scripting language and interpreter for the pyx language.  

- See [pyx tutorial (pyxtut)](PYXTUT.md)
- See [pyx functions by category (pyxfunc)](PYXFUNC.md)
- see the [design document (pyxdesign)](PYXDESIGN.md)
- Example tests scripts are [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)

## Running it

First we need the to install node.js - you can download an installer [here](https://nodejs.org/en/download/)

Now, from the command line: Install the pyx shell with the following command 

```npm install pyxlang -g```

Now run the shell 

```pyx```

The shell has command completion (tab tab) and a command history (cursor up, cursor down)

You can also run one-line commands as follows

```
pyx -e 'println("hello world")'
```

or run any saved source file with

```
pyx source.p
```

You can also run the program in trace mode, by ading the ```-x``` option. Here each statement is shown, as it is executed.

```
./pyx -x tests/03-func-if.p
foo(val=6)
+ if true
+ println("should be happy years") {
should be happy years
+ }
+ }
foo(val=20)
+ if false # <pass>
+ elif true
+ println("youth age") {
youth age
+ }
+ }
foo(val=42)
+ if false # <pass>
+ elif false # <pass>
+ else
+ println("after youth age") {
after youth age
+ }
+ }
+ }
```

## Source code 

- the interpreter/repl script is [here](https://github.com/MoserMichael/jscriptparse/blob/main/pyx) - you need to have node installed for this.
- The parser/syntax tree is built [here](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js) the runtime for the interpeter is [here](https://github.com/MoserMichael/jscriptparse/blob/main/rt.js) 


## what I learned while writing this project

i am learning about interpreted languages (such as python, php, javascript, perl, etc...) 
Now I keep noticing quite a lot of details, while writing my little interpreter. I am keeping some notes [here](https://github.com/MoserMichael/jscriptparse/blob/main/notes/notes.txt)

The moral: you can learn a lot with this type of project! (i think the important part is to keep notes, otherwise you tend to forget the details...)

