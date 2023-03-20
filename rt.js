const path=require("node:path");
const fs=require("node:fs");
const cp=require("node:child_process");
const http = require('node:http');
let https = null;
let httpsAgent = null;
try {
    https = require('node:https');
    httpsAgent = new https.Agent({ keepAlive: true });
} catch(e) {
    
}

const url = require('node:url');
const yaml=require("yaml");
const prs=require(path.join(__dirname,"prs.js"));
const bs=require(path.join(__dirname,"rtbase.js"));

const httpAgent = new http.Agent({ keepAlive: true });


const showJavascriptStack = false;

// callback for running evaluator
let evalCallback = null;

function setEvalCallback(cb) {
    evalCallback = cb;
}

// the file that is being parsed right now. Can't pass that around.
// Should be thread local, or something like this.
let currentSourceInfo = null;

function setCurrentSourceInfo(info) {
    let prevValue = currentSourceInfo;
    currentSourceInfo = info;
    return prevValue;
}

// if set - throw exception if executing a process fails / returns error status
let errorOnExecFail = false;

function setErrorOnExecFail(on) {
    errorOnExecFail = on;
}

function _getEnv(frame) {
    let [val, _ ] = frame.lookup("ENV");

    if (val == null || val.type != bs.TYPE_MAP) {
        return {};
    }

    let envDct = {}
    for (let [key, value] of Object.entries(val.val)) {
        envDct[key] = bs.value2Str(value);
    }
    return envDct;
}

function _system(cmd, frame) {
    let status = 0;
    let out = "";

    let env = _getEnv(frame);
    try {
        out = cp.execSync(cmd,{env: env}).toString();
    } catch(e) {
        console.log("failed to run: " + cmd + " error: " + e.message);
        status = 1;//e.status;
        out = e.message;
        throw e;
    }
    if (status !=0 && errorOnExecFail) {
        throw new bs.RuntimeException("failed to run `" + cmd + "` : " + out);
    }
    let val = [ new bs.Value(bs.TYPE_STR, out), new bs.Value(bs.TYPE_NUM, status) ];
    return new bs.Value(bs.TYPE_LIST, val);
}

function isBascType(ty) {
    return ty==bs.TYPE_BOOL || ty == bs.TYPE_NUM || ty == bs.TYPE_STR || ty == bs.TYPE_REGEX || ty ==  bs.TYPE_NONE;
}

function printImpl(arg) {
    let ret = "";
    for(let i=0; i<arg.length; ++i) {
        if (i != 0) {
            ret += " ";
        }    
        let val=arg[i];
        if (isBascType(val.type))
            ret += bs.value2Str2(val);
        else
            ret += bs.rtValueToJson(val);
    }
    return ret;
}

function dimArray(currentDim, dims) {
    let n = dims[currentDim];
    let val = [];
    if (currentDim != dims.length-1) {
        for (let i = 0; i < n; ++i) {
            val[i] = dimArray( currentDim + 1, dims);
        }
    } else {
        for (let i = 0; i < n; ++i) {
            val[i] = new bs.Value(bs.TYPE_NUM, 0);
        }
    }
    return new bs.Value(bs.TYPE_LIST, val);
}

function dimArrayInit(initValue, currentDim, dims) {
    let n = dims[currentDim];
    let val = [];
    if (currentDim != dims.length-1) {
        for (let i = 0; i < n; ++i) {
            val[i] = dimArrayInit(  initValue, currentDim + 1, dims);
        }
    } else {
        for (let i = 0; i < n; ++i) {
            val[i] = bs.cloneAll(initValue);
        }
    }
    return new bs.Value(bs.TYPE_LIST, val);
}

function * genValues(val) {
    if (val.type == bs.TYPE_LIST) {
        for(let i=0; i <val.val.length; ++i) {
            yield val.val[i];
        }
    }
    if (val.type == bs.TYPE_MAP) {
        for (let keyVal of Object.entries(val.val)) {
            let yval = [ new bs.Value(bs.TYPE_STR, keyVal[0]), keyVal[1] ];
            yield new bs.Value(bs.TYPE_LIST, yval);
        }
    }
}

// pythons default float type does not allow Not-a-number - keep it with that...a
// (that makes for less to explain)
function checkResNan(res) {
    if (isNaN(res)) {
        throw new bs.RuntimeException("results in 'not a number' - that's not allowed here");
    }
    return res;
}

function makeHttpCallbackInvocationParams(httpReq, httpRes, requestData) {

    let req_ = new bs.Value(bs.TYPE_MAP, {
        'url_' : new bs.Value(bs.TYPE_STR, httpReq.url),

        'url' : new bs.BuiltinFunctionValue(``, 0, function() {
            return new bs.Value(bs.TYPE_STR,  httpReq.url );
        }),
        'method' : new bs.BuiltinFunctionValue(``, 0, function() {
            return new bs.Value(bs.TYPE_STR, httpReq.method );
        }),
        'query' : new bs.BuiltinFunctionValue(``, 0, function() {
            return bs.jsValueToRtVal(httpReq.query);
        }),
        'headers' : new bs.BuiltinFunctionValue(``, 0, function() {
            return new bs.jsValueToRtVal(httpReq.headers);
        }),
        'header' : new bs.BuiltinFunctionValue(``, 1, function(arg) {
            let name = bs.value2Str(arg, 0);
            let val = httpReq.headers[name.toLowerCase()];
            return new bs.jsValueToRtVal(val);
        }),
        'requestData' : new bs.BuiltinFunctionValue(``, 0, function(arg) {
            return new bs.Value(bs.TYPE_STR, requestData );
        }),
    });

    let res_ = new bs.Value(bs.TYPE_MAP, {

        'setHeader': new bs.BuiltinFunctionValue(``, 2, function(arg) {
            httpRes.setHeader(bs.value2Str(arg, 0), bs.rtValueToJsVal(arg[1].val));
            return bs.VALUE_NONE;
        }),

        'send': new bs.BuiltinFunctionValue(``,3, function(arg) {

            let code = arg[0];
            let textResponse = bs.value2Str(arg, 1);
            let contentType = "text/plain"

            if (code.type != bs.TYPE_NUM) {
                throw new bs.RuntimeException("first argument: expected number")
            }

            if (arg[2] != null) {
                contentType = bs.value2Str(arg, 2);
            }

            let respHeader = {};

            if (httpRes.getHeader("Content-Length") == null) {
                respHeader['Content-length'] = textResponse.length.toString();
            }
            if (httpRes.getHeader("Content-Type") == null) {
                respHeader['Content-Type'] = contentType;
            }

            //console.log("status: " + code.val + " resp-hdr: " + JSON.stringify(respHeader));

            httpRes.writeHead(parseInt(code.val), respHeader);
            httpRes.write(textResponse);
            httpRes.end();
            //httpRes.end(textResponse);

            //console.log("eof send: " + textResponse);
            return bs.VALUE_NONE;
        }, [null, null, null])
    });


    return [ req_, res_ ];
}

function makeHttpServerListener(callback, frame) {
    return function (req, res) {

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const data = Buffer.concat(chunks);

            // got the request data as well!

            // this one is evaluated from another task. runtime exceptions need to be handled here
            try {
                let vargs =  makeHttpCallbackInvocationParams(req,res, data);
                bs.evalClosure("", callback, vargs, frame);
            } catch(er) {
                if (er instanceof bs.RuntimeException) {
                    er.showStackTrace(true);
                } else {
                    throw er;
                }
            }

        })


    };
}

// maps between process id and node childprocess object.
let spawnedProcesses = {};

// the runtime library is defined here
bs.RTLIB={

    // function on scalars or strings
    "find": new bs.BuiltinFunctionValue(` 
# search for a string (second argument) in a big string (first argument)
# return indexs of match (zero based index, first match is position zero, if no match -1)

> find("big cat", "big")
0
> find("big cat", "cat")
4
> find("big cat", "bear")
-1

#using regular expressions

> a='123412342 piglet $%#@#$#@%'
"123412342 piglet $%#@#$#@%"

> find(a,/[a-z]+/)
10

# the third parameter is an optional offset to start search from. (zero based index)

> find("a1 !! a1", "a1", 2)
6

> find("a1 !! a1", /[a-z0-9]+/, 2)
6

`, 3, function(arg) {
        let hay = bs.value2Str(arg, 0);
        let index = 0;

        if (arg[2] != null) {
            index = parseInt(bs.value2Num(arg, 2));
        }

        if (arg[1].type == bs.TYPE_REGEX) {
            if (index != 0) {
                hay = hay.substring(index);
            }
            let matches = hay.search(arg[1].regex);
            if (matches != -1) {
                matches += index;
            }
            return new bs.Value(bs.TYPE_NUM, matches);
        }

        let needle = bs.value2Str(arg, 1);
        let res = hay.indexOf(needle, index)
        return new bs.Value(bs.TYPE_NUM, res);
    }, [null, null, null]),


    "match": new bs.BuiltinFunctionValue(`
# search for a match of regular expression argument (second) argument) in big text (first argument)
# returns a list - first element is zero based index of match, second is the matching string

> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> match(text,/[0-9]+/)
[2,"1232"]    

`, 3, function(arg) {
        let hay = bs.value2Str(arg, 0);

        bs.checkType(arg, 1, bs.TYPE_REGEX)

        let ret = hay.match(arg[1].regex);

        if (ret == null) {
            return [ -1, "" ];
        }
        return new bs.Value(bs.TYPE_LIST, [ new bs.Value(bs.TYPE_NUM, ret['index']), new bs.Value(bs.TYPE_STR, ret[0]) ]);
    }, [null, null, null]),

    "matchAll": new bs.BuiltinFunctionValue(`
> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> matchAll(text,/[0-9]+/)
[[2,"1232"],[17,"34234"],[37,"3423"]]

`, 3, function(arg) {
        let hay = bs.value2Str(arg, 0);
        let ret = []

        bs.checkType(arg, 1, bs.TYPE_REGEX)

        let lenConsumed = 0;

        while(true) {
            let mval = hay.match(arg[1].regex);
            if (mval == null) {
                break;
            }
            let index = mval['index'];

            let r = [ new bs.Value(bs.TYPE_NUM, lenConsumed + index), new bs.Value(bs.TYPE_STR, mval[0]) ];
            ret.push( new bs.Value(bs.TYPE_LIST, r ) );

            let toAdd = mval[0].length;
            if (toAdd == 0) {
                toAdd = 1;
            }
            hay = hay.substring( index + toAdd );
            lenConsumed += index + mval[0].length;

        }
        return new bs.Value(bs.TYPE_LIST, ret );
    }, [null, null, null]),


    "mid": new bs.BuiltinFunctionValue(`
# returns a substring in the text, first argument is the text, 
# second argument is the start offset, third argument is ending offset (optional)

> mid("I am me", 2, 4)
"am"
> mid("I am me", 2)
"am me"
> mid("I am me", 2, -1)
"am me"
`, 3, function(arg) {
        let sval = bs.value2Str(arg, 0);
        let from = parseInt(bs.value2Num(arg[1]), 10);
        let to = null;

        if (arg[2] != null) {
            if (arg[2].type == bs.TYPE_NUM) {
                to = arg[2].val;
            } else {
                to = parseInt(bs.value2Num(arg[2]), 10);
            }
        }

        if (to == -1) {
            sval = sval.substring(from)
        } else {
            sval = sval.substring(from, to);
        }

        return new bs.Value(bs.TYPE_STR, sval);
    }, [null, null, new bs.Value(bs.TYPE_NUM, -1) ]),
    "lc": new bs.BuiltinFunctionValue(`# convert to lower case string
> lc("BIG little")
"big little"`, 1, function(arg) {
        let val = bs.value2Str(arg, 0);
        return new bs.Value(bs.TYPE_STR, val.toLowerCase());
    }),
    "uc": new bs.BuiltinFunctionValue(`# convert to upper case string
> uc("BIG little")
"BIG LITTLE"`, 1, function(arg) {
        let val = bs.value2Str(arg, 0);
        return new bs.Value(bs.TYPE_STR, val.toUpperCase());
    }),
    "trim": new bs.BuiltinFunctionValue(`# remove leading and trailing whitespace characters

> a= ' honey  '
" honey  "
> trim(a)
"honey"
> a= '\\t\\n a lot of honey honey \\n '
"\\t\\n a lot of honey honey \\n "
> trim(a)
"a lot of honey honey"`, 1, function(arg) {
        let val = bs.value2Str(arg, 0);
        return new bs.Value(bs.TYPE_STR, val.trim());
    }),
    "reverse": new bs.BuiltinFunctionValue(`# return the reverse of the argument (either string or list argument)

> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"`, 1, function(arg) {
        if (arg[0].type == bs.TYPE_LIST) {
            return new bs.Value(bs.TYPE_LIST, arg[0].val.reverse());
        }
        let val = bs.value2Str(arg, 0);
        return new bs.Value(bs.TYPE_STR, val.split("").reverse().join(""));
    }),
    "split": new bs.BuiltinFunctionValue(`
# split the first argument string into tokens, the second argument specifies how to split it.

> split("first line\\nsecond line")
["first line","second line"]
> split("a,b,c", ",")
["a","b","c"]

> split("a:b:c", ":")
["a","b","c"]

> split("a:b:c", "")
["a",":","b",":","c"]

# Regular expressions

> a="Roo : Kanga :: Piglet ::: Pooh"
"Roo : Kanga :: Piglet ::: Pooh"

> split(a, /:+/)
["Roo "," Kanga "," Piglet "," Pooh"]

`, 2,function *(arg, frame) {
        let hay = bs.value2Str(arg, 0);
        let delim = "\n";

        if (arg[1] != null) {
            if (arg[1].type == bs.TYPE_REGEX) {
                delim = arg[1].regex;
            } else {
                delim = bs.value2Str(arg, 1);
            }
        }
        for(let n of hay.split(delim)) {
            yield new bs.Value(bs.TYPE_STR, n);
        }
    }, [null, null], true),
    "str": new bs.BuiltinFunctionValue(`> str(123)
"123"
> str("abc")
"abc"`, 1, function(arg) {
        let val = bs.value2Str(arg, 0);
        return new bs.Value(bs.TYPE_STR, val);
    }),
    "repeat" : new bs.BuiltinFunctionValue(`> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"`, 2, function(arg) {
        let val = bs.value2Str(arg, 0);
        let rep = bs.value2Num(arg, 1);
        return new bs.Value(bs.TYPE_STR, val.repeat(rep));
    }),

    "replace": new bs.BuiltinFunctionValue(`
# replace replace occurances of second argument string with third argument string in text.
# first arugment - the text
# second argument - string to search for
# third argument - string to replace the match
# fourth argument (optional) - number of matches to substitute (1 is default) 

text="a b a c a d"
> "a b a c a d"
        
> replace(text,'a ', 'x ', -1)
"x b x c x d"        

> replace(text,'a ', 'x ', 1)
"x b a c a d"

> replace(text,'a ', 'x ')
"x b a c a d"

> replace(text,'a ', 'x ', 2)
"x b x c a d"
`, 4, function(arg) {
        let hay = bs.value2Str(arg, 0);

        let needle = bs.value2Str(arg, 1);
        let newNeedle = bs.value2Str(arg, 2);
        let numTimes = 1;


        if (arg[3] != null) {
            numTimes = parseInt(bs.value2Num(arg, 3));
        }


        let retVal = "";
        for(let start=0; start < hay.length; numTimes -= 1) {
            let findPos = hay.indexOf(needle, start);
            if (findPos == -1 || numTimes == 0) {
               retVal += hay.substring(start);
               break;
            }
            retVal += hay.substring(start, findPos) + newNeedle;
            start = findPos + needle.length;
        }
        return new bs.Value(bs.TYPE_STR, retVal);
    }, [null, null, null, null]),


    "replacere": new bs.BuiltinFunctionValue(`
# replace the regular expression (second argument) with replacement expression (third argument) 
# in source text (first argument)
    
> text="Pooh,Bear ## Roo,Kanga ## Christopher,Robin "
"Pooh,Bear ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1")
"Bear,Pooh ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1", 1)
"Bear,Pooh ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1", -1)
"Bear,Pooh ## Kanga,Roo ## Robin,Christopher "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2,$1", 2)
"Bear,Pooh ## Kanga,Roo ## Christopher,Robin "
    
`, 4, function(arg) {
        let hay = bs.value2Str(arg, 0);

        bs.checkType(arg, 1, bs.TYPE_REGEX)

        let needle = arg[1].regex;
        let newNeedle = bs.value2Str(arg, 2);
        let numTimes = 1;

        if (arg[3] != null) {
            numTimes = parseInt(bs.value2Num(arg, 3));
        }

        let retVal = "";
        for(;;numTimes -= 1) {

            let ret = hay.match(needle)
            if (ret == null || numTimes == 0) {
                retVal += hay;
                break;
            }

            retVal += hay.substring(0, ret['index']);
            retVal += ret[0].replace(needle, newNeedle )

            // prepare next iteration
            let posAfterMatch = ret['index'] + ret[0].length;
            hay = hay.substring(posAfterMatch);
        }
        return new bs.Value(bs.TYPE_STR, retVal);
    }, [null, null, null, null]),

// Numeric functions
    "int": new bs.BuiltinFunctionValue(`# convert argument string or number to integer value

> int("123")
123
> int("123.5")
123
> int(123.5)
123
> int(123)
123

# beware! numbers are rounded down
> int('3.7')
3
> int(3.7)
3

# hexadecimal number conversion

> int("0xff")
255

> int("ff", 16)
255

# octal number

> int("444", 8)
292

`, 2, function(arg) {
        bs.checkTypeList(arg, 0, [bs.TYPE_STR, bs.TYPE_REGEX, bs.TYPE_NUM]);

        let sval = bs.value2Str(arg, 0);
        let radix = 10;

        if (arg[1] != null) {
            radix = parseInt(bs.value2Str(arg, 1));
        }

        if (sval.startsWith("0x")) {
            radix = 16;
        }

        let res = parseInt(sval, radix);

        if (res == null) {
            throw new bs.RuntimeException("Can't convert " + arg[0].val + " to integer with base " + parseInt(arg[1].val));
        }
        return new bs.Value(bs.TYPE_NUM, checkResNan(res));
    }, [null, null]),

    "num": new bs.BuiltinFunctionValue(`
#  convert argument string to floating point number, if number - returns the same number value 

> num('3.7')
3.7

> num('.37e2')
37
`, 1, function(arg) {
        bs.checkTypeList(arg, 0, [bs.TYPE_STR, bs.TYPE_NUM]);

        let sval = bs.value2Str(arg, 0);
        let res = parseFloat(sval);

        if (res == null) {
            throw new bs.RuntimeException("Can't convert " + sval + " to floating point number.");
        }
        return new bs.Value(bs.TYPE_NUM, checkResNan(res));
    }),

    "round": new bs.BuiltinFunctionValue(`
#  convert an argument value to an integer value - without rounding down 

> round(3.2)
3

> round('3.2')
3

> round(3.7)
4

> round('3.7')
4
`, 1, function(arg) {
        bs.checkTypeList(arg, 0, [bs.TYPE_NUM,bs.TYPE_STR]);

        let res = Math.round(bs.value2Num(arg,0));
        return new bs.Value(bs.TYPE_NUM, checkResNan(res));
    }),



    "bit_and":  new bs.BuiltinFunctionValue(`
# bitwise and, both argument must be numbers with integer values (not floating point values)

> bit_and(4,5)
4

> bit_and(1,3)
1    
`, 2, function(arg) {
       let first = bs.requireInt(arg,0);
       let second = bs.requireInt(arg,1);
       return new bs.Value(bs.TYPE_NUM, first & second);
    }),

    "bit_or":  new bs.BuiltinFunctionValue(`
# bitwise or, both argument must be numbers with integer values (not floating point values)

> bit_or(1,2)
3        
`, 2, function(arg) {
        let first = bs.requireInt(arg,0);
        let second = bs.requireInt(arg,1);
        return new bs.Value(bs.TYPE_NUM, first | second);
    }),

    "bit_xor":  new bs.BuiltinFunctionValue(`
# bitwise xor, both argument must be numbers with integer values (not floating point values)

> bit_xor(1,7)
6            
`, 2, function(arg) {
        let first = bs.requireInt(arg,0);
        let second = bs.requireInt(arg,1);
        return new bs.Value(bs.TYPE_NUM, first ^ second);
    }),

    "bit_shiftl":  new bs.BuiltinFunctionValue(`
# bitwise shift left, both argument must be numbers with integer values (not floating point values)

> bit_shiftl(1,3)
8                
`, 2, function(arg) {
        let first = bs.requireInt(arg,0);
        let second = bs.requireInt(arg,1);
        return new bs.Value(bs.TYPE_NUM, checkResNan(first << second));
    }),

    "bit_shiftr":  new bs.BuiltinFunctionValue(`
# bitwise shift right, both argument must be numbers with integer values (not floating point values)

> bit_shiftr(8,3)
1                    
`, 2, function(arg) {
        let first = bs.requireInt(arg,0);
        let second = bs.requireInt(arg,1);
        return new bs.Value(bs.TYPE_NUM, checkResNan(first >> second));
    }),

    "bit_neg":  new bs.BuiltinFunctionValue(`
# bitwise negation, the argument must be numbers with integer value (not floating point value)                        
`, 1, function(arg) {
        let first = bs.requireInt(arg,0);
        return new bs.Value(bs.TYPE_NUM, ~first)
    }),

    "max" : new bs.BuiltinFunctionValue(`
# return the biggest of the argument values, can take any number of arguments

> max(3,4)
4

> max(4,3)
4

> max(1,4,2,10)
1

`, -1, function(arg) {

        let maxVal = Number.NEGATIVE_INFINITY;
        for(let i=0; i<arg.length; ++i) {
            let val = bs.value2Num(arg,i);
            if (val > maxVal) {
                maxVal = val;
            }
        }
        return new bs.Value(bs.TYPE_NUM, maxVal);
    }),
    "min" : new bs.BuiltinFunctionValue(`
# return the smallest of the argument values, can take any number of arguments

> min(4,3)
3

> min(3,4)
3

> min(20,3,100,1)
1
`, -1, function(arg) {
        let minVal = Number.POSITIVE_INFINITY;
        for(let i=0; i<arg.length; ++i) {
            let val = bs.value2Num(arg,i);
            if (val < minVal) {
                minVal = val;
            }
        }
        return new bs.Value(bs.TYPE_NUM, minVal);
    }),
    "abs" : new bs.BuiltinFunctionValue(`
# return the absolute of the argument value  (if it's negative then turn it into a positive number)

> abs(-3)
3
> abs(3)
3`, 1, function(arg) {
        let num = bs.value2Num(arg, 0);
        if (num < 0) {
            num = -num;
        }
        return new bs.Value(bs.TYPE_NUM, num);
    }),
    "sqrt" : new bs.BuiltinFunctionValue(`
# return the square root of the argument 
# that's the number that gives the argument number, if you multiply it by itself.

> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095`, 1, function(arg) {
        let num = bs.value2Num(arg, 0);
        return new bs.Value(bs.TYPE_NUM, checkResNan(Math.sqrt(num)));
    }),
    "sin" : new bs.BuiltinFunctionValue(`# returns the sine of a number in radians

> sin(mathconst['pi']/2)
1`, 1, function(arg) {
        let num = bs.value2Num(arg, 0);
        return new bs.Value(bs.TYPE_NUM, Math.sin(num));
    }),
    "cos" : new bs.BuiltinFunctionValue(`# returns the cosine of a number in radians

> cos(mathconst['pi'])
-1`, 1, function(arg) {
        let num = bs.value2Num(arg, 0);
        return new bs.Value(bs.TYPE_NUM, checkResNan(Math.cos(num)));
    }),
    "tan" : new bs.BuiltinFunctionValue(`# returns the tangent of a number in radians`, 1, function(arg) {
        let num = bs.value2Num(arg, 0);
        return new bs.Value(bs.TYPE_NUM, checkResNan(Math.tan(num)));
    }),
    "atan" : new bs.BuiltinFunctionValue(`# returns the inverse tangent (in radians) of a number`, 1, function(arg) {
        let num = bs.value2Num(arg, 0);
        return new bs.Value(bs.TYPE_NUM, checkResNan(Math.atan(num)));
    }),
    "pow" : new bs.BuiltinFunctionValue(`# returns the first arugment nubmer raised to the power of the second argument number

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16`, 2, function(arg) {
        let pow = bs.value2Num(arg, 0);
        let exp = bs.value2Num(arg, 1);
        return new bs.Value(bs.TYPE_NUM, checkResNan(Math.pow(pow,exp)));
    }),
    "random" : new bs.BuiltinFunctionValue(`# returns pseudo random number with value between 0 and 1 (that means it is almost random)
> random()
0.8424952895811049
`, 0, function(arg) {
        return new bs.Value(bs.TYPE_NUM, Math.random());
    }),

    // Input and output functions
    "print" : new bs.BuiltinFunctionValue(`
# prints argument values to console. 
# Can accept multiple values - each of them is converted to a string`, -1, function(arg) {
        let msg = printImpl(arg); //bs.value2Str(arg, 0);
        bs.doLogHook(msg)
    }),
    "println" : new bs.BuiltinFunctionValue(`
# prints argument values to console, followed by newline.
# Can accept multiple values - each of them is converted to a string`, -1, function(arg) {
        let msg = printImpl(arg); //bs.value2Str(arg, 0);
        bs.doLogHook(msg + "\n")
    }),
    "readFile" : new bs.BuiltinFunctionValue(`
# read text file and return it as a string, the file name is the first argument of this function

> fileText = readFile("fileName.txt")    
    `, 1, function(arg) {
        let fname = bs.value2Str(arg, 0);
        try {
            let res = fs.readFileSync(fname, {encoding: 'utf8', flag: 'r'});
            return new bs.Value(bs.TYPE_STR,res);
        } catch(err) {
            throw new bs.RuntimeException("Can't read file: " + fname + " error: " + err);
        };
    }),
    
    "writeFile" : new bs.BuiltinFunctionValue(`
# write string parameter into text file. 
# The file name is the first argument, 
# the text value to be written into the file is the second argument

> writeFile("fileName.txt","fileContent")

# append file

> writeFile("fileName.txt","add this after end of file", "append")
   
    `, 3, function(arg) {
        let fname = bs.value2Str(arg, 0);
        let data = bs.value2Str(arg, 1);
        let append = false;
        if (arg[2] != null ) {
            let mode = bs.value2Str(arg, 2);
            if (mode == "append") {
                append = true;
            } else if (mode == "write") {
                append = false;
            } else {
                throw new bs.RuntimeException("third argument must be either 'append' or 'write'");
            }
        }
        try {
            if (append) {
                fs.appendFileSync(fname, data);
            } else {
                fs.writeFileSync(fname, data);
            }
        } catch(err) {
            throw new bs.RuntimeException("Can't " + (append ? "append" : "write") + " file: " + fname + " error: " + err);
        };
        return bs.VALUE_NONE;
    }, [ null, null, null]),

    "unlink" : new bs.BuiltinFunctionValue(`
# delete a number of files, returns number of deleted files
unlink([ "file1.txt", "file2.txt", "file3.txt" ])

# delete a single file, returns number of deleted files
unlink("file1.txt")    
    `, 1, function(arg) {
        let numUnlinked = 0;

        if (arg[0].type == bs.TYPE_LIST) {
            // delete multiple files
            for(let i=0; i< arg[0].value.length;++i) {
                fs.unlink( bs.value2Str(arg[0].value[i]), function(arg) { numUnlinked -=1; } );
                numUnlinked += 1;
            }
        } else {
            fs.unlink( bs.value2Str(arg, 0), function(arg) { numUnlinked -=1; } );
            numUnlinked += 1;
        }
        return new bs.Value(bs.TYPE_NUM, numUnlinked);
    }),

    "rename" : new bs.BuiltinFunctionValue(`
# rename files, old file name is the first argument, the new file name is the second argument
    
rename("oldFileName","newFileName")    
`, 2, function(arg) {
        let oldFileName = bs.value2Str(arg, 0);
        let newFileName = bs.value2Str(arg, 1);
        try {
            fs.renameSync(oldFileName, newFileName);
        } catch(er){
            throw new bs.RuntimeException("failed to rename " + oldFileName + " to " + newFileName + " error: " + er.message);
        }
        return bs.VALUE_NONE;

    }),

    // function for arrays
    "dim" : new bs.BuiltinFunctionValue(`
# defines n-dimensional array, all elements are set to zero. 
# Each argument defines the size of a dimension in the array.
    
> a=dim(4)
[0,0,0,0]

> a=dim(2,3)
[[0,0,0],[0,0,0]]

> a=dim(2,3,4)
[[[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]    
`, -1, function(arg) {
        let dims = [];
        for(let i =0; i<arg.length;++i) {
            dims[i] = parseInt(bs.value2Num(arg,i));
            if (dims[i]<=1) {
                throw new bs.RuntimeException("parameter " + (i+1) + " must be a positive number greater or equal to one");
            }
        }
        if (dims.length == 0) {
            throw new bs.RuntimeException("at least one dimension must be defined");
        }
        return dimArray( 0, dims);
    }),

    "dimInit" : new bs.BuiltinFunctionValue(`
# defines n-dimensional array, all elements are set to a deep copy of the first argument. 
# Each additional argument defines the size of a dimension in the array.

> a={"a":1}
{"a":1}

> dimInit(a,2,3)
[[{"a":1},{"a":1},{"a":1}],[{"a":1},{"a":1},{"a":1}]]
`, -1, function(arg) {
        if (arg.length < 2) {
            throw new bs.RuntimeException("At least two parameters expected");
        }
        let initVal = arg[0];
        let dims = [];
        for (let i = 1; i < arg.length; ++i) {
            dims[i-1] = parseInt(bs.value2Num(arg, i));
            if (dims[i-1] <= 1) {
                throw new bs.RuntimeException("parameter " + i + " must be a positive number greater or equal to one");
            }
        }
        if (dims.length == 0) {
            throw new bs.RuntimeException("at least one dimension must be defined");
        }
        return dimArrayInit(initVal, 0, dims);

    }),


    "clone" : new bs.BuiltinFunctionValue(`
# create a deep copy of any value

> a=[1,2,3]
[1,2,3]

> b=clone(a)
[1,2,3]

> a[0]=1000
1000

> a
[1000,2,3]

> b
[1,2,3]

> a==b
false
`, 1, function(arg) {
        return bs.cloneAll(arg[0]);
    }),


    "len" : new bs.BuiltinFunctionValue(`# for a string argument - returns the number of characters in the string

> len("abc")
3

# for a list argument - returns the number of elements in the list

> len([1,2,3])
3`, 1, function(arg) {
        bs.checkTypeList(arg, 0, [bs.TYPE_STR, bs.TYPE_LIST]);
        return new bs.Value(bs.TYPE_NUM, arg[0].val.length);
    }),
    "join": new bs.BuiltinFunctionValue(`# given a list argument, joins the values of the list into a single string

> join(["a: ",1," b: ", true])
"a: 1 b: true"`, 2, function(arg) {
        bs.checkType(arg, 0, bs.TYPE_LIST);

        let delim ="";
        if (arg[1] != null) {
            delim = bs.value2Str(arg, 1);
        }
        return new bs.Value(bs.TYPE_STR, arg[0].val.map(bs.value2StrDisp).join(delim));
    }, [null, null]),
    "map": new bs.BuiltinFunctionValue(`# the first argument is a list, the second argument is a function that is called once for each element of the input list. The return values of this function will each be appended to the returned list.

> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

# if called with a dictionary argument: 
# The second parameter function is called with each key-value pair of the dictionary argument. 
# The return values of this function will form the returned list 

a={ 'Ernie': 3, 'Bert': 4, 'Cookie-Monster' : 5, 'GraphCount': 100 }
map(a,def(k,v) { "key: {k} age: {v}" })
> ["key: Ernie age: 3","key: Bert age: 4","key: Cookie-Monster age: 5","key: GraphCount age: 100"]
`, 2, function(arg, frame) {

        bs.checkTypeList(arg, 0, [bs.TYPE_LIST, bs.TYPE_MAP])
        bs.checkTypeList(arg, 1, [bs.TYPE_CLOSURE, bs.TYPE_BUILTIN_FUNCTION])

        let ret = [];
        let funVal = arg[1];

        if (arg[0].type == bs.TYPE_LIST) {
            let argList = arg[0];

            for(let i=0; i<argList.val.length;++i) {
                let arg = [ argList.val[i] ];
                let mapVal = bs.evalClosure("", funVal, arg, frame);
                ret.push(mapVal);
            }
        }

        if (arg[0].type == bs.TYPE_MAP) {
            let argMap = arg[0];

            for(let k in argMap.val) {
                let amap = [ new bs.Value(bs.TYPE_STR, new String(k)), argMap.val[k] ];
                let mapVal = bs.evalClosure("", funVal, amap, frame);
                ret.push(mapVal);
            }

        }
        return new bs.Value(bs.TYPE_LIST, ret);
    }),
    "mapIndex": new bs.BuiltinFunctionValue(`
# similar to map, the argument function is called with the list value and the index of that value within the argument list

> mapIndex([3,4,5,6],def(x,y) [2*x, y])
[[6,0],[8,1],[10,2],[12,3]]`, 2, function(arg, frame) {

        bs.checkType(arg, 0, bs.TYPE_LIST);
        bs.checkTypeList(arg, 0, [bs.TYPE_CLOSURE, bs.TYPE_BUILTIN_FUNCTION]);

        let ret = [];
        let argList = arg[0];
        let funVal = arg[1];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [ argList.val[i], new bs.Value(bs.TYPE_NUM, i) ];
            let mapVal = bs.evalClosure("", funVal, arg, frame);
            ret.push(mapVal)
        }
        return new bs.Value(bs.TYPE_LIST, ret);
    }),
    "reduce": new bs.BuiltinFunctionValue(`
# form a single return values by applying the arugment value repatedly
# works from the first element towards the last element of the argument list. 
# See the following description:

> reduce([1,2,3], def (x,y) x+y, 0)
6

# same as:

> (((0+1)+2)+3)
6

> reduce([1,2,3], def (x,y) x+y, 2)
8

# same as:
 
> (((2+1)+2)+3)
8
`, 3, function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_LIST);
        bs.checkType(arg, 1, bs.TYPE_CLOSURE);

        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=0; i<argList.val.length;++i) {
            let arg = [rVal, argList.val[i]];
            rVal = bs.evalClosure("", funVal, arg, frame);
        }
        return rVal;
    }),

    "reduceFromEnd": new bs.BuiltinFunctionValue(`
# same as reduce, but working from the end of the list backward.

> def div(a,b) a/b

> reduceFromEnd([4,8,32], div, 1024)
1

same as:

> (((1024/32) / 8) / 4)
1`, 3, function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_LIST);
        bs.checkType(arg, 1, bs.TYPE_CLOSURE);

        let argList = arg[0];
        let funVal = arg[1];
        let rVal = arg[2];

        for(let i=argList.val.length-1; i>=0; i--) {
            let arg = [rVal, argList.val[i]];
            rVal = bs.evalClosure("", funVal, arg, frame);
        }
        return rVal;
    }),

    "pop": new bs.BuiltinFunctionValue(`
# takes an argument list, returns the last element of the list
# but also removes this last value from the argument list

 > a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]`, 1,function(arg, frame) {

        bs.checkType(arg, 0, bs.TYPE_LIST);

        if (arg[0].val.length == 0) {
            throw new bs.RuntimeException("Can't pop from an empty list");
        }
        return arg[0].val.pop(arg[1]);
    }),
    "push": new bs.BuiltinFunctionValue(`
# takes the second argument and appends it to the list, which is the first argument to this function

> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]`, 2, function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_LIST)
        arg[0].val.push(arg[1]);
        return arg[0];
    }),
    "shift": new bs.BuiltinFunctionValue(`# removes the first element from the list
> a=[1,2,3]
[1,2,3]

> shift(a)
1

> a
[2,3]    
`, 1,function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_LIST)
        if (arg[0].val.length == 0) {
            throw new bs.RuntimeException("Can't pop from an empty list");
        }
        return arg[0].val.shift(arg[1]);
    }),
    "unshift": new bs.BuiltinFunctionValue(`
# The first argument is a list, the second argument will be prepended to the argument list
# The second argument will bet the first element of the list.
# also returns the modified list

> a=[2,3]
[2,3]

> unshift(a,1)
[1,2,3]

> a
[1,2,3]    
`, 2, function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_LIST)
        arg[0].val.unshift(arg[1]);
        return arg[0];
    }),
    "joinl": new bs.BuiltinFunctionValue(`# takes two lists and joins them into a single list, which is returned by this function

 > joinl([1,2],[3,4])
[1,2,3,4]`, 2,function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_LIST)
        bs.checkType(arg, 1, bs.TYPE_LIST)

        let lst = arg[0].val.concat(arg[1].val);
        return new bs.Value(bs.TYPE_LIST, lst);
    }),
    "sort": new bs.BuiltinFunctionValue(`# sorts the argument list in increasing order

> sort([3,1,4,2,5])
[1,2,3,4,5]

# the second argument of sort can specify a function that is to determine the sorting order : For this second arumgent function the following holds:
#  - a return value of -1 means that the first argument is smaller than the second argument. 
#  - a return value of 1 means that the first argument is bigger than the second argument. 
#  - a return value of zero means that both argument values are equal

> def cmp(x, y) {
...     if x[1] < y[1] return -1
...     if x[1] > y[1] return 1
...     return 0
... }

> r=sort([['a',100],['b',1],['c',1000]],cmp)
[["b",1],["a",100],["c",1000]]`, 2, function(arg, frame) {

        let funVal = null;

        if (arg[1] != null) {
            funVal = arg[1];
            bs.checkTypeList(arg, 1, [bs.TYPE_CLOSURE, bs.TYPE_BUILTIN_FUNCTION])
        }

        bs.checkType(arg, 0, bs.TYPE_LIST);

        let rt = null;
        if (funVal == null) {
            rt = arg[0].val.sort(function (a, b) {
                if (a.val < b.val) {
                    return -1;
                }
                if (a.val > b.val) {
                    return 1;
                }
                return 0;
            });
        } else {
            rt = arg[0].val.sort(function (a, b) {
                let arg = [ a, b ];
                let mapVal = bs.evalClosure("", funVal, arg, frame);
                let nVal = bs.value2Num(mapVal);
                if (nVal < 0) {
                    return -1;
                }
                if (nVal > 0) {
                    return 1;
                }
                return 0;
            });
        }
        return new bs.Value(bs.TYPE_LIST, rt);
    }, [null, null]),

    // functions for maps/hashes
    "each" : new bs.BuiltinFunctionValue( `# iterate over entries of a list or maps. 

# for lists: returns the list values
    
> each({"a":1,"b":2,"c":3})
[["a",1],["b",2],["c",3]]

# for maps: returns each key and value pair in a list of two elements

> pairs = each({"a":1,"b":2,"c":3})
> map( pairs, def (arg) [ arg[0]+arg[0], arg[1]*arg[1] ] )
[["aa",1],["bb",4],["cc",9]]    
`, 1, function*(arg) {
        bs.checkTypeList(arg, 0, [bs.TYPE_MAP, bs.TYPE_LIST]);
        yield* genValues(arg[0]);
    },null, true),
    "keys": new bs.BuiltinFunctionValue(`# for maps: returns the keys of the map
    
> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]`, 1, function(arg) {
        bs.checkType(arg, 0, bs.TYPE_MAP);
        let keys = Object.keys(arg[0].val);
        let rt = [];
        for(let i=0; i<keys.length;++i) {
            rt.push( new bs.Value(bs.TYPE_STR, keys[i] ) );
        }
        return new bs.Value(bs.TYPE_LIST, rt);
    }),

    // functions for working with json
    "parseJsonString": new bs.BuiltinFunctionValue(`# given a json formatted string as argument: returns am equivalent data structure of nested lists and maps

> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]`, 1,function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_STR);
        let val = JSON.parse(arg[0].val);
        let rt = bs.jsValueToRtVal(val);
        return rt;
    }),
    "toJsonString": new bs.BuiltinFunctionValue(`# given a data argument: returns a json formatted string

> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\\"name\\":\\"Pooh\\",\\"family\\":\\"Bear\\",\\"likes\\":[\\"Honey\\",\\"Songs\\",\\"Friends\\"]}"`, 1,function(arg, frame) {
        return new bs.Value(bs.TYPE_STR, bs.rtValueToJson(arg[0]));
    }),

    //functions for working with yaml
        "parseYamlString": new bs.BuiltinFunctionValue(`# given a yaml formatted string, : returns am equivalent data structure of nested lists and maps
         
> a="a: 1\\nb: 2\\nc:\\n  - 1\\n  - 2\\n  - 3\\n"
"a: 1\\nb: 2\\nc:\\n  - 1\\n  - 2\\n  - 3\\n"
> println(a)
a: 1
b: 2
c:
  - 1
  - 2
  - 3
  
> parseYamlString("a: 1\\nb: 2\\nc:\\n  - 1\\n  - 2\\n  - 3\\n")
{"a":1,"b":2,"c":[1,2,3]}    
    `, 1,function(arg, frame) {
        bs.checkType(arg, 0, bs.TYPE_STR);
        let val = yaml.parse(arg[0].val);
        let rt = bs.jsValueToRtVal(val);
        return rt;
    }),
    "toYamlString": new bs.BuiltinFunctionValue(`# given a data argument: returns a yaml formatted string
    
> a={"a":1, "b":2, "c":[1,2,3] }
{"a":1,"b":2,"c":[1,2,3]}
> println(toYamlString(a))
a: 1
b: 2
c:
  - 1
  - 2
  - 3`, 1,function(arg, frame) {
        let jsVal = bs.rtValueToJsVal(arg[0]);
        return new bs.Value(bs.TYPE_STR, yaml.stringify(jsVal));
    }),

    // functions for working with processes
    "system": new bs.BuiltinFunctionValue(`# runs the string command in a shell, returns an array where the first element is the standard output of the command, the second element of the list is the exit code of the process
    
> a=system("ls /")
["Applications\\nLibrary\\nSystem\\nUsers\\nVolumes\\nbin\\ncores\\ndev\\netc\\nhome\\nopt\\nprivate\\nsbin\\ntmp\\nusr\\nvar\\n",0]

> println(a[0])
Applications
Library
System
Users
Volumes
bin
cores
dev
etc
home
opt
private
sbin
tmp
usr
var

> println(a[1])
0`, 1,function(arg, frame) {

        let cmd ="";

        if (arg[0].type == bs.TYPE_STR) {
            cmd = arg[0].val;
        } else {
            if (arg[0].type == bs.TYPE_LIST) {
                cmd = arg[0].val.map(value2Str).join(" ");
            }
        }
        return _system(cmd, frame);
    }),

    "getcwd": new bs.BuiltinFunctionValue(`
# returns the current directory of processes created with system, exec or via backick operator \`

`, 0, function(arg, frame) {
        let value = process.cwd();
        return new bs.Value(bs.TYPE_STR, value);
    }),

    "chdir": new bs.BuiltinFunctionValue(`
# change the current directory. 
# That's the current directory of processes created with system, exec or via backick operator
 
`, 1, function(arg, frame) {
            let dir = bs.value2Str(arg, 0)
            try {
                process.chdir(dir);
            } catch(er) {
                throw new bs.RuntimeException("Can't change directory to " + dir + " error: " +  er.message);
            }
            return bs.VALUE_NONE;
        }),

    "exec": new bs.BuiltinFunctionValue(`
# run a process and receive the input output in a callback. Returns the process id as return value 

# callback is called 
# - when standard output or error has been read (second or third parameter is set)
# - an error occurred (first parameter is set)

# returns the process id of the new process

pid = exec("ls /", def(ex,out,err) { println("error: {ex} standard output: {out} standard error: {err}") })

    `, 2,function(arg, frame) {
        let cmd = bs.value2Str(arg, 0);
        bs.checkType(arg, 1, bs.TYPE_CLOSURE);
        let callback = arg[1];

        let env = _getEnv(frame);
        try {
            let childProcess = cp.exec(cmd, {env: env}, function(error, stdout, stderr){

                // call the callback
                try {
                    let argErr = bs.VALUE_NONE;
                    if (error != null) {
                        argErr = new bs.Value(bs.TYPE_STR,error.message);
                    }
                    let argStdout = bs.VALUE_NONE;
                    if (stdout != null) {
                        argStdout = new bs.Value(bs.TYPE_STR, stdout.toString());
                    }
                    let argStderr = bs.VALUE_NONE;
                    if (stdout != null) {
                        argStderr = new bs.Value(bs.TYPE_STR, stderr.toString());
                    }
                    let vargs =  [ argErr, argStdout, argStderr ];
                    bs.evalClosure("", callback, vargs, frame);
                } catch(er) {
                    if (er instanceof bs.RuntimeException) {
                        er.showStackTrace(true);
                    } else {
                        throw er;
                    }
                }
            });

            let onExit = function() {
                delete spawnedProcesses[childProcess.pid];
            }

            childProcess.addListener('close', onExit)
            childProcess.addListener('error', onExit)

            spawnedProcesses[childProcess.pid] = childProcess;
            return new bs.Value(bs.TYPE_NUM, childProcess.pid);

        } catch(e) {
            console.log("failed to run: cmd" + e.message);
            throw bs.RuntimeException("failed to run " + cmd + " error: " + e.message);
        }
    }),

    "kill": new bs.BuiltinFunctionValue(`
# gets process id returned by exec. kills the process.    
`, 1,function(arg, frame) {
        let pid = bs.value2Num(arg, 0);

        let processEntry = spawnedProcesses[pid];
        if (processEntry != null) {
            processEntry.kill();
        }
        return bs.VALUE_NONE;
    }),

    "sleep": new bs.BuiltinFunctionValue(`    
# sleep for three seconds    
sleep(3)
`, 1,function(arg, frame) {
        let num = bs.value2Num(arg,0) * 1000;

        let date = new Date();
        let curDate = null;

        // sigh...
        do {
            curDate = new Date();
        }  while(curDate-date < num);

        return bs.VALUE_NONE;
    }),

    "_system_backtick": new bs.BuiltinFunctionValue(null, 1,function(arg, frame) {

        let cmd ="";

        if (arg[0].type == bs.TYPE_LIST) {
            cmd = arg[0].val.map(bs.value2Str2).join("");
        } else {
            throw new bs.RuntimeException("list parameter required");
        }
        return _system(cmd, frame);
    }),

    // control flow
    "exit": new bs.BuiltinFunctionValue(`
# exit() - exit program with status 0 (success)
# exit(1) - exit program with status 1 (failure)`,
        1,function(arg, frame) {
        let num = 0;
        if (arg[0] != null) {
            num = bs.value2Num(arg, 0);
        }
        process.exit(num);
    }),

    "assert": new bs.BuiltinFunctionValue( `
# first argument is a boolean expression, if it's value is false then throw an exception
# the second argument is optional, it tells the message of the exception, in case of failure

> a=true
true
> assert(a, "a should be true")

> a=false
false

> assert(a, "a should be true")
Error: a should be true
#(1) assert(a, "a should be true")
   |    
`,2, function(arg, frame) {
        let val = bs.value2Bool(arg, 0);
        if (!val) {
            let msg="";
            if (arg[1] != null) {
                msg = bs.value2Str(arg, 1);
            } else {
                msg = "Assertion failed";
            }
            throw new bs.RuntimeException(msg)
        }
    }, [null, null]),

    // other functions
    "exists": new bs.BuiltinFunctionValue(`> a={"first":1}
{"first":1}
> exists("first", a)
true
> exists("second", a)
false
> a=[3,4]
[3,4]
> exists(3, a)
true
> exists(4, a)
true
> exists(5, a)
false`, 2,function(arg, frame) {
        bs.checkTypeList(arg, 1, [bs.TYPE_MAP, bs.TYPE_LIST]);

        if (arg[1].type == bs.TYPE_MAP) {
           // check if map has first argument as key
           let key = bs.value2Str(arg,  0);
           return new bs.Value(bs.TYPE_BOOL, key in arg[1].val);
        }
        if (arg[1].type == bs.TYPE_LIST) {
            return new bs.Value(bs.TYPE_BOOL, arg[1].val.some( function(a) {
                return arg[0].type == a.type && arg[0].val == a.val;
            }));
        }
    }),
    "help": new bs.BuiltinFunctionValue(`
# Show help text for built-in functions: Example usage:
 
help(sort)

# to get a list of functions with help text:
help()

`, 1,function(arg, frame) {
        if (arg[0]==null) {

            let msg =`
Example usage:

> help(min)

> min(4,3)
3
> min(3,4)
3

Names of functions with help text:

`;
            let funcs =[];
            frame.listOfFuncsWithHelp(funcs);
            msg += funcs.sort().join(", ");
            console.log( msg );
        } else {
            if ('help' in arg[0]) {
                console.log(arg[0].help);
            } else {
                console.log(bs.typeNameVal(arg[0]));
            }
        }
        return bs.VALUE_NONE
    }, [null]),

    "type": new bs.BuiltinFunctionValue(`# returns a string that describes the argument value
    
> type(1)
"Number"
> type("abc")
"String"
> type([1,2,3])
"List"
> type({"first": 1, "second": 2})
"Map"
> type(def(x) 1+x)
"Closure"`, 1,function(arg, frame) {
        return new bs.Value(bs.TYPE_STR, bs.typeNameVal(arg[0]));
    }),

    "setPYXOptions": new bs.BuiltinFunctionValue(`
# set opttions of the PYX runtime

# enable tracing of program (equivalent to -x command line option)
# setPYXOptions("trace", true) 

> def f(x) pow(x,2) + 1

> f(3)
10

> setPYXOptions("trace", true)

> f(3)
f(x=3)
+ pow(3, 2) {
+ 9
} 10

# stop tracing
setPYXOptions("trace", false)

# when set: throw exception if running a process failed

> setPYXOptions("errorExit", true)

> system("false")
+ system("false") {
failed to run: false error: Command failed: false
Error: internal error: Error: Command failed: false
#(1) system("false")
   |.^
   
# set limit on number of frames displayed during stack trace

> def stackOverflow(x)  x * stackOverflow(x-1)

> setPYXOptions("framesInError", 3)
   
> stackOverflow(1024)
Error: internal error: RangeError: Maximum call stack size exceeded
#(1) def stackOverflow(x)  x * stackOverflow(x-1)
   |...........................^
#(1) def stackOverflow(x)  x * stackOverflow(x-1)
   |.........................^
#(1) def stackOverflow(x)  x * stackOverflow(x-1)
   |.^      
`, 2,function(arg, frame) {
        let optname = bs.value2Str(arg, 0);
        if (optname == "trace") {
            bs.setTraceMode( bs.value2Bool(arg, 1) );
        } else if (optname == "errorExit") {
            errorOnExecFail = bs.value2Bool(arg, 1);
        } else if (optname == "framesInError") {    
            bs.maxStackFrames =  bs.value2Num(arg, 1);
        } else {
            throw new bs.RuntimeException("Unknwon option name");
        }
        return bs.VALUE_NONE;
    }),

    "getPYXOptions": new bs.BuiltinFunctionValue(`
# get opttions of the PYX runtime

> getPYXOptions()
{"trace":false,"errorExit":false,"framesInError":20}

`, 0,function(arg, frame) {
       return new bs.Value(bs.TYPE_MAP, {
                "trace": new bs.Value(bs.TYPE_BOOL, bs.getTraceMode()),
                "errorExit" :new bs.Value(bs.TYPE_BOOL, errorOnExecFail),
                "framesInError": new bs.Value(bs.TYPE_NUM, bs.maxStackFrames),
           }
       );
    }),

        "eval": new bs.BuiltinFunctionValue(`
# evaluate the string as a pyx program - in the current scope

> eval("2*2")
4

> eval("sqrt(2)")
1.4142135623730951

> value=2
2
> eval("sqrt(value)")
1.4142135623730951

> def pythagoras(x,y) sqrt(pow(x,2)+pow(y,2))

> eval("pythagoras(3,4)")
5

`, 1,function(arg, frame) {
        let script = bs.value2Str(arg, 0);
        if (evalCallback != null) {
            let rt = evalCallback(script, frame);
            if (rt != null) {
                return rt;
            }
        }
        return bs.VALUE_NONE;
    }),


    // generators
    "range": new bs.BuiltinFunctionValue(`> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3`, 3,function *(arg, frame) {
        let from = bs.value2Num(arg, 0);
        let to = bs.value2Num(arg, 1);
        let step = 1;
        if (arg[2] != null) {
            step = bs.value2Num(arg, 2);
        }
        if (step>0) {
            while (from < to) {
                yield new bs.Value(bs.TYPE_NUM, from);
                from += step;
            }
        }
        if (step<0) {
            while (from > to) {
                yield new bs.Value(bs.TYPE_NUM, from);
                from += step;
            }
        }
    }, [null, null, null], true),

    // functions for working with time
    "time": new bs.BuiltinFunctionValue("# returns epoch time in seconds", 0,function(arg, frame) {
        let secondsSinceEpoch = new Date().getTime() / 1000;
        return new bs.Value(bs.TYPE_NUM, secondsSinceEpoch);
    }),
    "localtime": new bs.BuiltinFunctionValue(`# decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    
`, 1,function(arg, frame) {
        let date = null;
        if (arg[0] == null) {
            date = new Date();
        } else {
            date = new Date(bs.value2Num(arg, 0) * 1000);
        }
        let retMap = {
            "seconds": new bs.Value(bs.TYPE_NUM, date.getSeconds()),
            "minutes": new bs.Value(bs.TYPE_NUM, date.getMinutes()),
            "hours": new bs.Value(bs.TYPE_NUM, date.getHours()),
            "days": new bs.Value(bs.TYPE_NUM, date.getDay()),
            "year": new bs.Value(bs.TYPE_NUM, date.getFullYear()),
            "month": new bs.Value(bs.TYPE_NUM, date.getMonth()),
        };
        return new bs.Value(bs.TYPE_MAP, retMap);
    }, [null]),

    "httpSend": new bs.BuiltinFunctionValue(`

# send htp request
# - first argument - the request url
# - second argument - additional request parameters (none means http get request)
# - third argument - called upon reponse (called on both success and error)
#    resp - not none on success, error - not none on error (error message)
httpSend('http://127.0.0.1:9010/abcd', none, def(resp,error) {
    println("response: {resp} error: {error}\n") 
})

# send http POST request with data and headers

postData = '{ "name": "Pooh", "family": "Bear" }'

options = {
  'method': 'POST',
  'headers': {
     'Content-Type': 'text/json',
     'Content-Length' : len(postData)
  },
  'data' : postData
}

httpSend('http://127.0.0.1:9010/abcd', options, def(resp,error) {
    println("response: {resp} error: {error}") 
})


`, 3, function(arg, frame) {
        let options  = null
        let httpMethod = 'GET';
        let httpHeaders = null;
        let httpRequestData = null;
        let callback = null;
        let surl = bs.value2Str(arg, 0);

        if (arg[1] != null && arg[1].type != bs.TYPE_NONE) {
            bs.checkType(arg, 1, bs.TYPE_MAP);
            options = bs.rtValueToJsVal(arg[1]);

            if ('method' in options) {
                httpMethod = options['method'];
            }
            if ('headers' in options) {
                httpHeaders = options['headers'];
            }
            if ('data' in options) {
                httpRequestData = options['data'];
            }
        }

        if (arg[2] != null) {
            bs.checkType(arg, 2, bs.TYPE_CLOSURE);
        }
        callback = arg[2];

        let urlObj = new url.URL(surl);

        let requestOptions = {
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            port: parseInt(urlObj.port),
            path: urlObj.pathname,
            method: httpMethod,
        };
        if (httpHeaders != null) {
            requestOptions['headers'] = httpHeaders;
        }
    
        //requestOptions['headers'] = {  'Connection': 'keep-alive' };

        let callUserFunction = function(data, error) {
            // this one is evaluated from another task. runtime exceptions need to be handled here
            let varg = [ new bs.Value(bs.TYPE_STR,data), error ];

            try {
                bs.evalClosure("", callback, varg, frame);
            } catch(er) {
                if (er instanceof bs.RuntimeException) {
                    er.showStackTrace(true);
                } else {
                    throw er;
                }
            }
        }

        //console.log("request: " + JSON.stringify(requestOptions));
        let httpHandler = function (resp) {
            resp.setEncoding('utf8');

            let data = "";
            resp.on('data', (chunk) => {
                data += chunk.toString();
            });
            resp.on('end', () => {
                callUserFunction(data, bs.VALUE_NONE);
            });
        };

        let reqObj = null;

        if (urlObj.protocol == 'https:') {
            if (https==null) {
                throw new bs.RuntimeException("https not supported by this nodejs instance");
            }
            reqObj = https.request(requestOptions,httpHandler);
            requestOptions['agent'] = httpsAgent;
        } else {
            reqObj = http.request(requestOptions,httpHandler);
            requestOptions['agent'] = httpAgent;
        }

        reqObj.on('error', (e) => {
            callUserFunction(bs.VALUE_NONE, new bs.Value(bs.TYPE_STR, e.message));
        });


        if (httpRequestData != null) {
            reqObj.write(httpRequestData);
        }
        reqObj.end();
        return bs.VALUE_NONE;
    }, [null, null, null]),

    "httpServer": new bs.BuiltinFunctionValue(` 

# listen for incoming http requests on port 9010.     
httpServer(9010, def (req,resp) {
 
    # function is called on each request  
    # req  - access request properties
    # resp - send response via send method

    println("url: {req.url()}")
    if req.url() == "/time" {

        # show request properties
        println("=====
request url: {req.url()}
method: {req.method()}
headers {req.headers()}
requestData: {req.requestData()}
")

        tm = localtime()
        js = toJsonString(tm)

        # send the response, first comes the http status, then the data, then the mime type.
        resp.send(200, js, "text/json")
    } else
        resp.send(501, "no one here")
})

`, 2,function(arg, frame) {
        let  listenPort = bs.value2Num(arg, 0);

        if (arg[1].type != bs.TYPE_CLOSURE) {
            throw new bs.RuntimeException("Callback function expected as second parameter")
        }

        http.createServer(makeHttpServerListener(arg[1], frame)).listen(listenPort);

        return bs.VALUE_NONE;

    }, [null]),

    "mathconst" : new bs.Value(bs.TYPE_MAP, {
        pi: new bs.Value(bs.TYPE_NUM, Math.PI),
        e: new bs.Value(bs.TYPE_NUM, Math.E),
        ln10: new bs.Value(bs.TYPE_NUM, Math.LN10),
        ln2: new bs.Value(bs.TYPE_NUM, Math.LN2),
        log10e: new bs.Value(bs.TYPE_NUM, Math.LOG10E),
        log2e: new bs.Value(bs.TYPE_NUM, Math.LOG2E),
        sqrt1_2: new bs.Value(bs.TYPE_NUM, Math.SQRT1_2),
        sqrt2: new bs.Value(bs.TYPE_NUM, Math.SQRT2),
        Infinity: new bs.Value(bs.TYPE_NUM, Infinity),
    }, `# map of mathematical constants.

# the number that is bigger than any other number (which is kind of a contradiction...)

> mathconst.Infinity
Infinity

# the number PI
    
> mathconst.pi
3.141592653589793

# the Euler constant 

> mathconst.e
2.718281828459045

# The square root of two

> mathconst.sqrt2
1.4142135623730951

# Other values: 
mathconst.sqrt1_2 # - square root of one half.
mathconst.log2e   # - base e logarithm of 2 
mathconst.log10e  # - base e logarithm of 10
mathconst.log2e   # - base 2 logarithm of e
mathconst.log10e  # - base 10 logarithm of e    
    `),

    "ARGV" : new bs.Value(bs.TYPE_LIST, [], `
# array of command line parameters passed to the program.
# you can pass command line parameter to the shell like this:

pyx -- 1 2 3 4

> ARGV
["1","2","3","4"]

# just the same if running a program

pyx programFile.p -- 1 2 3 4

# or just pass them after the file that contains a program

pyx programFile.p 1 2 3 4
    
`),

    "ENV": new bs.Value(bs.TYPE_MAP,
        Object.entries(process.env).reduce(
            (prev,current)=>{
                prev[current[0]]= new bs.Value(bs.TYPE_STR, current[1]);
                return prev
            } , {}) ,
        "# environment variables, entry key is the name of the environment variable, the entry value is it's value"
    ),
}

function showList(lst, dsp = null, separator = "\n") {
    if (lst == null) {
        return "";
    }
    let retVal = "";
    for (let i = 0; i < lst.length; ++i) {
        if (i > 0) {
            retVal += separator;
        }
        if (dsp != null) {
            retVal += dsp(lst[i]);
        } else {
            if ('show' in lst[i]) {
                retVal += lst[i].show();
            } else {
                retVal += "<error: " + lst[i].constructor.name + ">";
            }
        }
    }
    return retVal;
}

class AstBase {
    constructor(startOffset) {
        this.startOffset = startOffset;
        this.currentSourceInfo = currentSourceInfo;
        this.hasGen = false; // has this statement a generator version? (genEval member function?)
    }

    hasYield() {
        return false;
    }
}

class AstStmtList extends AstBase {
    constructor(statements, offset) {
        super(offset)
        this.statements = statements;
        this.hasGen = true;
        this.skipTrace = false;
        this.hasYield_ = null;
    }

    eval(frame) {
        let val = bs.VALUE_NONE;

        if (bs.getTraceMode() && !this.skipTrace && this.statements.length > 1) {
            process.stderr.write(bs.getTracePrompt() + "{\n");
        }

        for(let i=0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            val = stmt.eval(frame);
            //console.log("eval obj: " + stmt.constructor.name + " res: " + JSON.stringify(val));
            if (val.type >= bs.TYPE_FORCE_RETURN) {
                break;
            }
        }

        if (bs.getTraceMode() && !this.skipTrace && this.statements.length > 1) {
            process.stderr.write(bs.getTracePrompt() + "}\n");
        }

        return val;
    }

    *genEval(frame) {
        let val = bs.VALUE_NONE;
        for (let i = 0; i < this.statements.length; ++i) {
            let stmt = this.statements[i];

            if (stmt.hasGen) {
                val = yield* stmt.genEval(frame);
            } else {
                val = stmt.eval(frame);
            }

            if (val.type >= bs.TYPE_FORCE_RETURN) {
                return val;
            }
        }
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            let ret = false;
            for (let i = 0; i < this.statements.length; ++i) {
                let stmt = this.statements[i];
                if (stmt instanceof AstFunctionCall) {
                    continue;
                }
                if (stmt.hasYield(frame)) {
                    ret = true;
                    break;
                }
            }
            this.hasYield_ = ret;
        }
        return this.hasYield_;
    }

    show() {
        return showList(this.statements);
    }
}

function makeStatementList(stmtList, offset) {
    return new AstStmtList(stmtList, offset);
}

class AstTryCatchBlock extends AstBase {
    constructor(statements, optCatchBlock, optFinallyBlock, offset) {
        super(offset);
        this.statements = statements;
        //console.log("optCatch: " + JSON.stringify(optCatchBlock));
        this.catchBlock = optCatchBlock;
        this.finallyBlock = optFinallyBlock != null ? optFinallyBlock[0] : null;
        this.hasGen = true;
        this.hasYield_ = null;
    }

    eval(frame) {
        let res = bs.VALUE_NONE;
        let throwErr = null;
        let throwNow = false;

        try {
            // return value is the last statement of the block.
            res = this.statements.eval(frame)
        } catch(er) {
            throwErr = er;
            if (!(er instanceof bs.RuntimeException)) {
                throwNow = true;
            }
        }

        if (throwNow) {
            throw throwErr;
        }

        if (throwErr != null) {
            if (this.catchBlock != null) {
                frame.defineVar(this.catchBlock[1][0], throwErr.toRTValue())
                try {
                    // run catch block
                    this.catchBlock[2].eval(frame);
                    throwNow = false;

                } catch (er) {
                    throwNow = true;
                    if (er instanceof bs.RuntimeException && throwErr instanceof bs.RuntimeException) {
                        er.stackTrace = throwErr.stackTrace.concat(er.stackTrace);
                    }
                    throwErr = er;
                    throwNow = true;
                } finally {
                    // what if variable redefined existing variables?
                    //frame.undefVar(this.catchBlock[0][0]);
                }
            } else { // no catch block, but error occurred
                throwNow = true;
            }
        }

        if (this.finallyBlock != null) {
            try {
                let res2 = this.finallyBlock.eval(frame);
                if (res2.type != bs.TYPE_NONE) {
                    res = res2;
                }
            } catch(er) {
                if (er instanceof bs.RuntimeException) {
                    throwErr = er;
                }
                throwNow = true;
            }
        }

        if (throwNow) {
            throw throwErr;
        }
        return res;
    }

    *genEval(frame) {
        let res = bs.VALUE_NONE;
        let throwErr = null;
        let throwNow = false;

        try {
            // return value is the last statement of the block.
            if (this.statements.hasYield()) {
                res = yield * this.statements.genEval(frame)
            } else {
                res = this.statements.eval(frame)
            }
        } catch(er) {
            throwErr = er;
            if (!(er instanceof bs.RuntimeException)) {
                throwNow = true;
            }
        }


        if (throwNow) {
            throw throwErr;
        }

        if (throwErr != null) {
            if (this.catchBlock != null) {
                frame.defineVar(this.catchBlock[1][0], throwErr.toRTValue())
                try {
                    // run catch block
                    this.catchBlock[2].eval(frame);
                    throwNow = false;

                } catch (er) {
                    throwNow = true;
                    if (er instanceof bs.RuntimeException && throwErr instanceof bs.RuntimeException) {
                        er.stackTrace = throwErr.stackTrace.concat(er.stackTrace);
                    }
                    throwErr = er;
                    throwNow = true;
                } finally {
                    // what if variable redefined existing variables?
                    //frame.undefVar(this.catchBlock[0][0]);
                }
            } else { // no catch block, but error occurred
                throwNow = true;
            }
        }

        if (this.finallyBlock != null) {
            try {
                let res2 = null;

                if (this.finallyBlock.hasYield()) {
                    res2 = yield* this.finallyBlock.genEval(frame);
                } else {
                    res2 = this.finallyBlock.eval(frame);
                }

                if (res == null || res2.type != bs.TYPE_NONE) {
                    res = res2;
                }
            } catch(er) {
                if (er instanceof bs.RuntimeException) {
                    throwErr = er;
                }
                throwNow = true;
            }
        }


        if (throwNow) {
            throw throwErr;
        }
        if (res == null) {
            res = bs.VALUE_NONE;
        }
        return res;
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            let ret = false;
            if (this.statements.hasYield(frame)) {
                ret = true;
            }
            else if (this.catchBlock[2] != null && this.catchBlock[2].hasYield(frame)) {
                ret =  true;
            }
            else if (this.finallyBlock != null && this.finallyBlock.hasYield(frame)) {
                ret = true;
            }
            this.hasYield_ = ret;
        }
        return this.hasYield_;
    }
}

function makeTryCatchBlock(statements, optCatchBlock, optFinallyBlock, offset) {
    return new AstTryCatchBlock(statements, optCatchBlock, optFinallyBlock, offset);
}

class AstThrowStmt extends AstBase {
    constructor(expression, offset) {
        super(offset);
        this.expression = expression;
    }

    eval(frame) {
        let value = this.expression.eval(frame);
        throw new bs.RuntimeException(value, [this.startOffset, this.currentSourceInfo]);
    };
}

function makeThrowStmt(expression, offset) {
    return new AstThrowStmt(expression, offset);
}

class AstConstValue extends AstBase {
    constructor(value, offset) {
        super(offset);
        this.value = value;
    }

    eval(frame) {
        return this.value;
    }

    show() {
        return this.value.show();
    }
}

function makeConstValue(type, value) {
    let val = value[0];

    if (type == bs.TYPE_REGEX) {
        return new AstConstValue(new bs.RegexValue(value[0]), value[1]);
    }
    if (type == bs.TYPE_BOOL) {
        value[0] = val == "true";
    }
    if (val == "none") {
        val[0] = null;
    }
    return new AstConstValue(new bs.Value(type, value[0]), value[1]);
}

function checkMixedType(op, lhs, rhs) {
    if (lhs.type != rhs.type) {
        throw new bs.RuntimeException(op + " not allowed between " + bs.typeNameVal(rhs) + " and " + bs.typeNameVal(lhs))
    }
}

function checkMixedTypeAllowNone(op, lhs, rhs) {
    if (lhs.type != bs.TYPE_NONE && rhs.type != bs.TYPE_NONE) {
        if (lhs.type != rhs.type) {
            throw new bs.RuntimeException(op + " not allowed between " + bs.typeNameVal(rhs) + " and " + bs.typeNameVal(lhs))
        }
    }
}

MAP_OP_TO_FUNC={
    "and" : function(lhs,rhs, frame) {
        return new bs.Value(bs.TYPE_BOOL, bs.value2Bool(lhs.eval(frame)) && bs.value2Bool(rhs.eval(frame)));
    },
    "or" : function(lhs,rhs, frame) {
        return new bs.Value(bs.TYPE_BOOL, bs.value2Bool(lhs.eval(frame)) || bs.value2Bool(rhs.eval(frame)));
    },
    "<" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType("<", lhs, rhs);
        return new bs.Value(bs.TYPE_BOOL, lhs.val < rhs.val); // javascript takes care of it, does it?
    },
    ">" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType(">", lhs, rhs);
        return new bs.Value(bs.TYPE_BOOL, lhs.val > rhs.val);
    },
    "<=" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType("<=", lhs, rhs);
        return new bs.Value(bs.TYPE_BOOL, lhs.val <= rhs.val);
    },
    ">=" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedType(">=", lhs, rhs);
        return new bs.Value(bs.TYPE_BOOL, lhs.val >= rhs.val);
    },
    "==" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedTypeAllowNone("==", lhs, rhs);
        return new bs.Value(bs.TYPE_BOOL, lhs.val == rhs.val);
    },
    "!=" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        checkMixedTypeAllowNone("!=", lhs, rhs);
        return new bs.Value(bs.TYPE_BOOL, lhs.val != rhs.val);
    },
    "+" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        if (lhs.type != rhs.type) {
            throw new bs.RuntimeException("Can't add " + bs.typeNameVal(lhs) + " to " + bs.typeNameVal(rhs));
        }
        if (lhs.type == bs.TYPE_STR) {
            /* allow add for strings - this concats the string values */
            return new bs.Value(lhs.type, lhs.val + rhs.val);
        }
        if (lhs.type == bs.TYPE_NUM) {
            return new bs.Value(lhs.type, checkResNan(lhs.val + rhs.val));
        }
        if (lhs.type == bs.TYPE_LIST) {
            // concat lists
            return new bs.Value(bs.TYPE_LIST, lhs.val.concat(rhs.val));
        }
        throw new bs.RuntimeException("Can't add " + bs.typeNameVal(lhs) + " to " + bs.typeNameVal(rhs));
    },
    "-" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);
        if (lhs.type != rhs.type) {
            throw new bs.RuntimeException("Can't subtract " + bs.typeNameVal(rhs) + " from " + bs.typeNameVal(lhs) );
        }
        if (lhs.type != bs.TYPE_NUM) {
            throw new bs.RuntimeException("need number types for substraction" );
        }
        return new bs.Value(lhs.type, checkResNan(lhs.val - rhs.val));
    },
    "*" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);

        if (lhs.type != rhs.type) {
            throw new bs.RuntimeException("Can't multiply " + bs.typeNameVal(lhs) + " with " + bs.typeNameVal(rhs));
        }
        if (lhs.type != bs.TYPE_NUM) {
            throw new bs.RuntimeException("need number types for multiplication" );
        }

        return new bs.Value(bs.TYPE_NUM, checkResNan(bs.value2Num(lhs) * bs.value2Num(rhs)));
    },
    "/" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);

        if (lhs.type != rhs.type) {
            throw new bs.RuntimeException("Can't divide " + bs.typeNameVal(lhs) + " by " + bs.typeNameVal(rhs) );
        }
        if (lhs.type != bs.TYPE_NUM) {
            throw new bs.RuntimeException("need number types for division" );
        }

        let rhsVal = bs.value2Num(rhs);
        if (rhsVal == 0) {
            // javascript allows to divide by zero, amazing.
            throw new bs.RuntimeException("Can't divide by zero");
        }
        return new bs.Value(bs.TYPE_NUM,checkResNan(bs.value2Num(lhs) / rhsVal));
    },
    "%" : function(lhs,rhs, frame) {
        lhs = lhs.eval(frame);
        rhs = rhs.eval(frame);

        if (lhs.type != rhs.type) {
            throw new bs.RuntimeException("Can't divide modulo " + bs.typeNameVal(lhs) + " by " + bs.typeNameVal(rhs) );
        }

        if (lhs.type != bs.TYPE_NUM) {
            throw new bs.RuntimeException("need number types for modulo division" );
        }

        let rhsVal = bs.value2Num(rhs);
        if (rhsVal == 0) {
            // javascript allows to divide by zero, amazing.
            throw new bs.RuntimeException("Can't divide modulo by zero");
        }
        return new bs.Value(bs.TYPE_NUM,bs.value2Num(lhs) % rhsVal);
    },

}

class AstBinaryExpression extends AstBase {
    constructor(lhs, op, rhs, offset) {
        super(op[1]); //lhs.offset);
        this.lhs = lhs;
        this.rhs = rhs;
        this.op = op[0];
        this.fun = MAP_OP_TO_FUNC[op[0]];
        if (this.fun == undefined) {
            console.log("operator " + op[0] + " is not defined");
        }
    }
    
    eval(frame) {
        try {
            return this.fun(this.lhs, this.rhs, frame);
        } catch(er) {
            if (er instanceof bs.RuntimeException && er.firstChance) {
                er.firstChance = false;
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            } else {
                //console.trace(er);
            }
            throw er;
        }
    }

    show() {
        return this.op + ": " + this.lhs.show() + " " + this.op + " " + this.rhs.show();
    }

}

function makeExpressionLeftToRight(exprList) {
    if (exprList.length == 1) {
        return exprList[0];
    }
    let prevExpression = null;
    let pos = exprList.length -1;

    //console.log("enter makeExpression");
    while(pos > 0) {
        if (prevExpression == null) {
            //console.log("## " + JSON.stringify(exprList[pos-2]) + " # " +   JSON.stringify(exprList[pos-1]) + " # " + JSON.stringify(exprList[pos]));
            prevExpression = new AstBinaryExpression(exprList[pos-2], exprList[pos-1], exprList[pos]);
            pos -= 3;
        } else {
            //console.log("!! " + JSON.stringify(exprList[pos-1]) + " # " +   JSON.stringify(exprList[pos]) + " # " + prevExpression);
            prevExpression = new AstBinaryExpression(exprList[pos-1], exprList[pos], prevExpression);
            pos -= 2;
        }
    }
    //console.log("exit makeExpression: " + JSON.stringify(prevExpression));
    return prevExpression;
}

function makeExpression(exprList) {
    if (exprList.length == 1) {
        return exprList[0];
    }
    let prevExpression = null;
    let pos = 0;

    //console.log("enter makeExpression");
    while(pos < exprList.length) {
        if (prevExpression == null) {
            //console.log("## " + JSON.stringify(exprList[pos-2]) + " # " +   JSON.stringify(exprList[pos-1]) + " # " + JSON.stringify(exprList[pos]));
            prevExpression = new AstBinaryExpression(exprList[pos], exprList[pos+1], exprList[pos+2]);
            pos += 3;
        } else {
            //console.log("!! " + JSON.stringify(exprList[pos-1]) + " # " +   JSON.stringify(exprList[pos]) + " # " + prevExpression);
            prevExpression = new AstBinaryExpression(prevExpression, exprList[pos], exprList[pos+1], );
            pos += 2;
        }
    }
    //console.log("exit makeExpression: " + JSON.stringify(prevExpression));
    return prevExpression;
}

MAP_UNARY_OP_TO_FUNC={
    "not": function(value) {
        return new bs.Value(bs.TYPE_BOOL, !bs.value2Bool(value));

    },
    "-": function(value) {
        return new bs.Value(bs.TYPE_NUM, -1 * bs.value2Num(value));
    }
}

class AstUnaryExpression extends AstBase {
    constructor(expr, op, offset) {
        super(offset);
        this.expr = expr;
        this.op = op;
        this.fun = MAP_UNARY_OP_TO_FUNC[op];
    }

    eval(frame) {
        try {
            let exprVal = this.expr.eval(frame);
            return this.fun(exprVal);
        } catch(er) {
            if (er instanceof bs.RuntimeException && er.firstChance) {
                er.firstChance = false;
                er.currentSourceInfo = this.currentSourceInfo;
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            } //else {
            //    console.trace(er);
            //}
            console.trace(er);
            throw er;
        }
    }

    show() {
        return this.op + " " + this.expr.show();
    }
}

class AstDictCtorExpression extends AstBase {
    constructor(exprList, offset) {
        super(offset);
        this.exprList = exprList;
    }

    eval(frame) {
        let ret = {}

        for(let i = 0; i < this.exprList.length; ++i) {
            let nameValueDef = this.exprList[i];

            let nameVal = nameValueDef[0].eval(frame);
            let name = bs.value2Str( nameVal );
            let value = nameValueDef[1].eval(frame);

            ret[ name ] = value;
        }
        return new bs.Value(bs.TYPE_MAP, ret);
    }

    show() {
        return "{" + showList(this.exprList, function(arg) { return arg[0].show() + ": " + arg[1].show()}) + "}";
    }
}

function newDictListCtorExpression(exprList, offset) {
    return new AstDictCtorExpression(exprList, offset);
}

class AstListCtorExpression extends AstBase {
    constructor(exprList, offset) {
        super(offset);
        this.exprList = exprList;
    }

    eval(frame) {
        let vals = [];
        for(let i=0; i < this.exprList.length; ++i) {
            let val = this.exprList[i].eval(frame);
            vals.push(val)
        }
        return new bs.Value(bs.TYPE_LIST, vals);
    }

    show() {
        return "[" + showList(this.exprList, null, ", ")  + "]";
    }

}

function newListCtorExpression(exprList, offset) {
    let arg = [];
    if (exprList.length > 0) {
        arg = exprList[0];
    }
    return new AstListCtorExpression(arg, offset);
}

function makeUnaryExpression(expr, op) {
    return new AstUnaryExpression(expr, op[0], op[1]);
}

class AstLambdaExpression extends AstBase {

    constructor(functionDef) {
        super(functionDef.offset);
        this.functionDef = functionDef;
    }

    eval(frame) {
        let defaultParams = _evalDefaultParams(frame, this.functionDef.params);
        return new bs.ClosureValue(this.functionDef, defaultParams, frame);
    }

    show() {
        return "(lambda " + this.functionDef.show() + " )";
    }
}

  function makeLambdaExpression(functionDef) {
    return new AstLambdaExpression(functionDef);
}

function lookupIndex(frame, value, refExpr) {
    for(let i=0; i<refExpr.length; ++i) {
        let expr = refExpr[i];

        let curValue = value.type;
        if (curValue != bs.TYPE_LIST && curValue != bs.TYPE_MAP && curValue != bs.TYPE_STR) {
            let er = new bs.RuntimeException("Can't access expression of type " + bs.typeNameVal(value) + " by index");
            if (i > 0) {
                er.addToStack([expr.startOffset, expr.currentSourceInfo]);
            }
            throw er;
        }
        let indexValue = expr.eval(frame);

        if (curValue == bs.TYPE_LIST || curValue == bs.TYPE_STR) {
            if (indexValue.type != bs.TYPE_NUM) {
                let err = new bs.RuntimeException("Can't lookup " + bs.typeNameVal(value) + " entry - the index value must be a number. Instead got a " + bs.typeNameVal(indexValue));
                err.addToStack([expr.startOffset, expr.currentSourceInfo]);
                throw err;
            }

            if (indexValue.val < 0 || indexValue.val >= value.val.length) {
                let err = new bs.RuntimeException("Can't lookup " + bs.typeNameVal(value) +  " entry - the index value is out of range. Got " + indexValue.val + " - must be smaller than " + value.val.length + " and greater or equal to zero");
                err.addToStack([expr.startOffset, expr.currentSourceInfo]);
                throw err;
            }
        }

        let nextValue = value.val[ indexValue.val ];
        if (nextValue == null) {
            let ex =  null;
            if (value.type != bs.TYPE_MAP) {
                ex = new bs.RuntimeException("Can't lookup index " + indexValue.val  + " in" + bs.typeNameVal(value) + "  - index value must be less than " + value.val.length + " and greater than zero.");
            } else {
                ex = new bs.RuntimeException("Can't lookup key " + indexValue.val + " in map. No value has been set for this key");
            }
            ex.addToStack([expr.startOffset, expr.currentSourceInfo]);
            throw ex;
        }
        value = nextValue;

        if (curValue == bs.TYPE_STR) {
            value = new bs.Value(bs.TYPE_STR, value);
        }
    }

    return value;
}

class AstIdentifierRef extends AstBase {
    constructor(identifierName, refExpr, offset) {
        super(offset);
        this.identifierName = identifierName;
        this.refExpr = refExpr;
    }

    // evaluate, if as part of expression (for assignment there is AstAssignment)
    eval(frame) {
        try {
            let [value, _] = frame.lookup(this.identifierName);
            if (this.refExpr != null) {
                value = lookupIndex(frame, value, this.refExpr)
            }
            return value;
        } catch(er) {
            if (er instanceof bs.RuntimeException && !er.isUnwind()) {
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            } else {
                consle.trace(er);
            }
            throw er;
        }
        //console.log("identifier ref: name: " + this.identifierName + " res: " + JSON.stringify(value));
    }

    show() {
        let ret = this.identifierName;
        if (this.refExpr != null) {
            ret += showList(this.refExpr,function (arg) {return "["+arg.show()+"]"});
        }
        return ret;
    }
}

function makeIdentifierRef(identifierName, refExpr) {
    return new AstIdentifierRef(identifierName[0], refExpr, identifierName[1]);
}

function _assignImp(frame, value, lhs, isRegularAssignment) {
    let traceLhs=[];
    let traceRhs=[];

    if (lhs.length == 1) {
        let singleLhs = lhs[0];
        let traceVal = _assign(frame, singleLhs, value, isRegularAssignment);
        if (bs.getTraceMode()) {
            traceLhs.push(traceVal[0]);
            traceRhs.push(traceVal[1]);
        }
    } else {
        if (value.type != bs.TYPE_LIST) {
            throw new bs.RuntimeException("list value expected on right hand side of assignment");
        }
        let rhsVal = value.val;
        if (lhs.length != rhsVal.length) {
            if (lhs.length < rhsVal.length) {
                throw new bs.RuntimeException("not enough values to assign");
            } else {
                throw new bs.RuntimeException("too many values to assign");
            }
        }
        for(let i=0; i<rhsVal.length; ++i) {
            let traceVal = _assign(frame, lhs[i], rhsVal[i], isRegularAssignment);
            if (bs.getTraceMode()) {
                traceLhs.push(traceVal[0]);
                traceRhs.push(traceVal[1]);
            }

        }
    }
    if (bs.getTraceMode()) {
        process.stderr.write(bs.getTracePrompt() + traceLhs.join(", ") + " = " + traceRhs.join(",") + "\n");
    }
    return bs.VALUE_NONE;
}

function _assign(frame, singleLhs, value, isRegularAssignment) {
    let varName = singleLhs.identifierName;
    let indexExpr = singleLhs.refExpr;

    if (varName != "_") {
        if (indexExpr != null) {
            let [lhsValue, isGlobalFrame] = frame.lookup(varName);
            //console.log("varName: " + varName + " value: " + JSON.stringify(lhsValue));

            if (isRegularAssignment && !frame.isGlobalFrame && isGlobalFrame) {
                let err = new bs.RuntimeException("Can't assign to global variable " + varName + " from within a function, use := instead for assignment");
                err.addToStack([singleLhs.startOffset, singleLhs.currentSourceInfo]);
                throw err;
            }

            if (lhsValue == undefined || (lhsValue.type != bs.TYPE_LIST && lhsValue.type != bs.TYPE_MAP && lhsValue.type != bs.TYPE_STR)) {
                let err = new bs.RuntimeException("Can't lookup index expression - value is not a list or map");
                err.addToStack([singleLhs.startOffset, singleLhs.currentSourceInfo]);
                throw err;
            }

            let indexValues = _indexAssign(frame, lhsValue, indexExpr, value);
            if (bs.getTraceMode()) {
                let indexExpr = "";
                for(let i=0; i< indexValues.length; ++i) {
                    indexExpr += "[" + bs.rtValueToJsVal(indexValues[i]) + "]";
                }
                return [ varName + indexExpr, bs.rtValueToJsVal(value) ];
            }
        } else {
            frame.assign(varName, value, isRegularAssignment);
            if (bs.getTraceMode()) {
                return [ varName, bs.rtValueToJsVal(value) ];
            }
        }
    }
    if (bs.getTraceMode()) {
        return [ "_", bs.rtValueToJsVal(value)];
    }
}

function _indexAssign(frame, value, refExpr, newValue) {
    let i=0;
    let traceVals = [];
    for(; i<refExpr.length; ++i) {
        let expr = refExpr[i];
        let indexValue = expr.eval(frame);

        if (value.type == bs.TYPE_LIST || value.type == bs.TYPE_STR) {
            if (indexValue.type != bs.TYPE_NUM) {
                let err = new bs.RuntimeException("Can't assign this " + bs.typeNameVal(value) + " index . Index value of must be an number, instead got " + bs.rtValueToJsVal(indexValue));
                err.addToStack([expr.startOffset, expr.currentSourceInfo]);
                throw err;
            }
            indexValue.val = Math.round(indexValue.val); // make sure it's an integer.

            if (indexValue.val < 0 || indexValue.val >= value.val.length) {
                let err = new bs.RuntimeException("Can't assign this "  + bs.typeNameVal(value) + " index. Index value is out of range. Got " + indexValue.val + " - must be smaller than " + value.val.length + " and greater or equal to zero");
                err.addToStack([expr.startOffset, expr.currentSourceInfo]);
                throw err;
            }
        }


        if (bs.getTraceMode()) {
            traceVals.push(indexValue);
        }

        if (i != (refExpr.length-1)) {
            value = value.val[indexValue.val];
            if (value == undefined || (value.type != bs.TYPE_LIST && value.type != bs.TYPE_MAP)) {
                let err = new bs.RuntimeException("Can't assign this entry, lookup did not return a list or a map, got " + bs.typeNameVal(value) +" instead. index value: " + bs.rtValueToJsVal(value));
                err.addToStack([expr.startOffset, expr.currentSourceInfo]);
                throw err;
            }
        } else {
            if (value.type != bs.TYPE_STR) {
                value.val[indexValue.val] = newValue;
            } else {
                if (newValue.type != bs.TYPE_STR) {
                    let err = new bs.RuntimeException("Can't assign string index to " + bs.typeNameVal(newValue) + " - right hand side value must be a string")
                    err.addToStack([expr.startOffset, expr.currentSourceInfo]);
                    throw err;
                }
                // strings are immutable in javascript - have to make a new one
                value.val = value.val.substring(0,indexValue.val) + newValue.val + value.val.substring(indexValue.val+1)
            }
        }
    }
    return traceVals;
}


class AstAssign extends AstBase {
    constructor(lhs, rhs, offset, isRegularAssignment) {
        super(offset);
        this.lhs = lhs;
        this.rhs = rhs;
        this.isRegularAssignment = isRegularAssignment;
    }

    eval(frame) {
        let value = this.rhs.eval(frame);
        _assignImp(frame, value, this.lhs, this.isRegularAssignment);
        return value;
    }

    show() {
        return showList(this.lhs, null, ",") + " = " + this.rhs.show();
    }
}

function makeAstAssignment(lhs, rhs, offset, isRegularAssignment) {
    return new AstAssign(lhs, rhs, offset, isRegularAssignment);
}

class AstIfStmt extends AstBase {
    constructor(expr, stmtList, elseStmtList, offset) {
        super(offset);
        this.ifClauses = [];
        this.addIfClause(expr, stmtList);
        this.hasGen = true;
        this.hasYield_ = null;

        //console.log("else: " + JSON.stringify(elseStmtList));
        this.elseStmtList = null;
        if (elseStmtList != null && elseStmtList.length != 0) {
            this.elseStmtList = elseStmtList[0][1];
        }
    }

    addIfClause(expr,stmtList) {
        //console.log("expr: " + JSON.stringify(expr) + " stmtList: " + stmtList);
        this.ifClauses.push([ expr, stmtList ]);
    }

    eval(frame) {
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            let val = clause[0].eval(frame);

            let boolVal = bs.value2Bool(val);
            if (bs.getTraceMode()) {
                if (i == 0) {
                    process.stderr.write(bs.getTracePrompt() + "if " + boolVal + (!boolVal ? " # <pass>" : "") + "\n");

                } else {
                    process.stderr.write(bs.getTracePrompt() + "elif " + boolVal + (!boolVal ? " # <pass>" : "") + "\n");
                }
            }

            if (boolVal) {
                return clause[1].eval(frame);
            }
        }
        if (this.elseStmtList != null) {
            if (bs.getTraceMode()) {
                process.stderr.write(bs.getTracePrompt() + "else\n");
            }

            return this.elseStmtList.eval(frame);
        }
        return bs.VALUE_NONE;
    }

    *genEval(frame) {
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            let val = clause[0].eval(frame);
            if (bs.value2Bool(val)) {
                if (clause[i].hasGen) {
                   return yield* clause[1].eval(frame);
                } else {
                    return clause[1].eval(frame);
                }
            }
        }
        if (this.elseStmtList != null) {

            if (this.elseStmtList.hasGen) {
                return yield * this.elseStmtList.genEval(frame);
            } else {
                return this.elseStmtList.eval(frame);
            }
        }
        return bs.VALUE_NONE;
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {

            let ret = false;
            for (let i = 0; i < this.ifClauses.length; ++i) {
                let clause = this.ifClauses[i];
                if (clause[1].hasYield(frame)) {
                    ret = true;
                }
            }
            if (!ret && this.elseStmtList) {
                ret = this.elseStmtList.hasYield(frame);
            }
            this.hasYield_ = ret;
        }
        return this.hasYield_;
    }

    show() {
        let ret = "if ";
        for(let i=0; i< this.ifClauses.length; ++i) {
            let clause = this.ifClauses[i];
            if (i!=0) {
                ret += "\nelif ";
            }
            ret += " " + clause[0].show() + "\n" + clause[1].show();
        }
        if (this.elseStmtList != null) {
            ret += " else " + this.elseStmtList.show();
        }
        return ret + ")";
    }
}

function makeIfStmt(expr, stmtList, elseStmtList, offset) {
    return new AstIfStmt(expr, stmtList, elseStmtList, offset);
}

class AstWhileStmt extends AstBase {
    constructor(expr, stmtList, offset) {
        super(offset);
        this.expr = expr;
        this.stmtList = stmtList;
        this.hasGen = true;
    }
    eval(frame) {
        while(true) {
            let condVal = this.expr.eval(frame);

            let cond =  bs.value2Bool(condVal);
            if (cond == false) {
                break;
            }

            if (bs.getTraceMode()) {
                process.stderr.write(bs.getTracePrompt() + "while " + cond + "\n" )
            }

            let rt = this.stmtList.eval(frame);

            if (rt.type >= bs.TYPE_FORCE_RETURN) {
                if (rt.type == bs.TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == bs.TYPE_FORCE_RETURN) {
                    return rt;
                }
                if (rt.type ==bs.TYPE_FORCE_CONTINUE) {
                    continue;
                }
            }
        }
        return bs.VALUE_NONE;
    }

    *genEval(frame) {
        while(true) {
            let condVal = this.expr.eval(frame);

            let cond =  bs.value2Bool(condVal);

            if (cond == false) {
                break;
            }

            let rt = null;

            if (this.stmtList.hasGen) {
                rt = yield* this.stmtList.genEval(frame);
                if (rt == null) {
                    continue;
                }
            } else {
                rt = this.stmtList.eval(frame);
            }

            if (rt.type >= bs.TYPE_FORCE_RETURN) {
                if (rt.type == bs.TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == bs.TYPE_FORCE_RETURN) {
                    return rt;
                }
            }
        }
        return bs.VALUE_NONE;
    }

    hasYield(frame) {
        return this.stmtList.hasYield(frame);
    }

    show() {
        return "while " + this.expr.show() + " " + this.stmtList.show();
     }
}

function makeWhileStmt(expr, stmtList, offset) {
    return new AstWhileStmt(expr, stmtList, offset);
}

class AstForStmt extends AstBase {
    constructor(lhs, expr, stmtList, offset) {
        super(offset);
        this.lhs = lhs;
        this.expr = expr;
        this.stmtList = stmtList;
        this.hasGen = true;
    }

    eval(frame) {
        if (bs.getTraceMode()) {
            process.stderr.write(bs.getTracePrompt() + "for ");
        }
        if (this.expr instanceof AstFunctionCall && this.expr.hasYield(frame)) {
            for (let val of this.expr.genEval(frame)) {
                _assignImp(frame, val, this.lhs, true);
                let rt = this.stmtList.eval(frame);

                if (rt.type >= bs.TYPE_FORCE_RETURN) {
                    if (rt.type == bs.TYPE_FORCE_BREAK) {
                        break;
                    }
                    if (rt.type == bs.TYPE_FORCE_RETURN) {
                        return rt;
                    }
                    if (rt.type == bs.TYPE_FORCE_CONTINUE) {
                        continue;
                    }
                }
            }
            return bs.VALUE_NONE;
        }

        let rt = this.expr.eval(frame);
        if (rt.type != bs.TYPE_LIST && rt.type != bs.TYPE_MAP) {
            throw new bs.RuntimeException("Can't iterate over expression (expected list or map)", this.currentSourceInfo);
        }
        for(let val of genValues(rt)) {
            _assignImp(frame, val, this.lhs, true);

            let rt = this.stmtList.eval(frame);

            if (rt.type >= bs.TYPE_FORCE_RETURN) {
                if (rt.type == bs.TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == bs.TYPE_FORCE_RETURN) {
                    return rt;
                }
            }
        }
        return bs.VALUE_NONE;
    }

    *genEval(frame) {
        if (this.expr instanceof AstFunctionCall && this.expr.hasYield(frame)) {
            for (let val of this.expr.genEval(frame)) {
                _assignImp(frame, val, this.lhs, true);
                let rt = yield *this.stmtList.genEval(frame);

                if (rt != null && rt.type >= bs.TYPE_FORCE_RETURN) {
                    if (rt.type == bs.TYPE_FORCE_BREAK) {
                        break;
                    }
                    if (rt.type == bs.TYPE_FORCE_RETURN) {
                        return rt;
                    }
                    if (rt.type == bs.TYPE_FORCE_CONTINUE) {
                        continue;
                    }
                }
            }
            return bs.VALUE_NONE;
        }

        let rt = this.expr.eval(frame);
        if (rt.type != bs.TYPE_LIST && rt.type != bs.TYPE_MAP) {
            throw new bs.RuntimeException("Can't iterate over expression (expected list or map)", this.currentSourceInfo);
        }
        for(let val of genValues(rt)) {
            _assignImp(frame, val, this.lhs, true);
            let rt = yield* this.stmtList.genEval(frame);

            if (rt.type >= bs.TYPE_FORCE_RETURN) {
                if (rt.type == bs.TYPE_FORCE_BREAK) {
                    break;
                }
                if (rt.type == bs.TYPE_FORCE_RETURN) {
                    return rt;
                }
            }
        }
        return bs.VALUE_NONE;
    }


    hasYield(frame) {
        return this.stmtList.hasYield(frame);
    }

    show() {
        return "for " + showList(this.lhs)  + " " + this.expr.show() + " " + this.stmtList.show();
    }
}
function makeForStmt(lhs, expr, stmtList, offset) {
    return new AstForStmt(lhs, expr, stmtList, offset);
}

class AstReturnStmt extends AstBase {
    constructor(expr, offset) {
        super(offset);
        this.expr = expr;
    }

    eval(frame) {
        let retValue = this.expr.eval(frame);
        if (bs.getTraceMode()) {
            process.stderr.write(bs.getTracePrompt() + "return " + bs.rtValueToJson(retValue) + "\n");
        }
        return new bs.Value(bs.TYPE_FORCE_RETURN, retValue);
    }

    show() {
        return "return " + this.expr.show();
    }
}

function makeReturnStmt(expr, offset) {
    return new AstReturnStmt(expr, offset);
}

class AstYieldStmt extends AstBase {
    constructor(expr, offset) {
        super(offset);
        this.expr = expr;
        this.hasGen = true;
    }

    eval(frame) {
        return bs.VALUE_NONE;
    }

    *genEval(frame) {
        let retValue = this.expr.eval(frame);
        yield retValue;
        return bs.VALUE_NONE;
    }

    hasYield() {
        return true;
    }

    show() {
        return "yield " + this.expr.show();
    }
}

function makeYieldStmt(expr, offset) {
    return new AstYieldStmt(expr, offset);
}

class AstUseStatement extends AstBase {
    constructor(expr, asClause, offset, parserFunction) {
        super(offset);
        this.expr = expr;
        this.parserFunction = parserFunction;
        this.firstCall = true;
        this.namespaceId = (asClause != null && asClause.length != 0) ? asClause[0][1][0] : null;
    }

     eval(frame) {
        if (this.firstCall) {
            this.firstCall = false;

            if (this.namespaceId != null) {
                
                let namespace = new bs.Value(bs.TYPE_MAP, {});
                frame.defineVar(this.namespaceId, namespace);

                let newFrame = new bs.Frame(frame, true);
                newFrame.vars = namespace.val;

                frame = newFrame;
            }

            let fileToInclude = this.expr.eval(frame);
            let includedFile = bs.value2Str2(fileToInclude);

            if (includedFile == "" || includedFile == null) {
                throw new bs.RuntimeException("expression in use statement gives an empty string value. (should be a string with the name of a file)", this.startOffset);
            }

            let extension =  this.fileExtension(includedFile)
            if (extension  == "p") {
                try {
                    let statements = this.parserFunction(includedFile, true);
                    return statements.eval(frame);
                } catch (er) {
                    if (er instanceof bs.RuntimeException && !er.isUnwind()) {
                        er.addToStack([this.startOffset, this.currentSourceInfo]);
                    }
                    throw er;
                }
            }
            else if (extension == "js") {
                return this.useJsExtension(includedFile, frame);
            } else {
                let er = new bs.RuntimeException("file extension of included file should be either .p or .js, is: " + extension + " using: " + includedFile);
                er.addToStack([this.startOffset, this.currentSourceInfo]);
                throw er;
            }
        }
    }

    useJsExtension(incFile, frame) {
        try {
            if (incFile.startsWith(".")) {
                incFile = path.resolve(incFile);
            }
            let ext = require(incFile);
            ext.addExtension(frame);
            return bs.VALUE_NONE;
        } catch(ex) {
            //console.trace(ex);
            let er = new bs.RuntimeException("Can't use/include extension module. " + incFile + " error:",  ex);
            er.addToStack([this.startOffset, this.currentSourceInfo]);
            throw er;
        }

    }

    fileExtension(filename) {
        let components = filename.split('.');
        if (components.length > 1) {
            return components[components.length-1];
        }
        return '';
    }
}

function makeUseStmt(parser, expression, asClause, offset) {
    return new AstUseStatement(expression, asClause, offset, parser);
}


class AstBreakStmt extends AstBase {
    constructor(offset) {
        super(offset);
    }

    eval(frame) {
        if (bs.getTraceMode()) {
            process.stderr.write(bs.getTracePrompt() + "break\n");
        }
        return new bs.Value(bs.TYPE_FORCE_BREAK, null);
    }

    show() {
        return "break";
    }
}

function makeBreakStmt(offset) {
    return new AstBreakStmt(offset);
}

class AstContinueStmt extends AstBase {
    constructor(offset) {
        super(offset);
    }

    eval(frame) {
        if (bs.getTraceMode()) {
            process.stderr.write(bs.getTracePrompt() + "continue\n");
        }
        return new bs.Value(bs.TYPE_FORCE_CONTINUE, null);
    }

    show() {
        return "continue";
    }
}

function makeContinueStmt(offset) {
    return new AstContinueStmt(offset);
}

function _evalDefaultParams(frame, params) {
    let ret = [];
    for(let i = 0;i < params.length; ++i) {
        let param = params[i];
        if (param.length > 1) {
            let defValue = param[1][0].eval(frame);
            ret.push(defValue);
        } else {
            ret.push(null);
        }
    }
    return ret;
}

class AstFunctionDef extends AstBase {
    constructor(name, params, body, offset) {
        super(offset);
        this.name = null;
        if (name != null) {
            this.name = name[0];
        }
        this.params = params;
        this.body = body;
        this.isGeneratorFunction = false;
        this.hasYield_ = null;
    }

    eval(frame) {
        let defaultParamValues = _evalDefaultParams(frame, this.params);
        let argFrame = frame;
        if (this.name != null) {
            argFrame = null;
        }
        let closureValue = new bs.ClosureValue(this, defaultParamValues, argFrame);
        if (this.name != null) {
            let prevValue = null
            try {
                prevValue = frame.lookup(this.name)[0];
            } catch(er) {
                // can throw runtime exception - when value is not defined
            }
            if (prevValue != null && prevValue.type == bs.TYPE_BUILTIN_FUNCTION) {
                throw new bs.RuntimeException("Can't redefine built-in function " + this.name);
            }
            frame.assign(this.name, closureValue);
        }
        return closureValue;
    }

    _evalDefaultParams(frame) {
        let ret = [];
        for(let i = 0;i < this.params.length; ++i) {
            let param = this.params[i];
            if (param.length > 1) {
                let defValue = param[2].eval(frame);
                ret.push(defValue);
            } else {
                ret.push(null);
            }
        }
        return ret;
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            this.hasYield_ = this.body.hasYield(frame)
        }
        return this.hasYield_;
    }

    show() {
        let ret = "def " + this.name + "("

        ret += showList(this.params, function(arg) {
            let ret = arg[0][0];
            if (arg.length > 1) {
                ret += " = " + arg[2];
            }
            return ret;
        })
        return ret + ") " + this.body.show();
    }
}

function makeFunctionDef(name, params, body, offset) {
    return new AstFunctionDef(name, params, body, offset)
}

class AstFunctionCall extends AstBase {
    constructor(name, expressionList, offset) {
        super(offset);
        this.name = name;
        this.expressionList = expressionList;
        this.funcVal_ = null;
        this.hasYield_ = null;
    }

    eval(frame) {
        let funcVal = this._getFuncVal(frame);
        try {
            if (!funcVal.hasYield(frame)) {
                let args = this._evalCallArguments(frame);
                return bs.evalClosure(funcVal.name, funcVal, args, frame);
            } else {
                let ret = [];

                let args = this._evalCallArguments(frame);
                for (let val of bs.genEvalClosure(funcVal, args, frame)) {
                    ret.push(val);
                }
                return new bs.Value(bs.TYPE_LIST, ret);
            }
        } catch (er) {
            if (er instanceof bs.RuntimeException && !er.isUnwind()) {
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            } else {
                if (showJavascriptStack) {
                    console.log("stack length: " + er.stack);
                }
                console.trace(er);
                er = new bs.RuntimeException("internal error: " + er);
                er.addToStack([this.startOffset, this.currentSourceInfo]);
            }
            throw er;
        }
    }

    *genEval(frame) {
        let funcVal = this._getFuncVal(frame);
        if (funcVal.hasYield(frame)) {
            let args = this._evalCallArguments(frame);
            yield* bs.genEvalClosure(funcVal, args, frame)
        }
    }

    hasYield(frame) {
        if (this.hasYield_ == null) {
            let funcVal = this._getFuncValSimple(frame);
            this.hasYield_ = (funcVal != null) ? funcVal.hasYield(frame) : false;
        }
        return this.hasYield_;
    }

    _getFuncValSimple(frame) {
        let funcVal = null;
        if (this.name instanceof AstIdentifierRef) {
            if (this.name.refExpr == null) {
                funcVal = this.name.eval(frame);
                funcVal.name = this.name.identifierName;
                //what if identifier name comes from lookup of values?
            }
        } else {
            funcVal = frame.lookup(this.name)[0];
            funcVal.name = this.name;
        }
        return funcVal;

    }

    _getFuncVal(frame) {

        // can't cache the value - it kills calls to callback values passed to functions. shit.
        //
        //if (this.funcVal_ != null) {
        //    return this.funcVal_;
        //}

        let funcVal = null;
        if (this.name instanceof AstIdentifierRef) {
            funcVal = this.name.eval(frame);
            funcVal.name = this.name.identifierName;
            //what if identifier name comes from lookup of values?
        } else {
            funcVal = frame.lookup(this.name)[0];
            funcVal.name = this.name;
        }
        if (funcVal == undefined) {
            throw new bs.RuntimeException("Can't call undefined function " + this.name, this.startOffset);
        }

        if (funcVal.type != bs.TYPE_CLOSURE && funcVal.type != bs.TYPE_BUILTIN_FUNCTION) {
            throw new bs.RuntimeException("variable is not a function/closure, it is a " + bs.typeNameVal(funcVal), this.startOffset);
        }
        this.funcVal_ = funcVal;
        return funcVal;
    }

    _evalCallArguments(frame) {
        let args = [];
        for (let i = 0; i < this.expressionList.length; ++i) {
            let argExpression = this.expressionList[i]; // parameter expression
            let argValue = argExpression.eval(frame); // evaluate parameter expression
            args.push(argValue);
        }
        return args;
    }

    show() {
        return  this.name + " (" + showList(this.expressionList) + ")";
    }

}

function makeFunctionCall(name, expressionList) {
    let expr =  expressionList;
    if (expressionList.length != 0) {
        expr = expressionList[0];
    }

    /// name is either a token ([ <token_name>, <token_offset> ]) or AstIdentifierRef
    if (name instanceof  AstIdentifierRef)
        return new AstFunctionCall(name, expr, name.startOffset);
    return new AstFunctionCall(name[0], expr, name[1]);
}

function isBreakOrContinue(arg) {
    return arg instanceof AstContinueStmt || arg instanceof AstBreakStmt;
}

function isReturnOrYield(arg) {
    return arg instanceof AstReturnStmt || arg instanceof AstYieldStmt;
}

// makes a global frame
function makeFrame(cmdLine) {
    let frame = new bs.Frame(null, true);
    frame.vars = bs.RTLIB;

    if (cmdLine != null) {
        let [cmd,_] = frame.lookup("ARGV");
        cmd.val = listToString(cmdLine);
    }

    return frame;

}

function listToString(lst) {
    let stringList = lst.map(function (arg) { return new bs.Value(bs.TYPE_STR, arg); });
    return stringList;

}
function eval(stmt, globFrame = null, cmdLine = null) {
    if (globFrame == null) {
        globFrame = makeFrame();
    }
    return stmt.eval(globFrame)
}

function addSourceToTopLevelStmts(data,ast) {
    let retList = [];
    let recImpl = function(retList, data, ast) {
        if (ast instanceof AstStmtList) {
            for(let i=0; i<ast.statements.length;++i) {
                let stmt = ast.statements[i];
                recImpl(retList, data, stmt);
            }
        } else {
            if ("posRange" in ast) {
                ast.source = data.substring(ast.posRange[0], ast.posRange[1]);
                retList.push(ast);
            }
        }
    }
    recImpl(retList, data, ast);
    return retList;
}


if (typeof(module) == 'object') {
    module.exports = {
        makeConstValue,
        makeExpression,
        makeUnaryExpression,
        makeLambdaExpression,
        makeIdentifierRef,
        newListCtorExpression,
        newDictListCtorExpression,
        makeStatementList,
        makeTryCatchBlock,
        makeThrowStmt,
        makeAstAssignment,
        makeIfStmt,
        makeWhileStmt,
        makeForStmt,
        makeReturnStmt,
        makeYieldStmt,
        makeUseStmt,
        makeBreakStmt,
        makeContinueStmt,
        makeFunctionDef,
        makeFunctionCall,
        makeFrame,
        eval,
        setEvalCallback,
        setCurrentSourceInfo,
        setErrorOnExecFail,
        isBreakOrContinue,
        isReturnOrYield,
        addSourceToTopLevelStmts
    }
}
