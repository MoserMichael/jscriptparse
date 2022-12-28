# pyxfunc - PYX functions reference by category

## functions on scalars or strings
<a href='#s-1'>find</a>&nbsp;,&nbsp;<a href='#s-2'>mid</a>&nbsp;,&nbsp;<a href='#s-3'>lc</a>&nbsp;,&nbsp;<a href='#s-4'>uc</a>&nbsp;,&nbsp;<a href='#s-5'>reverse</a>&nbsp;,&nbsp;<a href='#s-6'>str</a>&nbsp;,&nbsp;<a href='#s-7'>repeat</a>&nbsp;,&nbsp;<a href='#s-8'>len</a>
## Numeric functions
<a href='#s-9'>int</a>&nbsp;,&nbsp;<a href='#s-10'>max</a>&nbsp;,&nbsp;<a href='#s-11'>min</a>&nbsp;,&nbsp;<a href='#s-12'>abs</a>&nbsp;,&nbsp;<a href='#s-13'>sqrt</a>&nbsp;,&nbsp;<a href='#s-14'>sin</a>&nbsp;,&nbsp;<a href='#s-15'>cos</a>&nbsp;,&nbsp;<a href='#s-16'>tan</a>&nbsp;,&nbsp;<a href='#s-17'>atan</a>&nbsp;,&nbsp;<a href='#s-18'>pow</a>&nbsp;,&nbsp;<a href='#s-19'>random</a>
## Input and output functions
<a href='#s-20'>print</a>&nbsp;,&nbsp;<a href='#s-21'>println</a>&nbsp;,&nbsp;<a href='#s-22'>readFile</a>&nbsp;,&nbsp;<a href='#s-23'>writeFile</a>
## Functions on arrays
<a href='#s-8'>len</a>&nbsp;,&nbsp;<a href='#s-25'>join</a>&nbsp;,&nbsp;<a href='#s-26'>map</a>&nbsp;,&nbsp;<a href='#s-27'>reduce</a>&nbsp;,&nbsp;<a href='#s-28'>pop</a>&nbsp;,&nbsp;<a href='#s-29'>push</a>&nbsp;,&nbsp;<a href='#s-30'>joinl</a>&nbsp;,&nbsp;<a href='#s-31'>sort</a>&nbsp;,&nbsp;<a href='#s-32'>exists</a>&nbsp;,&nbsp;<a href='#s-33'>range</a>&nbsp;,&nbsp;<a href='#s-34'>mapIndex</a>
## functions for maps/hashes
<a href='#s-35'>each</a>&nbsp;,&nbsp;<a href='#s-36'>keys</a>&nbsp;,&nbsp;<a href='#s-32'>exists</a>
## function with json
<a href='#s-38'>parseJsonString</a>&nbsp;,&nbsp;<a href='#s-39'>toJsonString</a>
## functions for working with processes
<a href='#s-40'>system</a>&nbsp;,&nbsp;<a href='#s-41'>exit</a>
## Other functions
<a href='#s-42'>help</a>&nbsp;,&nbsp;<a href='#s-43'>type</a>&nbsp;,&nbsp;<a href='#s-44'>time</a>&nbsp;,&nbsp;<a href='#s-45'>localtime</a>
## global variables
<a href='#s-46'>mathconst</a>&nbsp;,&nbsp;<a href='#s-47'>ARGV</a>&nbsp;,&nbsp;<a href='#s-48'>ENV</a>

<a id='s-1'/>
<hr>function: <b>find</b>

```python

How to use in shell:

> find("big cat", "big")
0
> find("big cat", "cat")
4
> find("big cat", "bear")
-1



```
<a id='s-2'/>
<hr>function: <b>mid</b>

```python

How to use in shell:

> mid("I am me", 2)
"am me"
> mid("I am me", 2, 4)
"am"

```
<a id='s-3'/>
<hr>function: <b>lc</b>

```python

How to use in shell:

> lc("BIG little")
"big little"

```
<a id='s-4'/>
<hr>function: <b>uc</b>

```python

How to use in shell:

> uc("BIG little")
"BIG LITTLE"

```
<a id='s-5'/>
<hr>function: <b>reverse</b>

```python

How to use in shell:

> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"

```
<a id='s-6'/>
<hr>function: <b>str</b>

```python

How to use in shell:

> str(123)
"123"
> str("abc")
"abc"

```
<a id='s-7'/>
<hr>function: <b>repeat</b>

```python

How to use in shell:

> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"

```
<a id='s-8'/>
<hr>function: <b>len</b>

```python

How to use in shell:

> len("abc")
3
> len([1,2,3])
3

```
<a id='s-9'/>
<hr>function: <b>int</b>

```python

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
<hr>function: <b>max</b>

```python

How to use in shell:

> max(3,4)
4
> max(4,3)
4

```
<a id='s-11'/>
<hr>function: <b>min</b>

```python

How to use in shell:

> min(4,3)
3
> min(3,4)
3

```
<a id='s-12'/>
<hr>function: <b>abs</b>

```python

How to use in shell:

> abs(-3)
3
> abs(3)
3

```
<a id='s-13'/>
<hr>function: <b>sqrt</b>

```python

How to use in shell:

> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095

```
<a id='s-14'/>
<hr>function: <b>sin</b>

```python

How to use in shell:

returns the sine of a number in radians
> sin(mathconst['pi']/2)
1

```
<a id='s-15'/>
<hr>function: <b>cos</b>

```python

How to use in shell:

returns the cosine of a number in radians
> cos(mathconst['pi'])
-1

```
<a id='s-16'/>
<hr>function: <b>tan</b>

```python

How to use in shell:

returns the tangent of a number in radians

```
<a id='s-17'/>
<hr>function: <b>atan</b>

```python

How to use in shell:

returns the inverse tangent (in radians) of a number

```
<a id='s-18'/>
<hr>function: <b>pow</b>

```python

How to use in shell:

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16

```
<a id='s-19'/>
<hr>function: <b>random</b>

```python

How to use in shell:

returns random number with value between 0 and 1

```
<a id='s-20'/>
<hr>function: <b>print</b>

```python

How to use in shell:

prints argument value to console

```
<a id='s-21'/>
<hr>function: <b>println</b>

```python

How to use in shell:

prints argument value to console, followed by newline

```
<a id='s-22'/>
<hr>function: <b>readFile</b>

```python

How to use in shell:


read text file and return string

> fileText = readFile("fileName.txt")    
    

```
<a id='s-23'/>
<hr>function: <b>writeFile</b>

```python

How to use in shell:


write string parameter into text file

> writeFile("fileName.txt","fileContent")

append file
> writeFile("fileName.txt","add this after end of file", "append")
   
    

```
<a id='s-8'/>
<hr>function: <b>len</b>

```python

How to use in shell:

> len("abc")
3
> len([1,2,3])
3

```
<a id='s-25'/>
<hr>function: <b>join</b>

```python

How to use in shell:

> join(["a: ",1," b: ", true])
"a: 1 b: true"

```
<a id='s-26'/>
<hr>function: <b>map</b>

```python

How to use in shell:

> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

```
<a id='s-27'/>
<hr>function: <b>reduce</b>

```python

How to use in shell:

> reduce([1,2,3], def (x,y) x+y, 0)
6
> reduce([1,2,3], def (x,y) x+y, 2)
8

```
<a id='s-28'/>
<hr>function: <b>pop</b>

```python

How to use in shell:

> a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]

```
<a id='s-29'/>
<hr>function: <b>push</b>

```python

How to use in shell:

> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]

```
<a id='s-30'/>
<hr>function: <b>joinl</b>

```python

How to use in shell:

> joinl([1,2],[3,4])
[1,2,3,4]

```
<a id='s-31'/>
<hr>function: <b>sort</b>

```python

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
<a id='s-32'/>
<hr>function: <b>exists</b>

```python

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
<a id='s-33'/>
<hr>function: <b>range</b>

```python

How to use in shell:

> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3

```
<a id='s-34'/>
<hr>function: <b>mapIndex</b>

```python

How to use in shell:

> mapIndex([3,4,5,6],def(x,y) [2*x, y])
[[6,0],[8,1],[10,2],[12,3]]

```
<a id='s-35'/>
<hr>function: <b>each</b>

```python

How to use in shell:


> each({"a":1,"b":2,"c":3})
[["a",1],["b",2],["c",3]]

> pairs = each({"a":1,"b":2,"c":3})
> map( pairs, def (arg) [ arg[0]+arg[0], arg[1]*arg[1] ] )
[["aa",1],["bb",4],["cc",9]]    


```
<a id='s-36'/>
<hr>function: <b>keys</b>

```python

How to use in shell:

> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]

```
<a id='s-32'/>
<hr>function: <b>exists</b>

```python

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
<a id='s-38'/>
<hr>function: <b>parseJsonString</b>

```python

How to use in shell:

> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]

```
<a id='s-39'/>
<hr>function: <b>toJsonString</b>

```python

How to use in shell:

> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\"name\":\"Pooh\",\"family\":\"Bear\",\"likes\":[\"Honey\",\"Songs\",\"Friends\"]}"

```
<a id='s-40'/>
<hr>function: <b>system</b>

```python

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
<a id='s-41'/>
<hr>function: <b>exit</b>

```python

How to use in shell:

exit() - exit program with status 0 (success)
exit(1) - exit program with status 1 (failure)

```
<a id='s-42'/>
<hr>function: <b>help</b>

```python

How to use in shell:

How to use in shell:

Show help text for built-in functions: Example usage:
 
 help(sort)


```
<a id='s-43'/>
<hr>function: <b>type</b>

```python

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
<a id='s-44'/>
<hr>function: <b>time</b>

```python

How to use in shell:

returns epoch time in seconds

```
<a id='s-45'/>
<hr>function: <b>localtime</b>

```python

How to use in shell:

decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    


```
<a id='s-46'/>
<hr>function: <b>mathconst</b>

```python

How to use in shell:

map of mathematical constant

```
<a id='s-47'/>
<hr>function: <b>ARGV</b>

```python

How to use in shell:

command line arguments (array)

```
<a id='s-48'/>
<hr>function: <b>ENV</b>

```python

How to use in shell:

environment variables, entry key is the name of the environment variable, the entry value is it's value

```
