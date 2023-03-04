 * PYX 0.3.1 / PRS 0.0.4  
    * add import with namespace (use as)
    * split runtime library into base and runtime
    * add support for extension modules, these are written in javascript

 * PYX 0.2.8 / PRS 0.0.4  
    * add tests
    * round - add function to properly round to integer. (int is using parseInt - which is always rounding down)
    * some more check for NaN

 * PYX 0.2.7 / PRS 0.0.4  
    * More detailed diagnostics on errors with accessing list and strings (i think that is a very important detail - needs it's own release)

 * PYX 0.2.6 / PRS 0.0.4  
    * hotfix: fix very bad error - in assignment with multiple index expressions - bad error reporting when one of the intermediate lookups did not result in list or map.

 * PYX 0.2.5 / PRS 0.0.4  
    * rt: add dimInit (define array and clone each cell value) and clone (deep copy of argument value)
    * add mathconst.Infinity 
    * allow for negated expression like  -mathconst.Infinity (only had negative numbers, not negated expressions)
    * all arithmetic expressions and functions: throw errors in 'not a number' values in arithmetic functions/expressions. 
    * while checking for presence of yield: ignore function calls in statment list (statement body) - yield can't be delegated to called function.

* PYX 0.2.4 / PRS 0.0.4  
    * add bitwise functions
    * tutorial - add section on operators
    * got errors in reporting wrong types (in rtlib type checks)
    * rtlib - report error if numeric arguments are not a number.
    * fix bug in completion of hashes, when value does not exit map.novalue<tab tab> got exit from shell.

* PYX 0.2.3 / PRS 0.0.4  
    * fix associativity of operations (what a shame)
    * regular function calls (not closures): don't lookup variables in frame of calling function
    * show exact location of index lookup error
    * add command line option -s : to set the depth of reported stack frames
    * add test

* PYX 0.2.0 / PRS 0.0.4  
    * rt: add assert function (for tests)
    * comparison of value with none was not allowed, very bad bug
    * fix comparison with none (wow)
    * prevent eof stack in check for function with yield (no yield in object members)
    * limit displayed stack frames to 20 (as default)
    * rt: remove  setTrace and setErrorOnExecFail - instead add setPYXOption that does all of them

* PYX 0.1.9 / PRS 0.0.4  

    * REPL: some kind of shell command completion on writing back tick strings (doesn't work on windows)
    * docker test: test on both fedora and ubuntu, with the node version 19.x
 
* PYX 0.1.8 / PRS 0.0.4  
    
    * fix default function parameters.
    * Add description of default parameter in the tutorial
      (now wondering if the whole language doesn't have too many features :-( )

* PYX 0.1.7 / PRS 0.0.4  
 
    * more text in PYXTUT.md
    * fix some bad errors:
        - wrong handling of default parameters in function call
        - int - did not receive integer parameters
        - print/println - show spaces in output for multiple parameters
        - add tests

* PYX 0.1.6 / PRS 0.0.4  
    * Throw error on redefinition of built-in functions.
    * Add dim function - definition of multi-dimensional array (entries initialised with zero)
    * make PYXTUT.md more accessible. 

* PYX 0.1.5 / PRS 0.0.4  
     * improved error handling. 
     * improved runtime error reporting (says which parameter is wrong)
     * print/println - receive variable length argument number (like python)
                
