* PYX 0.2.1 / PRS 0.0.4  
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
                
