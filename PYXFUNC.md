# pyxfunc - PYX functions reference by category

## Numeric functions
<a href='#s-1'>abs</a>&nbsp;,&nbsp;<a href='#s-2'>atan</a>&nbsp;,&nbsp;<a href='#s-3'>bit_and</a>&nbsp;,&nbsp;<a href='#s-4'>bit_neg</a>&nbsp;,&nbsp;<a href='#s-5'>bit_or</a>&nbsp;,&nbsp;<a href='#s-6'>bit_shiftl</a>&nbsp;,&nbsp;<a href='#s-7'>bit_shiftr</a>&nbsp;,&nbsp;<a href='#s-8'>bit_xor</a>&nbsp;,&nbsp;<a href='#s-9'>cos</a>&nbsp;,&nbsp;<a href='#s-10'>int</a>&nbsp;,&nbsp;<a href='#s-11'>max</a>&nbsp;,&nbsp;<a href='#s-12'>min</a>&nbsp;,&nbsp;<a href='#s-13'>num</a>&nbsp;,&nbsp;<a href='#s-14'>pow</a>&nbsp;,&nbsp;<a href='#s-15'>random</a>&nbsp;,&nbsp;<a href='#s-16'>round</a>&nbsp;,&nbsp;<a href='#s-17'>sin</a>&nbsp;,&nbsp;<a href='#s-18'>sqrt</a>&nbsp;,&nbsp;<a href='#s-19'>tan</a>
## Functions for scalars or strings
<a href='#s-20'>find</a>&nbsp;,&nbsp;<a href='#s-21'>lc</a>&nbsp;,&nbsp;<a href='#s-22'>len</a>&nbsp;,&nbsp;<a href='#s-23'>mid</a>&nbsp;,&nbsp;<a href='#s-24'>repeat</a>&nbsp;,&nbsp;<a href='#s-25'>replace</a>&nbsp;,&nbsp;<a href='#s-26'>reverse</a>&nbsp;,&nbsp;<a href='#s-27'>split</a>&nbsp;,&nbsp;<a href='#s-28'>str</a>&nbsp;,&nbsp;<a href='#s-29'>trim</a>&nbsp;,&nbsp;<a href='#s-30'>uc</a>
## Functions for regular expressions
<a href='#s-20'>find</a>&nbsp;,&nbsp;<a href='#s-32'>match</a>&nbsp;,&nbsp;<a href='#s-33'>matchAll</a>&nbsp;,&nbsp;<a href='#s-34'>replacere</a>&nbsp;,&nbsp;<a href='#s-27'>split</a>
## Input and output functions
<a href='#s-36'>httpSend</a>&nbsp;,&nbsp;<a href='#s-37'>httpServer</a>&nbsp;,&nbsp;<a href='#s-38'>print</a>&nbsp;,&nbsp;<a href='#s-39'>println</a>&nbsp;,&nbsp;<a href='#s-40'>readFile</a>&nbsp;,&nbsp;<a href='#s-41'>rename</a>&nbsp;,&nbsp;<a href='#s-42'>unlink</a>&nbsp;,&nbsp;<a href='#s-43'>writeFile</a>
## Functions for arrays
<a href='#s-44'>dim</a>&nbsp;,&nbsp;<a href='#s-45'>dimInit</a>&nbsp;,&nbsp;<a href='#s-46'>exists</a>&nbsp;,&nbsp;<a href='#s-47'>join</a>&nbsp;,&nbsp;<a href='#s-48'>joinl</a>&nbsp;,&nbsp;<a href='#s-22'>len</a>&nbsp;,&nbsp;<a href='#s-50'>map</a>&nbsp;,&nbsp;<a href='#s-51'>mapIndex</a>&nbsp;,&nbsp;<a href='#s-52'>pop</a>&nbsp;,&nbsp;<a href='#s-53'>push</a>&nbsp;,&nbsp;<a href='#s-54'>range</a>&nbsp;,&nbsp;<a href='#s-55'>reduce</a>&nbsp;,&nbsp;<a href='#s-56'>reduceFromEnd</a>&nbsp;,&nbsp;<a href='#s-57'>shift</a>&nbsp;,&nbsp;<a href='#s-58'>sort</a>&nbsp;,&nbsp;<a href='#s-59'>unshift</a>
## Functions for maps
<a href='#s-60'>each</a>&nbsp;,&nbsp;<a href='#s-46'>exists</a>&nbsp;,&nbsp;<a href='#s-62'>keys</a>&nbsp;,&nbsp;<a href='#s-50'>map</a>
## Function for working with json/yaml
<a href='#s-64'>parseJsonString</a>&nbsp;,&nbsp;<a href='#s-65'>parseYamlString</a>&nbsp;,&nbsp;<a href='#s-66'>toJsonString</a>&nbsp;,&nbsp;<a href='#s-67'>toYamlString</a>
## functions for working with processes
<a href='#s-68'>chdir</a>&nbsp;,&nbsp;<a href='#s-69'>exec</a>&nbsp;,&nbsp;<a href='#s-70'>exit</a>&nbsp;,&nbsp;<a href='#s-71'>getcwd</a>&nbsp;,&nbsp;<a href='#s-72'>kill</a>&nbsp;,&nbsp;<a href='#s-73'>sleep</a>&nbsp;,&nbsp;<a href='#s-74'>system</a>
## Other functions
<a href='#s-75'>assert</a>&nbsp;,&nbsp;<a href='#s-76'>clone</a>&nbsp;,&nbsp;<a href='#s-77'>eval</a>&nbsp;,&nbsp;<a href='#s-78'>getPYXOptions</a>&nbsp;,&nbsp;<a href='#s-79'>help</a>&nbsp;,&nbsp;<a href='#s-80'>localtime</a>&nbsp;,&nbsp;<a href='#s-81'>setPYXOptions</a>&nbsp;,&nbsp;<a href='#s-82'>time</a>&nbsp;,&nbsp;<a href='#s-83'>type</a>
## Global variables
<a href='#s-84'>ARGV</a>&nbsp;,&nbsp;<a href='#s-85'>ENV</a>&nbsp;,&nbsp;<a href='#s-86'>mathconst</a>

<a id='s-1'/>
<hr>function: <b>abs</b>

```python

# return the absolute of the argument value  (if it's negative then turn it into a positive number)

> abs(-3)
3
> abs(3)
3

```
<a id='s-2'/>
<hr>function: <b>atan</b>

```python
# returns the inverse tangent (in radians) of a number

```
<a id='s-3'/>
<hr>function: <b>bit_and</b>

```python

# bitwise and, both argument must be numbers with integer values (not floating point values)

> bit_and(4,5)
4

> bit_and(1,3)
1    


```
<a id='s-4'/>
<hr>function: <b>bit_neg</b>

```python

# bitwise negation, the argument must be numbers with integer value (not floating point value)                        


```
<a id='s-5'/>
<hr>function: <b>bit_or</b>

```python

# bitwise or, both argument must be numbers with integer values (not floating point values)

> bit_or(1,2)
3        


```
<a id='s-6'/>
<hr>function: <b>bit_shiftl</b>

```python

# bitwise shift left, both argument must be numbers with integer values (not floating point values)

> bit_shiftl(1,3)
8                


```
<a id='s-7'/>
<hr>function: <b>bit_shiftr</b>

```python

# bitwise shift right, both argument must be numbers with integer values (not floating point values)

> bit_shiftr(8,3)
1                    


```
<a id='s-8'/>
<hr>function: <b>bit_xor</b>

```python

# bitwise xor, both argument must be numbers with integer values (not floating point values)

> bit_xor(1,7)
6            


```
<a id='s-9'/>
<hr>function: <b>cos</b>

```python
# returns the cosine of a number in radians

> cos(mathconst['pi'])
-1

```
<a id='s-10'/>
<hr>function: <b>int</b>

```python
# convert argument string or number to integer value

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



```
<a id='s-11'/>
<hr>function: <b>max</b>

```python

# return the bigger of the two two argument values (argument are interpreted as a numbers)

> max(3,4)
4
> max(4,3)
4

```
<a id='s-12'/>
<hr>function: <b>min</b>

```python

# return the smaller of the two two argument values (argument are interpreted as a numbers)

> min(4,3)
3
> min(3,4)
3

```
<a id='s-13'/>
<hr>function: <b>num</b>

```python

#  convert argument string to floating point number, if number - returns the same number value 

> num('3.7')
3.7

> num('.37e2')
37


```
<a id='s-14'/>
<hr>function: <b>pow</b>

```python
# returns the first arugment nubmer raised to the power of the second argument number

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16

```
<a id='s-15'/>
<hr>function: <b>random</b>

```python
# returns pseudo random number with value between 0 and 1 (that means it is almost random)
> random()
0.8424952895811049


```
<a id='s-16'/>
<hr>function: <b>round</b>

```python

#  convert an argument value to an integer value - without rounding down 

> round(3.2)
3

> round('3.2')
3

> round(3.7)
4

> round('3.7')
4


```
<a id='s-17'/>
<hr>function: <b>sin</b>

```python
# returns the sine of a number in radians

> sin(mathconst['pi']/2)
1

```
<a id='s-18'/>
<hr>function: <b>sqrt</b>

```python

# return the square root of the argument 
# that's the number that gives the argument number, if you multiply it by itself.

> sqrt(9)
3
> sqrt(4)
2
> sqrt(2)
1.414213562373095

```
<a id='s-19'/>
<hr>function: <b>tan</b>

```python
# returns the tangent of a number in radians

```
<a id='s-20'/>
<hr>function: <b>find</b>

```python
 
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



```
<a id='s-21'/>
<hr>function: <b>lc</b>

```python
# convert to lower case string
> lc("BIG little")
"big little"

```
<a id='s-22'/>
<hr>function: <b>len</b>

```python
# for a string argument - returns the number of characters in the string

> len("abc")
3

# for a list argument - returns the number of elements in the list

> len([1,2,3])
3

```
<a id='s-23'/>
<hr>function: <b>mid</b>

```python

# returns a substring in the text, first argument is the text, 
# second argument is the start offset, third argument is ending offset (optional)

> mid("I am me", 2, 4)
"am"
> mid("I am me", 2)
"am me"
> mid("I am me", 2, -1)
"am me"


```
<a id='s-24'/>
<hr>function: <b>repeat</b>

```python
> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"

```
<a id='s-25'/>
<hr>function: <b>replace</b>

```python

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


```
<a id='s-26'/>
<hr>function: <b>reverse</b>

```python
# return the reverse of the argument (either string or list argument)

> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"

```
<a id='s-27'/>
<hr>function: <b>split</b>

```python

# split the first argument string into tokens, the second argument specifies how to split it.

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
<a id='s-28'/>
<hr>function: <b>str</b>

```python
> str(123)
"123"
> str("abc")
"abc"

```
<a id='s-29'/>
<hr>function: <b>trim</b>

```python
# remove leading and trailing whitespace characters

> a= ' honey  '
" honey  "
> trim(a)
"honey"
> a= '\t\n a lot of honey honey \n '
"\t\n a lot of honey honey \n "
> trim(a)
"a lot of honey honey"

```
<a id='s-30'/>
<hr>function: <b>uc</b>

```python
# convert to upper case string
> uc("BIG little")
"BIG LITTLE"

```
<a id='s-20'/>
<hr>function: <b>find</b>

```python
 
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



```
<a id='s-32'/>
<hr>function: <b>match</b>

```python

# search for a match of regular expression argument (second) argument) in big text (first argument)
# returns a list - first element is zero based index of match, second is the matching string

> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> match(text,/[0-9]+/)
[2,"1232"]    



```
<a id='s-33'/>
<hr>function: <b>matchAll</b>

```python

> text="a 1232 blablalba 34234 ;aksdf;laksdf 3423"
"a 1232 blablalba 34234 ;aksdf;laksdf 3423"

> matchAll(text,/[0-9]+/)
[[2,"1232"],[17,"34234"],[37,"3423"]]



```
<a id='s-34'/>
<hr>function: <b>replacere</b>

```python

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
    


```
<a id='s-27'/>
<hr>function: <b>split</b>

```python

# split the first argument string into tokens, the second argument specifies how to split it.

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
<a id='s-36'/>
<hr>function: <b>httpSend</b>

```python


# send htp request
# - first argument - the request url
# - second argument - additional request parameters (none means http get request)
# - third argument - called upon reponse (called on both success and error)
#    resp - not none on success, error - not none on error (error message)
httpSend('http://127.0.0.1:9010/abcd', none, def(resp,error) {
    println("response: {resp} error: {error}
") 
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




```
<a id='s-37'/>
<hr>function: <b>httpServer</b>

```python
 

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



```
<a id='s-38'/>
<hr>function: <b>print</b>

```python

# prints argument values to console. 
# Can accept multiple values - each of them is converted to a string

```
<a id='s-39'/>
<hr>function: <b>println</b>

```python

# prints argument values to console, followed by newline.
# Can accept multiple values - each of them is converted to a string

```
<a id='s-40'/>
<hr>function: <b>readFile</b>

```python

# read text file and return it as a string, the file name is the first argument of this function

> fileText = readFile("fileName.txt")    
    

```
<a id='s-41'/>
<hr>function: <b>rename</b>

```python

# rename files, old file name is the first argument, the new file name is the second argument
    
rename("oldFileName","newFileName")    


```
<a id='s-42'/>
<hr>function: <b>unlink</b>

```python

# delete a number of files, returns number of deleted files
unlink([ "file1.txt", "file2.txt", "file3.txt" ])

# delete a single file, returns number of deleted files
unlink("file1.txt")    
    

```
<a id='s-43'/>
<hr>function: <b>writeFile</b>

```python

# write string parameter into text file. 
# The file name is the first argument, 
# the text value to be written into the file is the second argument

> writeFile("fileName.txt","fileContent")

# append file

> writeFile("fileName.txt","add this after end of file", "append")
   
    

```
<a id='s-44'/>
<hr>function: <b>dim</b>

```python

# defines n-dimensional array, all elements are set to zero. 
# Each argument defines the size of a dimension in the array.
    
> a=dim(4)
[0,0,0,0]

> a=dim(2,3)
[[0,0,0],[0,0,0]]

> a=dim(2,3,4)
[[[0,0,0,0],[0,0,0,0],[0,0,0,0]],[[0,0,0,0],[0,0,0,0],[0,0,0,0]]]    


```
<a id='s-45'/>
<hr>function: <b>dimInit</b>

```python

# defines n-dimensional array, all elements are set to a deep copy of the first argument. 
# Each additional argument defines the size of a dimension in the array.

> a={"a":1}
{"a":1}

> dimInit(a,2,3)
[[{"a":1},{"a":1},{"a":1}],[{"a":1},{"a":1},{"a":1}]]


```
<a id='s-46'/>
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
<a id='s-47'/>
<hr>function: <b>join</b>

```python
# given a list argument, joins the values of the list into a single string

> join(["a: ",1," b: ", true])
"a: 1 b: true"

```
<a id='s-48'/>
<hr>function: <b>joinl</b>

```python
# takes two lists and joins them into a single list, which is returned by this function

 > joinl([1,2],[3,4])
[1,2,3,4]

```
<a id='s-22'/>
<hr>function: <b>len</b>

```python
# for a string argument - returns the number of characters in the string

> len("abc")
3

# for a list argument - returns the number of elements in the list

> len([1,2,3])
3

```
<a id='s-50'/>
<hr>function: <b>map</b>

```python
# the first argument is a list, the second argument is a function that is called once for each element of the input list. The return values of this function will each be appended to the returned list.

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


```
<a id='s-51'/>
<hr>function: <b>mapIndex</b>

```python

# similar to map, the argument function is called with the list value and the index of that value within the argument list

> mapIndex([3,4,5,6],def(x,y) [2*x, y])
[[6,0],[8,1],[10,2],[12,3]]

```
<a id='s-52'/>
<hr>function: <b>pop</b>

```python

# takes an argument list, returns the last element of the list
# but also removes this last value from the argument list

 > a=[1, 2, 3]
[1,2,3]
> pop(a)
3
> a
[1,2]

```
<a id='s-53'/>
<hr>function: <b>push</b>

```python

# takes the second argument and appends it to the list, which is the first argument to this function

> a=[1, 2]
[1,2]
> push(a,3)
[1,2,3]
> a
[1,2,3]

```
<a id='s-54'/>
<hr>function: <b>range</b>

```python
> range(1,4)
[1,2,3]
> for n range(1,4) println("number: {n}")
number: 1
number: 2
number: 3

```
<a id='s-55'/>
<hr>function: <b>reduce</b>

```python

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


```
<a id='s-56'/>
<hr>function: <b>reduceFromEnd</b>

```python

# same as reduce, but working from the end of the list backward.

> def div(a,b) a/b

> reduceFromEnd([4,8,32], div, 1024)
1

same as:

> (((1024/32) / 8) / 4)
1

```
<a id='s-57'/>
<hr>function: <b>shift</b>

```python
# removes the first element from the list
> a=[1,2,3]
[1,2,3]

> shift(a)
1

> a
[2,3]    


```
<a id='s-58'/>
<hr>function: <b>sort</b>

```python
# sorts the argument list in increasing order

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
[["b",1],["a",100],["c",1000]]

```
<a id='s-59'/>
<hr>function: <b>unshift</b>

```python

# The first argument is a list, the second argument will be prepended to the argument list
# The second argument will bet the first element of the list.
# also returns the modified list

> a=[2,3]
[2,3]

> unshift(a,1)
[1,2,3]

> a
[1,2,3]    


```
<a id='s-60'/>
<hr>function: <b>each</b>

```python
# iterate over entries of a list or maps. 

# for lists: returns the list values
    
> each({"a":1,"b":2,"c":3})
[["a",1],["b",2],["c",3]]

# for maps: returns each key and value pair in a list of two elements

> pairs = each({"a":1,"b":2,"c":3})
> map( pairs, def (arg) [ arg[0]+arg[0], arg[1]*arg[1] ] )
[["aa",1],["bb",4],["cc",9]]    


```
<a id='s-46'/>
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
<a id='s-62'/>
<hr>function: <b>keys</b>

```python
# for maps: returns the keys of the map
    
> a={ "first":1, "second": 2, "third": 3}
{"first":1,"second":2,"third":3}
> keys(a)
["first","second","third"]

```
<a id='s-50'/>
<hr>function: <b>map</b>

```python
# the first argument is a list, the second argument is a function that is called once for each element of the input list. The return values of this function will each be appended to the returned list.

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


```
<a id='s-64'/>
<hr>function: <b>parseJsonString</b>

```python
# given a json formatted string as argument: returns am equivalent data structure of nested lists and maps

> parseJsonString('{"name": "Kermit", "surname": "Frog"}')
{"name":"Kermit","surname":"Frog"}
> parseJsonString('[1,2,3]')
[1,2,3]

```
<a id='s-65'/>
<hr>function: <b>parseYamlString</b>

```python
# given a yaml formatted string, : returns am equivalent data structure of nested lists and maps
         
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
<a id='s-66'/>
<hr>function: <b>toJsonString</b>

```python
# given a data argument: returns a json formatted string

> toJsonString([1,2,3])
"[1,2,3]"
> toJsonString({"name":"Pooh","family":"Bear","likes":["Honey","Songs","Friends"]})
"{\"name\":\"Pooh\",\"family\":\"Bear\",\"likes\":[\"Honey\",\"Songs\",\"Friends\"]}"

```
<a id='s-67'/>
<hr>function: <b>toYamlString</b>

```python
# given a data argument: returns a yaml formatted string
    
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
<a id='s-68'/>
<hr>function: <b>chdir</b>

```python

# change the current directory. 
# That's the current directory of processes created with system, exec or via backick operator
 


```
<a id='s-69'/>
<hr>function: <b>exec</b>

```python

# run a process and receive the input output in a callback. Returns the process id as return value 

# callback is called 
# - when standard output or error has been read (second or third parameter is set)
# - an error occurred (first parameter is set)

# returns the process id of the new process

pid = exec("ls /", def(ex,out,err) { println("error: {ex} standard output: {out} standard error: {err}") })

    

```
<a id='s-70'/>
<hr>function: <b>exit</b>

```python

# exit() - exit program with status 0 (success)
# exit(1) - exit program with status 1 (failure)

```
<a id='s-71'/>
<hr>function: <b>getcwd</b>

```python

# returns the current directory of processes created with system, exec or via backick operator `



```
<a id='s-72'/>
<hr>function: <b>kill</b>

```python

# gets process id returned by exec. kills the process.    


```
<a id='s-73'/>
<hr>function: <b>sleep</b>

```python
    
# sleep for three seconds    
sleep(3)


```
<a id='s-74'/>
<hr>function: <b>system</b>

```python
# runs the string command in a shell, returns an array where the first element is the standard output of the command, the second element of the list is the exit code of the process
    
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
<a id='s-75'/>
<hr>function: <b>assert</b>

```python

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


```
<a id='s-76'/>
<hr>function: <b>clone</b>

```python

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


```
<a id='s-77'/>
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

> eval("pythagoras(3,4)")
5



```
<a id='s-78'/>
<hr>function: <b>getPYXOptions</b>

```python

# get opttions of the PYX runtime

> getPYXOptions()
{"trace":false,"errorExit":false,"framesInError":20}



```
<a id='s-79'/>
<hr>function: <b>help</b>

```python

# Show help text for built-in functions: Example usage:
 
help(sort)

# to get a list of functions with help text:
help()



```
<a id='s-80'/>
<hr>function: <b>localtime</b>

```python
# decodes epoch time into map
    
> localtime(time())
{"seconds":22,"minutes":33,"hours":7,"days":1,"year":2023,"month":0}    


```
<a id='s-81'/>
<hr>function: <b>setPYXOptions</b>

```python

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


```
<a id='s-82'/>
<hr>function: <b>time</b>

```python
# returns epoch time in seconds

```
<a id='s-83'/>
<hr>function: <b>type</b>

```python
# returns a string that describes the argument value
    
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
<a id='s-84'/>
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
<a id='s-85'/>
<hr>function: <b>ENV</b>

```python
# environment variables, entry key is the name of the environment variable, the entry value is it's value

```
<a id='s-86'/>
<hr>function: <b>mathconst</b>

```python
# map of mathematical constants.

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
    

```
