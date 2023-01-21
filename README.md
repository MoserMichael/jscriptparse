## pyx scripting language

![pux](notes/pux.jpg) - the pyx educational programming language / scripting langauge and REPL shell.

This programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

The scripting language and interpreter for the pyx language.  

- See [pyx tutorial (pyxtut)](PYXTUT.md)
- See [pyx functions by category (pyxfunc)](PYXFUNC.md)
- see the [design document (pyxdesign)](PYXDESIGN.md)
- Example tests scripts are [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) - see files with extension .p (.out - expected output of the script)

/don't judge the scripting language too harshly, it is my new tinker toy - very much a work in progress/

## Running it

- you need to have ```nodejs``` and ```git``` installed on the system
- run the shell: as follows:
```
git clone https://github.com/MoserMichael/jscriptparse.git
cd jscriptparse
./pyx
```

The shell has command completion (tab tab) and a command history (cursor up, cursor down)

## Source code 

- the interpreter/repl script is [here](https://github.com/MoserMichael/jscriptparse/blob/main/pyx) - you need to have node installed for this.
- The parser/syntax tree is built [here](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js) the runtime for the interpeter is [here](https://github.com/MoserMichael/jscriptparse/blob/main/rt.js) 


## what I learned while writing this project

i am learning about interpreted languages (such as python, php, javascript, perl, etc...) 
Now I keep noticing quite a lot of details, while writing my little interpreter. I am keeping some notes [here](https://github.com/MoserMichael/jscriptparse/blob/main/notes/notes.txt)

The moral: you can learn a lot with this type of project! (i think the important part is to keep notes, otherwise you tend to forget the details...)

