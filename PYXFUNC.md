# pyxfunc - PYX functions reference by category

## Functions for scalars or strings
<a href='#s-1'>find</a>&nbsp;,&nbsp;<a href='#s-2'>lc</a>&nbsp;,&nbsp;<a href='#s-3'>len</a>&nbsp;,&nbsp;<a href='#s-4'>mid</a>&nbsp;,&nbsp;<a href='#s-5'>repeat</a>&nbsp;,&nbsp;<a href='#s-6'>replace</a>&nbsp;,&nbsp;<a href='#s-7'>reverse</a>&nbsp;,&nbsp;<a href='#s-8'>split</a>&nbsp;,&nbsp;<a href='#s-9'>str</a>&nbsp;,&nbsp;<a href='#s-10'>trim</a>&nbsp;,&nbsp;<a href='#s-11'>uc</a>
## Numeric functions
<a href='#s-12'>abs</a>&nbsp;,&nbsp;<a href='#s-13'>atan</a>&nbsp;,&nbsp;<a href='#s-14'>cos</a>&nbsp;,&nbsp;<a href='#s-15'>int</a>&nbsp;,&nbsp;<a href='#s-16'>max</a>&nbsp;,&nbsp;<a href='#s-17'>min</a>&nbsp;,&nbsp;<a href='#s-18'>num</a>&nbsp;,&nbsp;<a href='#s-19'>pow</a>&nbsp;,&nbsp;<a href='#s-20'>random</a>&nbsp;,&nbsp;<a href='#s-21'>sin</a>&nbsp;,&nbsp;<a href='#s-22'>sqrt</a>&nbsp;,&nbsp;<a href='#s-23'>tan</a>
## Input and output functions
<a href='#s-24'>print</a>&nbsp;,&nbsp;<a href='#s-25'>println</a>&nbsp;,&nbsp;<a href='#s-26'>readFile</a>&nbsp;,&nbsp;<a href='#s-27'>rename</a>&nbsp;,&nbsp;<a href='#s-28'>unlink</a>&nbsp;,&nbsp;<a href='#s-29'>writeFile</a>
## Functions for arrays
<a href='#s-30'>exists</a>&nbsp;,&nbsp;<a href='#s-31'>join</a>&nbsp;,&nbsp;<a href='#s-32'>joinl</a>&nbsp;,&nbsp;<a href='#s-3'>len</a>&nbsp;,&nbsp;<a href='#s-34'>map</a>&nbsp;,&nbsp;<a href='#s-35'>mapIndex</a>&nbsp;,&nbsp;<a href='#s-36'>pop</a>&nbsp;,&nbsp;<a href='#s-37'>push</a>&nbsp;,&nbsp;<a href='#s-38'>range</a>&nbsp;,&nbsp;<a href='#s-39'>reduce</a>&nbsp;,&nbsp;<a href='#s-40'>reduceFromEnd</a>&nbsp;,&nbsp;<a href='#s-41'>sort</a>
## Functions for maps
<a href='#s-42'>each</a>&nbsp;,&nbsp;<a href='#s-30'>exists</a>&nbsp;,&nbsp;<a href='#s-44'>keys</a>&nbsp;,&nbsp;<a href='#s-34'>map</a>
## Function for working with json/yaml
<a href='#s-46'>parseJsonString</a>&nbsp;,&nbsp;<a href='#s-47'>parseYamlString</a>&nbsp;,&nbsp;<a href='#s-48'>toJsonString</a>&nbsp;,&nbsp;<a href='#s-49'>toYamlString</a>
## functions for working with processes
<a href='#s-50'>exit</a>&nbsp;,&nbsp;<a href='#s-51'>sleep</a>&nbsp;,&nbsp;<a href='#s-52'>system</a>
## Other functions
<a href='#s-53'>help</a>&nbsp;,&nbsp;<a href='#s-54'>localtime</a>&nbsp;,&nbsp;<a href='#s-55'>setTrace</a>&nbsp;,&nbsp;<a href='#s-56'>time</a>&nbsp;,&nbsp;<a href='#s-57'>type</a>
## Global variables
<a href='#s-58'>ARGV</a>&nbsp;,&nbsp;<a href='#s-59'>ENV</a>&nbsp;,&nbsp;<a href='#s-60'>mathconst</a>

<a id='s-1'/>
<hr>function: <b>find</b>

```python
> find("big cat", "big")
0
> find("big cat", "cat")
4
> find("big cat", "bear")
-1



```
<a id='s-2'/>
<hr>function: <b>lc</b>

```python
> lc("BIG little")
"big little"

```
<a id='s-3'/>
<hr>function: <b>len</b>

```python
> len("abc")
3
> len([1,2,3])
3

```
<a id='s-4'/>
<hr>function: <b>mid</b>

```python
> mid("I am me", 2, 4)
"am"
> mid("I am me", 2)
"am me"
> mid("I am me", 2, -1)
"am me"


```
<a id='s-5'/>
<hr>function: <b>repeat</b>

```python
> repeat("a",3)
"aaa"
> repeat("ab",3)
"ababab"

```
<a id='s-6'/>
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
<a id='s-7'/>
<hr>function: <b>reverse</b>

```python
> reverse([1,2,3,4])
[4,3,2,1]
> reverse("abcd")
"dcba"

```
<a id='s-8'/>
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

```
<a id='s-9'/>
<hr>function: <b>str</b>

```python
> str(123)
"123"
> str("abc")
"abc"

```
<a id='s-10'/>
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
<a id='s-11'/>
<hr>function: <b>uc</b>

```python
> uc("BIG little")
"BIG LITTLE"

```
<a id='s-12'/>
<hr>function: <b>abs</b>

```python
> abs(-3)
3
> abs(3)
3

```
<a id='s-13'/>
<hr>function: <b>atan</b>

```python
returns the inverse tangent (in radians) of a number

```
<a id='s-14'/>
<hr>function: <b>cos</b>

```python
returns the cosine of a number in radians
> cos(mathconst['pi'])
-1

```
<a id='s-15'/>
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
<a id='s-16'/>
<hr>function: <b>max</b>

```python
> max(3,4)
4
> max(4,3)
4

```
<a id='s-17'/>
<hr>function: <b>min</b>

```python
> min(4,3)
3
> min(3,4)
3

```
<a id='s-18'/>
<hr>