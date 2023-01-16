# PYX functions by Category

## functions on scalars or strings
<a href='#s-1'>find</a>&nbsp;<a href='#s-2'>mid</a>&nbsp;<a href='#s-3'>lc</a>&nbsp;<a href='#s-4'>uc</a>&nbsp;<a href='#s-5'>reverse</a>&nbsp;<a href='#s-6'>str</a>&nbsp;<a href='#s-7'>repeat</a>&nbsp;<a href='#s-8'>len</a>&nbsp;
## Numeric functions
<a href='#s-9'>int</a>&nbsp;<a href='#s-10'>max</a>&nbsp;<a href='#s-11'>min</a>&nbsp;<a href='#s-12'>abs</a>&nbsp;<a href='#s-13'>sqrt</a>&nbsp;<a href='#s-14'>sin</a>&nbsp;<a href='#s-15'>cos</a>&nbsp;<a href='#s-16'>tan</a>&nbsp;<a href='#s-17'>atan</a>&nbsp;<a href='#s-18'>pow</a>&nbsp;<a href='#s-19'>random</a>&nbsp;
## Input and output functions
<a href='#s-20'>print</a>&nbsp;<a href='#s-21'>println</a>&nbsp;
## Functions on arrays
<a href='#s-8'>len</a>&nbsp;<a href='#s-23'>join</a>&nbsp;<a href='#s-24'>map</a>&nbsp;<a href='#s-25'>reduce</a>&nbsp;<a href='#s-26'>pop</a>&nbsp;<a href='#s-27'>push</a>&nbsp;<a href='#s-28'>joinl</a>&nbsp;<a href='#s-29'>keys</a>&nbsp;<a href='#s-30'>sort</a>&nbsp;<a href='#s-31'>exists</a>&nbsp;<a href='#s-32'>range</a>&nbsp;
## function with json
<a href='#s-33'>parseJsonString</a>&nbsp;<a href='#s-34'>toJsonString</a>&nbsp;
## functions for working with processes
<a href='#s-35'>system</a>&nbsp;<a href='#s-36'>exit</a>&nbsp;
## Other functions
<a href='#s-37'>help</a>&nbsp;<a href='#s-38'>type</a>&nbsp;<a href='#s-39'>time</a>&nbsp;<a href='#s-40'>localtime</a>&nbsp;
## global variables
<a href='#s-41'>mathconst</a>&nbsp;<a href='#s-42'>ARGV</a>&nbsp;<a href='#s-43'>ARGC</a>&nbsp;

<a id='s-1'/>
## functions on scalars or strings
<hr>function: find

```

How to use in shell:

> find("big cat", "big")
0
> find("big cat", "cat")
4
> find("big cat", "bear")
-1



```
<a id='s-2'/>
## functions on scalars or strings
<hr>function: mid

```

How to use in shell:

> mid("I am me", 2)
"am me"
> mid("I am me", 2, 4)
"am"

```
<a id='s-3'/>
## functions on scalars or strings
<hr>function: lc

```

How to use in shell:

> lc("BIG little")
"big little"

```
<a id='s-4'/>
## functions on scalars or strings
<hr>function: uc

```

How to use in shell:

> uc("BIG little")
"BIG LITTLE"

```
<a id='s-5'/>
## functions on scalars or strings
<hr>function: reverse

```

How to use in shell:

> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"

```
<a id='s-6'/>
## functions on scalars or strings
<hr>function: str

```

How to use in shell:

> str(123)
"123"
> str("abc")
"abc"

```
<a id='s-7'/>
## functions on scalars or strings
<hr>function: repeat

```

How to use in shell:

> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"

```
<a id='s-8'/>
## functions on scalars or strings
<hr>function: len

```

How to use in shell:

> len("abc")
3
> len([1,2,3])
3

```
<a id='s-9'/>
## Numeric functions
<hr>function: int

```

How to use in shell:

> int("123")
123
> int("123.5")
123
> int(123.5)
123
> int(123)
123

```
<a id='s-10'/>
## Numeric functions
<hr>function: max

```

How to use in shell:

> max(3,4)
4
> max(4,3)
4

```
<a id='s-11'/>
## Numeric functions
<hr>function: min

```

How to use in shell:

> min(4,3)
3
> min(3,4)
3

```
<a id='s-12'/>
## Numeric functions
<hr>function: abs

```

How to use in shell:

> abs(-3)
3
> abs(3)
3

```
<a id='s-13'/>
## Numeric functions
<hr>function: sqrt

```

How to use in shell:

> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095

```
<a id='s-14'/>
## Numeric functions
<hr>function: sin

```

How to use in shell:

returns the sine of a number in radians
> sin(mathconst['pi']/2)
1

```
<a id='s-15'/>
## Numeric functions
<hr>function: cos

```

How to use in shell:

returns the cosine of a number in radians
> cos(mathconst['pi'])
-1

```
<a id='s-16'/>
## Numeric functions
<hr>function: tan

```

How to use in shell:

returns the tangent of a number in radians

```
<a id='s-17'/>
## Numeric functions
<hr>function: atan

```

How to use in shell:

returns the inverse tangent (in radians) of a number

```
<a id='s-18'/>
## Numeric functions
<hr>function: pow

```

How to use in shell:

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16

```
<a id='s-19'/>
## Numeric functions
<hr>function: random

```

How to use in shell:

returns random number with value between 0 and 1

```
<a id='s-20'/>
## Input and output functions
<hr>function: print

```

How to use in shell:

prints argument value to console

```
<a id='s-21'/>
## Input and output functions
<hr>function: println

```

How to use in shell:

prints argument value to console, followed by newline

```
<a id='s-8'/>
## Functions on arrays
<hr>function: len

```

How to use in shell:

> len("abc")
3
> len([1,2,3])
3

```
<a id='s-23'/>
## Functions on arrays
<hr>function: join

```

How to use in shell:

> join(["a: ",1," b: ", true])
"a: 1 b: true"

```
<a id='s-24'/>
## Functions on arrays
<hr>function: map

```

How to use in shell:

> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

```
<a id='s-25'/>
## Functions on arrays
<hr>function: reduce

```

How to use in shell:

> reduce([1,2,3], def (x,y) x+y, 0)
6
> reduce([1,2,3], def (x,y) x+y, 2)
8

```
<a id='s-26'/>
## Functions on arrays
<hr>function: pop

```

How to use in shell:

> a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]

```
<a id='s-27'/>
## Functions on arrays
<hr>function: push

```

How to use in shell:

> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]

```
<a id='s-28'/>
## Functions on arrays
<hr>function: joinl

```

How to use in shell:

> joinl([1,2],[3,4])
[1,2,3,4]

```
<a id='s-29'/>
## Functions on arrays
<hr>function: keys

```

How to use in shell:

> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]

```
<a id='s-30'/>
## Functions on arrays
<hr>function: sort

```

How to use in shell:

> sort([3,1,4,2,5])
[1,2,3,4,5]
> def cmp(x, y) {
...     if x[1] < y[1] return -1
...     if x[1] > y[1] return 1
...     return 0
... }

> r=sort([['a',100],['b',1],['c',1000]],cmp)
[["b",1],["a",100],["c",1000]]

```
<a id='s-31'/>
## Functions on arrays
<hr>function: exists

```

How to use in shell:

> a={"first":1}
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
false

```
<a id='s-32'/>
## Functions on arrays
<hr>function: range

```

How to use in shell:

> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3

```
<a id='s-33'/>
## function with json
<hr>function: parseJsonString

```

How to use in shell:

> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]

```
<a id='s-34'/>
## function with json
<hr>function: toJsonString

```

How to use in shell:

> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\"name\":\"Pooh\",\"family\":\"Bear\",\"likes\":[\"Honey\",\"Songs\",\"Friends\"]}"

```
<a id='s-35'/>
## functions for working with processes
<hr>function: system

```

How to use in shell:

> a=system("ls /")
["Applications\nLibrary\nSystem\nUsers\nVolumes\nbin\ncores\ndev\netc\nhome\nopt\nprivate\nsbin\ntmp\nusr\nvar\n",0]
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
0

```
<a id='s-36'/>
## functions for working with processes
<hr>function: exit

```

How to use in shell:

exit() - exit program with status 0 (success)
exit(1) - exit program with status 1 (failure)

```
<a id='s-37'/>
## Other functions
<hr>function: help

```
BuiltinFunction

```
<a id='s-38'/>
## Other functions
<hr>function: type

```

How to use in shell:

> type(1)
"Number"
> type("abc")
"String"
> type([1,2,3])
"List"
> type({"first": 1, "second": 2})
"Map"
> type(def(x) 1+x)
"Closure"

```
<a id='s-39'/>
## Other functions
<hr>function: time

```

How to use in shell:

returns epoch time in seconds

```
<a id='s-40'/>
## Other functions
<hr>function: localtime

```

How to use in shell:

decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    


```
<a id='s-41'/>
## global variables
<hr>function: mathconst

```

How to use in shell:

map of mathematical constant

```
<a id='s-42'/>
## global variables
<hr>function: ARGV

```

How to use in shell:

command line arguments (array)

```
<a id='s-43'/>
## global variables
<hr>function: ARGC

```

```
