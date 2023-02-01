# pyxfunc - PYX functions reference by category

## Numeric functions
<a href='#s-1'>abs</a>&nbsp;,&nbsp;<a href='#s-2'>atan</a>&nbsp;,&nbsp;<a href='#s-3'>cos</a>&nbsp;,&nbsp;<a href='#s-4'>int</a>&nbsp;,&nbsp;<a href='#s-5'>max</a>&nbsp;,&nbsp;<a href='#s-6'>min</a>&nbsp;,&nbsp;<a href='#s-7'>num</a>&nbsp;,&nbsp;<a href='#s-8'>pow</a>&nbsp;,&nbsp;<a href='#s-9'>random</a>&nbsp;,&nbsp;<a href='#s-10'>sin</a>&nbsp;,&nbsp;<a href='#s-11'>sqrt</a>&nbsp;,&nbsp;<a href='#s-12'>tan</a>
## Functions for scalars or strings
<a href='#s-13'>find</a>&nbsp;,&nbsp;<a href='#s-14'>lc</a>&nbsp;,&nbsp;<a href='#s-15'>len</a>&nbsp;,&nbsp;<a href='#s-16'>mid</a>&nbsp;,&nbsp;<a href='#s-17'>repeat</a>&nbsp;,&nbsp;<a href='#s-18'>replace</a>&nbsp;,&nbsp;<a href='#s-19'>reverse</a>&nbsp;,&nbsp;<a href='#s-20'>split</a>&nbsp;,&nbsp;<a href='#s-21'>str</a>&nbsp;,&nbsp;<a href='#s-22'>trim</a>&nbsp;,&nbsp;<a href='#s-23'>uc</a>
## Functions for regular expressions
<a href='#s-13'>find</a>&nbsp;,&nbsp;<a href='#s-25'>match</a>&nbsp;,&nbsp;<a href='#s-26'>matchAll</a>&nbsp;,&nbsp;<a href='#s-27'>replacere</a>&nbsp;,&nbsp;<a href='#s-20'>split</a>
## Input and output functions
<a href='#s-29'>print</a>&nbsp;,&nbsp;<a href='#s-30'>println</a>&nbsp;,&nbsp;<a href='#s-31'>readFile</a>&nbsp;,&nbsp;<a href='#s-32'>rename</a>&nbsp;,&nbsp;<a href='#s-33'>unlink</a>&nbsp;,&nbsp;<a href='#s-34'>writeFile</a>
## Functions for arrays
<a href='#s-35'>exists</a>&nbsp;,&nbsp;<a href='#s-36'>join</a>&nbsp;,&nbsp;<a href='#s-37'>joinl</a>&nbsp;,&nbsp;<a href='#s-15'>len</a>&nbsp;,&nbsp;<a href='#s-39'>map</a>&nbsp;,&nbsp;<a href='#s-40'>mapIndex</a>&nbsp;,&nbsp;<a href='#s-41'>pop</a>&nbsp;,&nbsp;<a href='#s-42'>push</a>&nbsp;,&nbsp;<a href='#s-43'>range</a>&nbsp;,&nbsp;<a href='#s-44'>reduce</a>&nbsp;,&nbsp;<a href='#s-45'>reduceFromEnd</a>&nbsp;,&nbsp;<a href='#s-46'>shift</a>&nbsp;,&nbsp;<a href='#s-47'>sort</a>&nbsp;,&nbsp;<a href='#s-48'>unshift</a>
## Functions for maps
<a href='#s-49'>each</a>&nbsp;,&nbsp;<a href='#s-35'>exists</a>&nbsp;,&nbsp;<a href='#s-51'>keys</a>&nbsp;,&nbsp;<a href='#s-39'>map</a>
## Function for working with json/yaml
<a href='#s-53'>parseJsonString</a>&nbsp;,&nbsp;<a href='#s-54'>parseYamlString</a>&nbsp;,&nbsp;<a href='#s-55'>toJsonString</a>&nbsp;,&nbsp;<a href='#s-56'>toYamlString</a>
## functions for working with processes
<a href='#s-57'>exit</a>&nbsp;,&nbsp;<a href='#s-58'>sleep</a>&nbsp;,&nbsp;<a href='#s-59'>system</a>
## Other functions
<a href='#s-60'>eval</a>&nbsp;,&nbsp;<a href='#s-61'>help</a>&nbsp;,&nbsp;<a href='#s-62'>localtime</a>&nbsp;,&nbsp;<a href='#s-63'>setErrorOnExecFail</a>&nbsp;,&nbsp;<a href='#s-64'>setTrace</a>&nbsp;,&nbsp;<a href='#s-65'>time</a>&nbsp;,&nbsp;<a href='#s-66'>type</a>
## Global variables
<a href='#s-67'>ARGV</a>&nbsp;,&nbsp;<a href='#s-68'>ENV</a>&nbsp;,&nbsp;<a href='#s-69'>mathconst</a>

<a id='s-1'/>
<hr>function: <b>abs</b>

```python
> abs(-3)
3
> abs(3)
3

```
<a id='s-2'/>
<hr>function: <b>atan</b>

```python
returns the inverse tangent (in radians) of a number

```
<a id='s-3'/>
<hr>function: <b>cos</b>

```python
returns the cosine of a number in radians
> cos(mathconst['pi'])
-1

```
<a id='s-4'/>
<hr>function: <b>int</b>

```python
> int("123")
123
> int("123.5")
123
> int(123.5)
123
> int(123)
123

# hexadecimal number conversion

> int("0xff")
255

> int("ff", 16)
255

# octal number

> int("444", 8)
292



```
<a id='s-5'/>
<hr>function: <b>max</b>

```python
> max(3,4)
4
> max(4,3)
4

```
<a id='s-6'/>
<hr>function: <b>min</b>

```python
> min(4,3)
3
> min(3,4)
3

```
<a id='s-7'/>
<hr>function: <b>num</b>

```python



```
<a id='s-8'/>
<hr>function: <b>pow</b>

```python
> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16

```
<a id='s-9'/>
<hr>function: <b>random</b>

```python
# returns random number with value between 0 and 1

> random()
0.8424952895811049


```
<a id='s-10'/>
<hr>function: <b>sin</b>

```python
returns the sine of a number in radians
> sin(mathconst['pi']/2)
1

```
<a id='s-11'/>
<hr>function: <b>sqrt</b>

```python
> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095

```
<a id='s-12'/>
<hr>function: <b>tan</b>

```python
returns the tangent of a number in radians

```
<a id='s-13'/>
<hr>function: <b>find</b>

```python
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

# the third parameter is an optional offset to start search from.

> find("a1 !! a1", "a1", 2)
6

> find("a1 !! a1", /[a-z0-9]+/, 2)
6



```
<a id='s-14'/>
<hr>function: <b>lc</b>

```python
> lc("BIG little")
"big little"

```
<a id='s-15'/>
<hr>function: <b>len</b>

```python
> len("abc")
3
> len([1,2,3])
3

```
<a id='s-16'/>
<hr>function: <b>mid</b>

```python
> mid("I am me", 2, 4)
"am"
> mid("I am me", 2)
"am me"
> mid("I am me", 2, -1)
"am me"


```
<a id='s-17'/>
<hr>function: <b>repeat</b>

```python
> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"

```
<a id='s-18'/>
<hr>function: <b>replace</b>

```python
text="a b a c a d"
> "a b a c a d"
        
> replace(text,'a ', 'x ', -1)
"x b x c x d"        

> replace(text,'a ', 'x ', 1)
"x b a c a d"

> replace(text,'a ', 'x ', 2)
"x b x c a d"


```
<a id='s-19'/>
<hr>function: <b>reverse</b>

```python
> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"

```
<a id='s-20'/>
<hr>function: <b>split</b>

```python
> split("first line\nsecond line")
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



```
<a id='s-21'/>
<hr>function: <b>str</b>

```python
> str(123)
"123"
> str("abc")
"abc"

```
<a id='s-22'/>
<hr>function: <b>trim</b>

```python
> a= ' honey  '
" honey  "
> trim(a)
"honey"
> a= '\t\n a lot of honey honey \n '
"\t\n a lot of honey honey \n "
> trim(a)
"a lot of honey honey"

```
<a id='s-23'/>
<hr>function: <b>uc</b>

```python
> uc("BIG little")
"BIG LITTLE"

```
<a id='s-13'/>
<hr>function: <b>find</b>

```python
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

# the third parameter is an optional offset to start search from.

> find("a1 !! a1", "a1", 2)
6

> find("a1 !! a1", /[a-z0-9]+/, 2)
6



```
<a id='s-25'/>
<hr>function: <b>match</b>

```python

> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> match(text,/[0-9]+/)
[2,"1232"]    



```
<a id='s-26'/>
<hr>function: <b>matchAll</b>

```python

> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> matchAll(text,/[0-9]+/)
[[2,"1232"],[17,"34234"],[37,"3423"]]



```
<a id='s-27'/>
<hr>function: <b>replacere</b>

```python

    
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
    


```
<a id='s-20'/>
<hr>function: <b>split</b>

```python
> split("first line\nsecond line")
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



```
<a id='s-29'/>
<hr>function: <b>print</b>

```python
# prints argument value to console

```
<a id='s-30'/>
<hr>function: <b>println</b>

```python
# prints argument value to console, followed by newline

```
<a id='s-31'/>
<hr>function: <b>readFile</b>

```python

# read text file and return string

> fileText = readFile("fileName.txt")    
    

```
<a id='s-32'/>
<hr>function: <b>rename</b>

```python

# rename files
    
rename("oldFileName","newFileName")    


```
<a id='s-33'/>
<hr>function: <b>unlink</b>

```python

# unlink a number of files, returns number of deleted files
unlink([ "file1.txt", "file2.txt", "file3.txt" ])

# unlink a single file, returns number of deleted files
unlink([ "file1.txt")    
    

```
<a id='s-34'/>
<hr>function: <b>writeFile</b>

```python

# write string parameter into text file

> writeFile("fileName.txt","fileContent")

# append file

> writeFile("fileName.txt","add this after end of file", "append")
   
    

```
<a id='s-35'/>
<hr>function: <b>exists</b>

```python
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
<a id='s-36'/>
<hr>function: <b>join</b>

```python
> join(["a: ",1," b: ", true])
"a: 1 b: true"

```
<a id='s-37'/>
<hr>function: <b>joinl</b>

```python
> joinl([1,2],[3,4])
[1,2,3,4]

```
<a id='s-15'/>
<hr>function: <b>len</b>

```python
> len("abc")
3
> len([1,2,3])
3

```
<a id='s-39'/>
<hr>function: <b>map</b>

```python
> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

a={ 'Ernie': 3, 'Bert': 4, 'Cookie-Monster' : 5, 'GraphCount': 100 }
map(a,def(k,v) { "key: {k} age: {v}" })
> ["key: Ernie age: 3","key: Bert age: 4","key: Cookie-Monster age: 5","key: GraphCount age: 100"]


```
<a id='s-40'/>
<hr>function: <b>mapIndex</b>

```python
> mapIndex([3,4,5,6],def(x,y) [2*x, y])
[[6,0],[8,1],[10,2],[12,3]]

```
<a id='s-41'/>
<hr>function: <b>pop</b>

```python
> a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]

```
<a id='s-42'/>
<hr>function: <b>push</b>

```python
> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]

```
<a id='s-43'/>
<hr>function: <b>range</b>

```python
> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3

```
<a id='s-44'/>
<hr>function: <b>reduce</b>

```python
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


```
<a id='s-45'/>
<hr>function: <b>reduceFromEnd</b>

```python
> def div(a,b) a/b

> reduceFromEnd([4,8,32], div, 1024)
1

same as:

> (((1024/32) / 8) / 4)
1

```
<a id='s-46'/>
<hr>function: <b>shift</b>

```python

> a=[1,2,3]
[1,2,3]

> shift(a)
1

> a
[2,3]    


```
<a id='s-47'/>
<hr>function: <b>sort</b>

```python
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
<a id='s-48'/>
<hr>function: <b>unshift</b>

```python

> a=[2,3]
[2,3]

> unshift(a,1)
[1,2,3]

> a
[1,2,3]    


```
<a id='s-49'/>
<hr>function: <b>each</b>

```python

> each({"a":1,"b":2,"c":3})
[["a",1],["b",2],["c",3]]

> pairs = each({"a":1,"b":2,"c":3})
> map( pairs, def (arg) [ arg[0]+arg[0], arg[1]*arg[1] ] )
[["aa",1],["bb",4],["cc",9]]    


```
<a id='s-35'/>
<hr>function: <b>exists</b>

```python
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
<a id='s-51'/>
<hr>function: <b>keys</b>

```python
> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]

```
<a id='s-39'/>
<hr>function: <b>map</b>

```python
> map([1,2,3], def (x) 1 + x)
[2,3,4]
> map([1,2,3], def (x) x * x)
[1,4,9]

a={ 'Ernie': 3, 'Bert': 4, 'Cookie-Monster' : 5, 'GraphCount': 100 }
map(a,def(k,v) { "key: {k} age: {v}" })
> ["key: Ernie age: 3","key: Bert age: 4","key: Cookie-Monster age: 5","key: GraphCount age: 100"]


```
<a id='s-53'/>
<hr>function: <b>parseJsonString</b>

```python
> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]

```
<a id='s-54'/>
<hr>function: <b>parseYamlString</b>

```python

> a="a: 1\nb: 2\nc:\n  - 1\n  - 2\n  - 3\n"
"a: 1\nb: 2\nc:\n  - 1\n  - 2\n  - 3\n"
> println(a)
a: 1
b: 2
c:
  - 1
  - 2
  - 3
  
> parseYamlString("a: 1\nb: 2\nc:\n  - 1\n  - 2\n  - 3\n")
{"a":1,"b":2,"c":[1,2,3]}    
    

```
<a id='s-55'/>
<hr>function: <b>toJsonString</b>

```python
> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\"name\":\"Pooh\",\"family\":\"Bear\",\"likes\":[\"Honey\",\"Songs\",\"Friends\"]}"

```
<a id='s-56'/>
<hr>function: <b>toYamlString</b>

```python

> a={"a":1, "b":2, "c":[1,2,3] }
{"a":1,"b":2,"c":[1,2,3]}
> println(toYamlString(a))
a: 1
b: 2
c:
  - 1
  - 2
  - 3

```
<a id='s-57'/>
<hr>function: <b>exit</b>

```python
# exit() - exit program with status 0 (success)
# exit(1) - exit program with status 1 (failure)

```
<a id='s-58'/>
<hr>function: <b>sleep</b>

```python
    
# sleep for three seconds    
sleep(3)


```
<a id='s-59'/>
<hr>function: <b>system</b>

```python
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
<a id='s-60'/>
<hr>function: <b>eval</b>

```python


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
"<function>"

> eval("pythagoras(3,4)")
5



```
<a id='s-61'/>
<hr>function: <b>help</b>

```python

# Show help text for built-in functions: Example usage:
 
help(sort)

# to get a list of functions with help text:
help()



```
<a id='s-62'/>
<hr>function: <b>localtime</b>

```python
# decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    


```
<a id='s-63'/>
<hr>function: <b>setErrorOnExecFail</b>

```python

# when set: throw exception if running a process failed 
setErrorOnExecFail(true)
> setErrorOnExecFail(true)

> system("false")
Error: failed to run `false` : Command failed: false
#(1) system("false")
   |.^

> `false`
Error: failed to run `false` : Command failed: false
#(1) `false`
   |.^


```
<a id='s-64'/>
<hr>function: <b>setTrace</b>

```python

# trace the running of a program (for debugging)
setTrace(true)

# stop tracing
setTrace(false)


```
<a id='s-65'/>
<hr>function: <b>time</b>

```python
# returns epoch time in seconds

```
<a id='s-66'/>
<hr>function: <b>type</b>

```python
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
<a id='s-67'/>
<hr>function: <b>ARGV</b>

```python

# array of command line parameters passed to the program.
# you can pass command line parameter to the shell like this:

pyx -- 1 2 3 4

> ARGV
["1","2","3","4"]

# just the same if running a program

pyx programFile.p -- 1 2 3 4

# or just pass them after the file that contains a program

pyx programFile.p 1 2 3 4
    


```
<a id='s-68'/>
<hr>function: <b>ENV</b>

```python
# environment variables, entry key is the name of the environment variable, the entry value is it's value

```
<a id='s-69'/>
<hr>function: <b>mathconst</b>

```python
# map of mathematical constants.

# the number PI
    
> mathconst['pi']
3.141592653589793

# the Euler constant 

> mathconst['e']
2.718281828459045

# The square root of two

> mathconst["sqrt2"]
1.4142135623730951

# Other values: 
mathconst["sqrt1_2"] # - square root of one half.
mathconst["log2e"]   # - base e logarithm of 2 
mathconst["log10e"]  # - base e logarithm of 10
mathconst["log2e"]   # - base 2 logarithm of e
mathconst["log10e"]  # - base 10 logarithm of e    
    

```
