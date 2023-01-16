#PYX functions by Category

## functions on scalars or strings
<a href='#find'>find</a>&nbsp;<a href='#mid'>mid</a>&nbsp;<a href='#lc'>lc</a>&nbsp;<a href='#uc'>uc</a>&nbsp;<a href='#reverse'>reverse</a>&nbsp;<a href='#str'>str</a>&nbsp;<a href='#repeat'>repeat</a>&nbsp;<a href='#len'>len</a>&nbsp;
## Numeric functions
<a href='#int'>int</a>&nbsp;<a href='#max'>max</a>&nbsp;<a href='#min'>min</a>&nbsp;<a href='#abs'>abs</a>&nbsp;<a href='#sqrt'>sqrt</a>&nbsp;<a href='#sin'>sin</a>&nbsp;<a href='#cos'>cos</a>&nbsp;<a href='#tan'>tan</a>&nbsp;<a href='#atan'>atan</a>&nbsp;<a href='#pow'>pow</a>&nbsp;<a href='#random'>random</a>&nbsp;
## Input and output functions
<a href='#print'>print</a>&nbsp;<a href='#println'>println</a>&nbsp;
## Functions on arrays
<a href='#len'>len</a>&nbsp;<a href='#join'>join</a>&nbsp;<a href='#map'>map</a>&nbsp;<a href='#reduce'>reduce</a>&nbsp;<a href='#pop'>pop</a>&nbsp;<a href='#push'>push</a>&nbsp;<a href='#joinl'>joinl</a>&nbsp;<a href='#keys'>keys</a>&nbsp;<a href='#sort'>sort</a>&nbsp;<a href='#exists'>exists</a>&nbsp;<a href='#range'>range</a>&nbsp;
## function with json
<a href='#parseJsonString'>parseJsonString</a>&nbsp;<a href='#toJsonString'>toJsonString</a>&nbsp;
## functions for working with processes
<a href='#system'>system</a>&nbsp;<a href='#exit'>exit</a>&nbsp;
## Other functions
<a href='#help'>help</a>&nbsp;<a href='#type'>type</a>&nbsp;<a href='#time'>time</a>&nbsp;<a href='#localtime'>localtime</a>&nbsp;
## global variables
<a href='#mathconst'>mathconst</a>&nbsp;<a href='#ARGV'>ARGV</a>&nbsp;<a href='#ARGC'>ARGC</a>&nbsp;

<a id='ARGC'/>
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
<hr>function: mid

```

How to use in shell:

> mid("I am me", 2)
"am me"
> mid("I am me", 2, 4)
"am"

```
<hr>function: lc

```

How to use in shell:

> lc("BIG little")
"big little"

```
<hr>function: uc

```

How to use in shell:

> uc("BIG little")
"BIG LITTLE"

```
<hr>function: reverse

```

How to use in shell:

> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"

```
<hr>function: str

```

How to use in shell:

> str(123)
"123"
> str("abc")
"abc"

```
<hr>function: repeat

```

How to use in shell:

> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"

```
<hr>function: len

```

How to use in shell:

> len("abc")
3
> len([1,2,3])
3

```
<a id='len'/>
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
<hr>function: max

```

How to use in shell:

> max(3,4)
4
> max(4,3)
4

```
<hr>function: min

```

How to use in shell:

> min(4,3)
3
> min(3,4)
3

```
<hr>function: abs

```

How to use in shell:

> abs(-3)
3
> abs(3)
3

```
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
<hr>function: sin

```

How to use in shell:

returns the sine of a number in radians
> sin(mathconst['pi']/2)
1

```
<hr>function: cos

```

How to use in shell:

returns the cosine of a number in radians
> cos(mathconst['pi'])
-1

```
<hr>function: tan

```

How to use in shell:

returns the tangent of a number in radians

```
<hr>function: atan

```

How to use in shell:

returns the inverse tangent (in radians) of a number

```
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
<hr>function: random

```

How to use in shell:

returns random number with value between 0 and 1

```
<a id='random'/>
## Input and output functions
<hr>function: print

```

How to use in shell:

prints argument value to console

```
<hr>function: println

```

How to use in shell:

prints argument value to console, followed by newline

```
<a id='println'/>
## Functions on arrays
<hr>function: len

```

How to use in shell:

> len("abc")
3
> len([1,2,3])
3

```
<hr>function: join

```

How to use in shell:

> join(["a: ",1," b: ", true])
"a: 1 b: true"

```
<hr>function: map

```

How to use in shell:

> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

```
<hr>function: reduce

```

How to use in shell:

> reduce([1,2,3], def (x,y) x+y, 0)
6
> reduce([1,2,3], def (x,y) x+y, 2)
8

```
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
<hr>function: joinl

```

How to use in shell:

> joinl([1,2],[3,4])
[1,2,3,4]

```
<hr>function: keys

```

How to use in shell:

> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]

```
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
<a id='range'/>
## function with json
<hr>function: parseJsonString

```

How to use in shell:

> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]

```
<hr>function: toJsonString

```

How to use in shell:

> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\"name\":\"Pooh\",\"family\":\"Bear\",\"likes\":[\"Honey\",\"Songs\",\"Friends\"]}"

```
<a id='toJsonString'/>
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
<hr>function: exit

```

How to use in shell:

exit() - exit program with status 0 (success)
exit(1) - exit program with status 1 (failure)

```
<a id='exit'/>
## Other functions
<hr>function: help

```
BuiltinFunction

```
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
<hr>function: time

```

How to use in shell:

returns epoch time in seconds

```
<hr>function: localtime

```

How to use in shell:

decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    


```
<a id='localtime'/>
## global variables
<hr>function: mathconst

```

How to use in shell:

map of mathematical constant

```
<hr>function: ARGV

```

How to use in shell:

command line arguments (array)

```
<hr>function: ARGC

```

```
