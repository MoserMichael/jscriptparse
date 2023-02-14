
<!-- toc-start -->

* [PYXTUT - tutorial for the PYX scripting language](#s-1)
  * [First steps](#s-1-1)
    * [Installation](#s-1-1-1)
    * [Using the interactive shell](#s-1-1-2)
    * [Running programs](#s-1-1-3)
  * [An overview](#s-1-2)
    * [functions and lists of values](#s-1-2-4)
    * [Statements](#s-1-2-5)
    * [Maps](#s-1-2-6)
    * [Object based programming](#s-1-2-7)
    * [Functional programming](#s-1-2-8)
    * [Splitting up a program into multiple source files](#s-1-2-9)
  * [Features for specific tasks](#s-1-3)
    * [Working with text](#s-1-3-10)
    * [Regular expressions](#s-1-3-11)
    * [Running processes](#s-1-3-12)
    * [working with structured data (json and yaml)](#s-1-3-13)
  * [Even more language features](#s-1-4)
    * [Error handling with exceptions](#s-1-4-14)
    * [Generators and the yield statement](#s-1-4-15)
  * [Input and output](#s-1-5)
    * [reading/writing files](#s-1-5-16)
    * [HTTP clients](#s-1-5-17)
    * [HTTP servers](#s-1-5-18)
  * [Conclusion](#s-1-6)
<!-- toc-end -->











































# <a id='s-1' />PYXTUT - tutorial for the PYX scripting language

## <a id='s-1-1' />First steps

### <a id='s-1-1-1' />Installation

First we need the to install node.js - you can download an installer [here](https://nodejs.org/en/download/) (also see Instruction for installing [node.js on Linux](https://nodejs.org/en/download/package-manager/#centos-fedora-and-red-hat-enterprise-linux) )

Now, from the command line: Install the pyx shell with the following command 

```
npm install pyxlang -g
```

(You can always uninstall it later with the command ```npm uninstall pyxlang -g```)

### <a id='s-1-1-2' />Using the interactive shell

Run the ```pyx``` program, first thing you see is a command prompt

```
>
```

You can enter arithmetic expression, and see the result

```
> 2+2
4
```

Or more complicated ones: the sum of the square of three with the square of two

```
> 3*3+2*2
13
```

or even more complicated ones: First the expression ```5-2``` is computed, that's because of the brackets. This can be usefull: sometimes you are not quite sure which expression is computed first - the brackets force some order into all of this. 

```
> 3*(5-3)+2*2
10
```

You can always return to the previous expression with arrow up and to the next expression with the arrow up and down - and change them all over (that's a big deal!)

(the ```pyx``` program is also writing the ```pyx_history``` file, each time that you run a statement successfully it is written onto the end of this file)


One important detail: In the shell it is possible to write a statements in more than one line. This looks as follows

```
> 2 *
... 3
6
```

However in the ```pyx_history``` file this will look as follows:

```
2 *
3
```

The ```...``` symbol is only displayed in the interactive shell, it is a sign that the previous line has been continued and that the shell is waiting for more input.
A real program will not have the ```...``` symbol, it is not part of the text that you are typing.


Now you also have mathematical constants, these are numbers that should never change, like the number Pi and the Euler constant (it looks a bit strange right now, we will learn about maps in a later chapter)

```
> mathconst.pi
3.141592653589793

> mathconst.e
2.718281828459045
```

You can ask about stuff, typing  ```help(mathconst)``` will explain all about ```mathconst```

In the shell: 

```
> help(mathconst)

# map of mathematical constants.

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

You can compute the sinus of pi as follows: ```cos``` is a function, you can ask ```cos``` to compute the cosine on any number ```cos(3)``` returns the cosine of 3.

```
> cos(3)
-0.9899924966004454
```

Of the cosine of pi:

```
> cos(mathconst['pi'])
-1
```

You have a lot of functions here: press on the TAB key twice and you get the whole list of reserved words and functions
(The TAB key has the following label on the keyboard  ```->|```)

```
>
and               break             continue          def               elif              else              false             for               if                none
not               or                return            true              use               while             yield             ARGV              ENV               abs(
atan(             cos(              each(             exists(           exit(             find(             help(             int(              join(             joinl(
keys(             lc(               len(              localtime(        map(              mapIndex(         mathconst         max(              mid(              min(
parseJsonString(  pop(              pow(              print(            println(          push(             random(           range(            readFile(         reduce(
repeat(           reverse(          sin(              sort(             split(            sqrt(             str(              system(           tan(              time(
toJsonString(     type(             uc(               writeFile(
```

See more information about the built-in functions in [this reference](PYXFUNC.md)

You also have variables:  A variable is a name that can be assigned a value (more exactly: it is a name that stands for a location in computer memory where a value is being stored)

```
> two=2
2
> three=3
3
```

If you use ```two``` in a mathematical expression, then the value ```2``` will be used - that's the value that we just assigned to the variable!

```
> two * three
6
```


You can make your own function that computes the sum of the square and the cube of a number

```
> def twoSquarePlusOne(x) x * x + 1
```

* Here ```def``` means that we are defining a function
* ```twoSquarePlusOne(x)``` mean that we are defining the function called ```twoSquarePlusOne``` and that the function needs to get a parameter called ```x```
* when you use the function, then it retuns the following expression, computed with the value of the parameter : ```x * x + 1 ``` that means the argument value raised to the power of two and add one to it/

Let's use that function! 

Look at ```twoSquarePlusOne(2)``` - here the argument x is set to the parameter variable ```2```, and that is used to compute the expression ```x * x  + 1``` - meaning ```2 * 2  + 1``` meaning 5.

```
> twoSquarePlusOne(2)
5

> twoSquarePlusOne(3)
10

> twoSquarePlusOne(4)
17

```


The built-in function ```pow``` computes two raised to the power of three, (that means: two multiplied by two multplied by two)
```
pow(2,3)
8
```

The same function ```twoSquarePlusOne``` can be written as follows: now it uses the built-in function ```pow``` - this one computes the power of a number

```

> def twoSquarePlusOne(x) pow(x,2) + 1


> twoSquarePlusOne(2)
9

> twoSquarePlusOne(3)
10

```

You can get some explanation on the built-in function pow, or look at the [PYX function reference - pyxfunc](PYXFUNC.md)

Or you can use the built-in function ```help``` to tell us about the built-in function ```pow```

```
> help(pow)

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16

```

Autocompletion: a big trick - you can write the beginning of a function or variale name and then press the TAB key twice - it will show you the name of all functions that start with wht you just typed. ```s tab tab``` will show you the list of functions that start with the letter s.
(The TAB key has the following label on the keyboard  ```->|```)

```
> s
s(       sin(     sort(    split(   sqrt(    str(     system(
```

if you type ```si TAB TAB``` then there is only one function sin(  - so it will just put sin( at the place where you are typing. Believe me, that's a big time saver

There are other keyboard shortcuts in the shell:

<table width='100%'>
<tr>
    <th>
        Shortcut 
    </th>
    <th>
         What it does 
    </th>
<tr>
<tr>
    <td>
         Ctrl-a
    </td>
    <td>
         Jump to the beginning of the current line 
    </td>
</tr>
<tr>
    <td>
         Ctrl-e
    </td>
    <td>
         Jump to the end of the current line 
    </td>
</tr>
<tr>
    <td>
         Ctrl-r
    </td>
    <td>
        Search backwords through the command history
    </td>
</tr>
</table>

### <a id='s-1-1-3' />Running programs

You can store a sequence of commands in a file lets save the following text in the file named ```p.p```

```
def pythagoras(sideA, sideB) sqrt( pow(sideA,2) + pow(sideB,2) )

a=3
b=4

println( pythagoras(a, b) )
```

The statements here are computing the length of the hypothenuse of a right triangle, where the two legs are of length 3 and 4.

To run the program write the following command ```pyx p.p```

```
pyx p.p

5
```

You can add the ```-x``` command line option, this traces each statement of the program, while the program is running:

```
pyx -x p.p

+ a = 3
+ b = 4
pythagoras(sideA=3, sideB=4)
+ pow(3, 2) {
+ 9
}+ pow(4, 2) {
+ 16
}+ sqrt(25) {
+ 5
}+ }
+ println(5) {
5
+ }
```


## <a id='s-1-2' />An overview

### <a id='s-1-2-4' />functions and lists of values

You can have a list of the numbers between one and five. 

```
> a=[1,2,3,4,5]
[1,2,3,4,5]
```

A list is defined by putting ```[``` followed by the values contained in the list, at the end of the list you put in a ```]``` character.
The values in the list are all separated by a comma.


or get such a list with the ```range``` function

```
> a=range(1,10)
[1,2,3,4,5,6,7,8,9]
```

or get a list of the odd numbers between one and twenty (odd numbers do not divide by two)
The third parameter to range is the value that is used as an increment. The value of one is used, if we have only pass two parameter to the ```range``` function.

```
> a=range(1,20,2)
[1,3,5,7,9,11,13,15,17,19]
```

One thing you can do is access the first, second and third elements of the list, like this

```
> a[0]
1
> a[1]
3
> a[2]
5
```

### <a id='s-1-2-5' />Statements

You can do the same thing differently, this time less magic is involved:

lets print out all numbers between one and one hundred in a differnt way

```
> i=0
0
> while i<100 {
... println(i)
... i=i+1
... }

1
2
3
....
100
```

- First the number 0 is put into variable i
- now we have a ```while``` statement: this one continues to do the stuff within the brackets { and }, while the variable i is smaller than 100.  
    - Now the stuff in the brackets does two things - it prints out the value of i with ```println(i)``` and then sets i to the value of i plus one.
    - lets look at ```i=i+1``` the right hand side ```i+1``` takes the old value of i and adds one to it. Now we got a new value, this new value is then stored back into the memory location referred to by variable ```i```
      So we take the old value and add one to it, and then put that value back into variable ```i```.
- if you want to group togather more then one statement then you need to put these within the brackets { and }

Now lets get the sum of all squares between one and one hundred

```
> i=0
0
> sum=0
0
> while i<100 {
... sum=sum+i*i
... i=i+1
... }

> println(sum)
328350
```

Again: ```sum=sum+i*i``` , first take and compute the square of ```i*i``` and add that result to the old value of ```sum```, then put the computed value back into variable ```sum```


Or you can make a function that computes the sum of all the squares of numbers for a given range numbers


```
> def sumOfSquares(from,to) {
... sum=0
... while from<to {
... sum=sum+from*from
... from=from+1
... }
... return sum
... }

> println(sumOfSquares(1,10))
285

> println(sumOfSquares(1,42))
23821

> println(sumOfSquares(1,100))
328350
```

It is possible to write the same thing as a ```for``` loop.

A for loop is quite similar, you have a number x that is running for every value provided by the ```range``` function.
However you don't have to add one to a variable and check if the loop condition is try, the for loop just runs on all values provided by the range function..
The following statement is run for each of these values.

```
> def sumOfSquares(from,to) {
... sum=0
... for x range(from,to)
... sum=sum+x*x
... return sum
... }

> println(sumOfSquares(1,10))
285

> println(sumOfSquares(1,42))
23821

> println(sumOfSquares(1,100))
328350
```

Is a for loop better than a while loop? Depends how you look on it,

- on the one hand a while loop has a lot of flexibility - you are writing the expression that checks if you continue with the loop.
- on the other hand a for loop means less code, less code means fewer opportunities to do something wrong.

It's a kind of trade off - the world of programming has many trade offs...


### <a id='s-1-2-6' />Maps

There is a type of data called a map. It allows to give names to things.

Like the days of the week - this map has the key, the number of the day of a week, and the name of the day.

We put the map into a variable called dayOfWeek. 

```
> dayOfWeek = { 1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday", 5: "Thursday", 6: "Friday", 7: "Saturday" }
{"1":"Sunday","2":"Monday","3":"Tuesday","4":"Wednesday","5":"Thursday","6":"Friday","7":"Saturday"}
```

And then show the name of the day of the week - ```dayOfWeek[6]``` shows the name of the sixth day.

```
> println(dayOfWeek[6])
Friday
```

Now you can also map between the name of the day and its number.

```
> dayOfWeekReverse = { "Sunday" : 1, "Monday" : 2, "Tuesday" : 3, "Wednesday" : 4, "Thursday" : 5, "Friday" : 6, "Saturday" : 7 }
{"Sunday":1,"Monday":2,"Tuesday":3,"Wednesday":4,"Thursday":5,"Friday":6,"Saturday":7}
>

> dayOfWeekRevers["Tuesday"]
3
```

Of you can use the map to organize your data, like having a list of records for each employees in the muppet show:

```
> employees = [ { "Name": "Kermit", "Surname": "Frog", "Profession": "Producer" }, { "Name": "Fozzy", "Surname": "Bear", "Profession": "Comedian" } ]
[{"Name":"Kermit","Surname":"Frog","Profession":"Producer"},{"Name":"Fozzy","Surname":"Bear","Profession":"Comedian"}]
> firstEmployee=employees[0]
{"Name":"Kermit","Surname":"Frog","Profession":"Producer"}

> firstEmployee=employees[0]

> firstEmployee["Name"]
"Kermit"

> secondEmployee=employees[1]
{"Name":"Fozzy","Surname":"Bear","Profession":"Comedian"}

> secondEmployee["Surname"]
"Bear"

```

### <a id='s-1-2-7' />Object based programming

Lets say we have a map like this:

```
> a={"Name": "Pooh", "Surname": "Bear", "Likes": "Friends and Songs and lots of stuff"}
{"Name":"Pooh","Surname":"Bear","Likes":"Friends and Songs and lots of stuff"}
```

Now you can access an element of the map by the name of a key - just like this:

```
> a['Name']
"Pooh"
```

However there is also a shorter way - if the key of the entry looks like an identifier (it means that it doesn't have spaces and only consists of letters digits and underscore characters)

```
> a.Name
"Pooh"
```

That has a been added for a reason - to make it easier to use the map in a program.

```
> def makePoint(posX, posY)
... return { "x": posX, "y": posY }
"<function>"

> p=makePoint(12,20)
{"x":12,"y":20}

> p.x
12

> p.y
20

> p.x+p.y
32
```

This is a shorter form of using the map, you can now access the fields of the map, as if they were properties of a record or an object.

Now some fields of the map can also be function values


```
> def makeComplex(re, im) {
...     t = {
...              "re": re,
...              "im": im,
...              "add": def(c) {
...                 return makeComplex(t.re + c.re, t.im + c.im)
...               },
...               "show": def() {
...                 println("re: {t.re} im: {t.im}")
...               }
...         }
...     return t
... }
"<function>"
>
```

Here the ```makeComplex``` function is returning a map with the propertes ```re``` and ```im``` - these are numbers. But the properties ```add``` and ```show``` can work on the properties of the same map - by accessing the captured variable ```t```. This way we just made an object that acts like a complex number, see here:

```
> a=makeComplex(2,3)
{"re":2,"im":3,"add":"<function>","show":"<function>"}

> b=makeComplex(4,5)
{"re":4,"im":5,"add":"<function>","show":"<function>"}

> c=a.add(b)
{"re":6,"im":8,"add":"<function>","show":"<function>"}

> c.show()
re: 6 im: 8
```

Some say that [Objects and Closures are equivalent](https://wiki.c2.com/?ClosuresAndObjectsAreEquivalent), however this is the subject of a lively debate (see the [link](https://wiki.c2.com/?ClosuresAndObjectsAreEquivalent) ).

### <a id='s-1-2-8' />Functional programming

Now compute a list of the squares of all numbers between one and 10.

The first step is to define a function ```square``` that computes the square of the number given as argument. note that the last mathematical expression is also computing the value returnd by the function)

```
> def square(x) x * x

> square(2)
4
> square(3)
9
> square(4)
16
```

The built-in ```map``` function will call the ```square``` function on all element of the list of numbers from one to 9 - and return a new list with the result. In the returned list each number of the original list is turned into its square!

```
> map( range(1,10), square)
[1,4,9,16,25,36,49,64,81]
```

Now lets the compute the sum of all the squares between one and ten

First put that list of squares in a variable - squares

```
> squares=map( range(1,10), square)
[1,4,9,16,25,36,49,64,81]
```

now let's get the sum of the squares between one and ten with the built-in ```reduce``` function.

```
> def sum(x,y) x+y

> reduce(squares, sum, 0)
285
```

The reduce function calls ```sum``` on the initial value 0 and the first value of the list. Next it calls ```sum``` on the result of the previous step and the second value of the list, and so on.

It would be the same as calling ``` sum( squares[2], sum( squares[1]. sum( squares[0], 0)))) ``` and so on, up until the last element.



You can also have functions that return other functions. now that's a bit tricky:

function ```anypower``` gets the argument variable n.
all it does is to return an unnamed function as return value ```def(x) pow(x,y)``` this function can always use the outer variable n - as it was passed when ```anypower``` was called.

```
> def anypower(n)
... return def(x) pow(x,n)
```

Now calling ```anypower(3)``` will return another function that will always compute the power of three.

```
> powOfThree=anypower(3)

> powOfThree(2)
8
> powOfThree(3)
27
> powOfThree(4)
64

```

There are a number of almost magical tricks here:

- ```def(x) pow(x,n)``` is using the variable ```n``` that is defined outside of that same function - that's because it is nested within the ```anypower``` function, so that the value of ```n``` becomes part of the environment of the returned function
-  also see that the function ```def(x) pow(x,n)``` does not have a name, that's on purpose - it's an anonymous function that is used only as a return value
-   ```powOfThree=anyposer(3)``` - the returned function is stored in variable ```powOfThree```. that means that a function is a kind of value, that can hold some captured state in i (this is referring to the value n, that is defined outside of the returned function).
- ```powOfThree(3)``` - the function stored in the variable ```powOfThree``` is used as a function.

An now you can use that to compute the table of squares for any number

```
> map( range(1,10), anypower(2) )
[1,4,9,16,25,36,49,64,81]

> map( range(1,10), anypower(3) )
[1,8,27,64,125,216,343,512,729]

> map( range(1,10), anypower(4) )
[1,16,81,256,625,1296,2401,4096,6561]
```

And now lets get the sum of the power of three for the numbers between one and one hundred

```
> reduce( map( range(1,100), anypower(3) ), sum, 0)
24502500
```

It takes a while to learn all these conceptt. It blew my mind, when I somehow learned all this, believe me!

All this has a big advantage - when dealing with a big program it is easier to think of it in terms of functions,

Assign statements can change all sorts of variables, you can't know which variables have been changed at any given moment,
now things become much easier when you only view the progam in terms of functions.

(However you may ignore all of this, just get your program going with statemnts that doe assighments, like in the previous chapter - i would dare to say this ;-)

i think that it helps to look at problems from a different perspectives, i think that's the real value of functional programming - even if you don't do that in your day-to-day business, it is important to know that there is a different view on things. I think that this is generally important in life, not just in programming.

### <a id='s-1-2-9' />Splitting up a program into multiple source files

You can divide your program into multiple files. That's can be very convenient if the file grows too large, or if you have a function that you want to use in more than one program, without having to copy the text of the function.

Let's write down the following text info file ```testuse.p```

```

def newComplex(x,y) {
    return [x, y]
}

def cadd(a, b) {
    return [ a[0] + b[0], a[1] + b[1] ]
}

def cmul(a, b) {
    return [ a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1] ]
}    

def cshow(a) {
    return "{a[0]}+i{a[1]}"
}

```

You can now include the text of file ```testuse.p``` and use all the functions that were declared in that file:

```
> use "testuse.p"
"<function>"

> use "tests/testuse.p"
"<function>"

> a=newComplex(2,3)
[2,3]

> b=newComplex(4,5)
[4,5]

> c=cmul(a,b)
[-7,22]

> cshow(c)
"-7+i22"
```

An important detail: if you have the ```PATH``` environment variable set, then the statement ```use "testuse.p"``` will search for the file name "testuse.p" in all directories specified by the ```PATH``` environment variable.

## <a id='s-1-3' />Features for specific tasks

### <a id='s-1-3-10' />Working with text

You can define variables that refer to text. lets define variable `a` that refers to the text  `hello world` and then print that text to the screen with the function println

```
> a='hello world'
"hello world"
> println(a)
hello world
```

Working with text is a bit like working with an array - you can access each letter contained within the text like this: (accessing a letter that is outside of the range gives you an error)

```
> a='123'
"123"
> a[0]
"1"
> a[1]
"2"
> a[2]
"3"
> a[3]
Error: Can't lookup index 3
```


the text is included within the characters ```'``` 

You can have multiple lines of text - every string constant can span multiple lines.

```
> a='hello
...    beautiful
...       world'
"hello\n   beautiful\n      world"
> println(a)
hello
   beautiful
      world
```      

The lines are separated by a newline character - you can either enter a new line or write it as the sequence of characters ```\n```

This here is the same text!

```
> a='hello\n   beautiful\n      world'
"hello\n   beautiful\n      world"
> println(a)
hello
   beautiful
      world
```      


Now there is also a second form of writing text constants: with the ```"``` character. 
Now this form is very different from the previous form. This one is used for writing reports.

You can have sections within the characters ```{``` and ```}``` - these refer to variables in the program. 
If this is text is used in a program, then you will see the the following:

```
> numBottles=10
10
> song="{numBottles} of juice on the wall, take one down and you will have {numBottles-1}"
"10 of juice on the wall, take one down and you will have 9"
> println(song)
10 of juice on the wall, take one down and you will have 9
```

Now you can write a program that tells you the whole story:

```
> numBottles=5
5
> while numBottles>1 {
... println("{numBottles} of juice standing on the wall, take one down and you will have {numBottles-1}")
... numBottles = numBottles - 1
... }
5 of juice standing on the wall, take one down and you will have 4
4 of juice standing on the wall, take one down and you will have 3
3 of juice standing on the wall, take one down and you will have 2
2 of juice standing on the wall, take one down and you will have 1
```

The same program can be written with fewer commands, in this form:

```
> for numBottles range(5,0,-1)
... println("{numBottles} bottles of juice standing on the wall, take one down and you will have {numBottles-1}")
5 bottles of juice standing on the wall, take one down and you will have 4
4 bottles of juice standing on the wall, take one down and you will have 3
3 bottles of juice standing on the wall, take one down and you will have 2
2 bottles of juice standing on the wall, take one down and you will have 1
1 bottles of juice standing on the wall, take one down and you will have 0

```

Or you can have a function that receives the number of bottles to write the song - this has a big advantage: you can just call the function and tell it the number of lines you want to print on the screen

```
> def showBottleSong(maxBottles)
... for numBottles range(maxBottles,0,-1)
... println("{numBottles} of juice standing on the wall, take one down and you will have {numBottles-1}")
"<function>"

> showBottleSong(5)
5 of juice standing on the wall, take one down and you will have 4
4 of juice standing on the wall, take one down and you will have 3
3 of juice standing on the wall, take one down and you will have 2
2 of juice standing on the wall, take one down and you will have 1
1 of juice standing on the wall, take one down and you will have 0

> showBottleSong(3)
3 of juice standing on the wall, take one down and you will have 2
2 of juice standing on the wall, take one down and you will have 1
1 of juice standing on the wall, take one down and you will have 0

```

You can also text values with the ```+``` sign

```
> title="very big"
"very big"
> animal="bear"
"bear"
> title+" "+animal
"very big bear"
```

But you can't add a text value and a number - that's an error

```
> lives=9
9

> "cat lives: " + lives
Error: Can't add String to Number
#(1) "cat lives: " + lives
   |...............^

```

You can turn a number into a string with the ```str``` function, now this one is valid:

```
> "cat lives: " + str(lives)
"cat lives: 9"
```

The other way round: you can turn a text string into a floating point number

```
> num('3.141516')
3.141516
> num('.031415e2')
3.1415
```

Or you can turn a text string into an integer

```
> int('12345')
12345
```

Thie can also be used to round floating point values to integers

```
> int(3.1415)
3
> int("3.1415")
3
```

A text string that starts with 0x counts as a hexadecimal number (with base 16)

```
> int('0xFF')
255
```

Or you can explicitly set the radix/base like this:

```
> int('FF', 16)
255
```


There are also other built-in [functions with strings](https://github.com/MoserMichael/jscriptparse/blob/HEAD/PYXFUNC.md#functions-for-scalars-or-strings)

A function that returns the number of chracters in a text

```
> len('Rivers know this: There is no hurry. We shall get there some day.')
65
```

Like finding the position of a text within a larger text

```
> find('Its raining cats and dogs!', 'cats')
12
> find('Its raining cats and dogs!', 'dogs')
21
```

The function returns -1 when it can't find the text

```
> find('Its raining cats and dogs!', 'bears')
-1
```


You can extract the text between the first and the third character of a text - like this

```
> a='I’m so rumbly in my tumbly.'
"I’m so rumbly in my tumbly."

> mid(a,0,3)
"I’m"
```

Or get all of the text after the fourth character

```
> mid(a,4)
"so rumbly in my tumbly."
```

You can repeat a text three times like this

```
> repeat('Oh, bother. ', 3)
"Oh, bother. Oh, bother. Oh, bother. "
```

or change all of the occurances of one string with another one

```
> b=repeat('Oh, bother. ', 3)
"Oh, bother. Oh, bother. Oh, bother. "

> replace(b,"Oh,", "No", -1)
"No bother. No bother. No bother. "
```

Of replace just the first occurance of one string with another one

```
> replace(b,"Oh,", "No", 1)
"No bother. Oh, bother. Oh, bother. "
```

Or replace the first two occurances like this:

```
> replace(b,"Oh,", "No", 2)
"No bother. No bother. Oh, bother. "
```

### <a id='s-1-3-11' />Regular expressions

Sometimes you don't want to find an exact string, instead it is possible to specify a pattern that can match a multitude of possible text values.
A regular expression describes a text pattern, you can do some neat tricks with these patterns.

The most simple kind of pattern looks like this ```/Pooh/``` - it matches the string ```Pooh```

```
> text="So Winnie-the-Pooh went round to his friend Christopher Robin, who lived behind a green door in another part of the forest."
"So Winnie-the-Pooh went round to his friend Christopher Robin, who lived behind a green door in another part of the forest."

> match(text,/Pooh/)
[14,"Pooh"]
```

The function ```match``` is searching for the regular expression /Pooh/ - and returns the first match, which is at position 14 within the text.

Now You can also search for Either Pooh or Christopher like this:

```
> matchAll(text,/Pooh|Christopher/)
[[14,"Pooh"],[44,"Christopher"]]

```
The regular expression  ```/Pooh|Christopher/``` matches either the string ```Pooh``` or the string ```Christopher```, the function ```matchAll``` returns all matches of the regular expression, for each match you get an array with the position of the entry and the text of the match.


```
> text="asdasd pooh12 aa pooh3423 eee"
"asdasd pooh12 aa pooh3423 eee"

> matchAll(text,/pooh[0-9]+/)
[[7,"pooh12"],[17,"pooh3423"]]

```

The regular expression ```/pooh[0-9]+/``` is matching the string ```pooh``` that must be followed by one or more digits. ```[0-9]``` matches any digit (any character in the range of 0123456789) and ```[0-9]+``` means that one or more digits are matched.

You can also use regular expressions to modify text

```
 text="Pooh,Bear ## Roo,Kanga ## Christopher,Robin "
"Pooh,Bear ## Roo,Kanga ## Christopher,Robin "

> replacere(text, /([a-zA-Z]+),([a-zA-Z]+)/, "$2;$1", -1)
"Bear;Pooh ## Kanga;Roo ## Robin;Christopher "
```

The regular expression  ```/([a-zA-Z]+),([a-zA-Z]+)/``` is matching any sequence of letters followed by a ```,``` and then followed by another sequence of letters.

The third parameter to ```replacere``` is telling the function how to substitute a match, here we have ```$2:$1``` what does that mean?

Now look at the group ```([a-zA-Z]+)``` - the parenthesis mean that this is a group, a sub-expression. The first occurence is referred to as ```$1``` in the replacement string, while the second group is ```$2``` - the replacement string swaps the first and the second group, and places a ```:``` character between them! 


You can use regular expression to split up a text into pieces

```
> text="Roo : Kanga :: Piglet ::: Pooh"
"Roo : Kanga :: Piglet ::: Pooh"

> split(text, /:+/)
["Roo "," Kanga "," Piglet "," Pooh"]
````

Here the function ```split``` is taken the  input text, and splitting it up. The delimiter between the pieces is ```/:+/``` - any sequence of ```:``` characters

```
> split(text, /\s*:+\s*/)
["Roo","Kanga","Piglet","Pooh"]
```

Now here the delimiter is a bit more complicated: ```/\s*:+\s*/``` - it is a sequence of zero or more whitespace characters.
Let's look at ```\s*``` , here ```\s``` is standing for a whitespace character and the ```*``` suffix means zero or more of these
```:+``` means one or more ```:``` characters.

There are a few more options for regular expression, Please see this [Regualar expression cheatsheet](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Cheatsheet) (The explanation in the link is relevant for javascript as well as the PYX language)

### <a id='s-1-3-12' />Running processes

You can run other command line programs, just like this:

```
> res = system("ls /")
["Applications\nLibrary\nSystem\nUsers\nVolumes\nbin\ncores\ndev\netc\nhome\nopt\nprivate\nsbin\ntmp\nusr\nvar\n",0]
```

The ```system``` function runs the given command, it returns a list of two values - the output of the program is the first value of the list and the status of the command is the second value

```
> println(res[0])
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


> println(res[1])
0
```

A function that returns multiple values can also be called like this - here each element of the returned list is assigned a different variable.
This is called 'multiple assignment'. Note that you need to have exactly the same number of variables as there are elements in the returned list

```
> output, status = system('ls /')
["Applications\nLibrary\nSystem\nUsers\nVolumes\nbin\ncores\ndev\netc\nhome\nopt\nprivate\nsbin\ntmp\nusr\nvar\n",0]
>

> println(output)
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


> println(status)
0
```

You also have a second form of writing & running commands - the backtick operator

```
> out,status = `ls /`
["Applications\nLibrary\nSystem\nUsers\nVolumes\nbin\ncores\ndev\netc\nhome\nopt\nprivate\nsbin\ntmp\nusr\nvar\n",0]
> println(out)
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


> print(status)
0
```

You can combine expression values to form just the command that is needed, very similar to strings with the " delimitor.
An expression within { } brackets is evaluated, and the result is inserted into the string that is run in the shell.
An expression with backticks can span several lines.

```
> directory='/'
"/"

> out, status = `ls {directory}`
["Applications\nLibrary\nSystem\nUsers\nVolumes\nbin\ncores\ndev\netc\nhome\nopt\nprivate\nsbin\ntmp\nusr\nvar\n",0]

> println(out)
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


> print(status)
0

```

Both ```system``` and the backtick operator run the process in the default shell ( '/bin/sh' on Unix, process.env.ComSpec on Windows )
Now the built-in variable ```ENV``` is a map, it stands for the environment variables. If you add or remove an entry in ```ENV``` then the changed environment variables will be passed to the processes that are run via ```system``` or the backtick operator.

### <a id='s-1-3-13' />working with structured data (json and yaml)

let's say you have some structured string encoded as text in the [json](https://en.wikipedia.org/wiki/JSON) format.
You can make a variable out of it - with the ```parseJsonString``` function

```

> text='{"persons":[{"id":"323412343123","name":"Michael","surname":"Moser","age":52,"stuff":[3,2,1]}]}'
"{\"persons\":[{\"id\":\"323412343123\",\"name\":\"Michael\",\"surname\":\"Moser\",\"age\":52,\"stuff\":[3,2,1]}]}"

> data=parseJsonString(text)
{"persons":[{"id":"323412343123","name":"Michael","surname":"Moser","age":52,"stuff":[3,2,1]}]}

```

Now it is much easier to manipulate the data

```
> data.persons[0].id=123
123

> data.persons[0].age=18
18

> unshift(data.persons[0].stuff,4)
[4,3,2,1]
```

This is the same as writing (see more in "object based programming")

```
> data['persons'][0]['id']=123
123

> data['persons'][0]['age']=18
18

> unshift(data['persons'][0]['stuff'],4)
[4,3,2,1]
```

Now you use the can convert the data back into a [json](https://en.wikipedia.org/wiki/JSON) formatted string 

```
> text=toJsonString(data)
"{\"persons\":[{\"id\":123,\"name\":\"Michael\",\"surname\":\"Moser\",\"age\":18,\"stuff\":[4,3,2,1]}]}"

```

You can do the same with [YAML](https://en.wikipedia.org/wiki/YAML) - this is another way of encoding structured data as text (the text as YAML is supposed to be more readable, compared to JSON)

```
> text=toYamlString(data)
"persons:\n  - id: 123\n    name: Michael\n    surname: Moser\n    age: 18\n    stuff:\n      - 4\n      - 3\n      - 2\n      - 1\n"

> println(text)
persons:
  - id: 123
    name: Michael
    surname: Moser
    age: 18
    stuff:
      - 4
      - 3
      - 2
      - 1
```

the ```parseYamlString``` function converts the YAML text back into a value of nested maps and arrays 

```
> data = parseYamlString(text)
{"persons":[{"id":123,"name":"Michael","surname":"Moser","age":18,"stuff":[4,3,2,1]}]}

> data
{"persons":[{"id":123,"name":"Michael","surname":"Moser","age":18,"stuff":[4,3,2,1]}]}

```

## <a id='s-1-4' />Even more language features

### <a id='s-1-4-14' />Error handling with exceptions

Runtime errors can happen in a program, like dividing by zero

```
 ./pyx
> value = 42
42
> value / 0
Error: Can't divide by zero
#(1) value / 0
   |.......^
```

Or tring to read a file that does not exist

```
> textInFile = readFile("noSuchFileExists.txt")
Error: Can't read file: noSuchFileExists.txt error: Error: ENOENT: no such file or directory, open 'noSuchFileExists.txt'
#(1) textInFile = readFile("noSuchFileExists.txt")
   |..............^
```


Still you would like to have the program deal with such errors, somehow. The way to do this is by adding a ```try / catch``` block.

```
> try {
... a=readFile("noSuchFile.txt")
... println(a)
... } catch ex {
... println( toJsonString(ex) )
... }

try {
 a=readFile("noSuchFile.txt")
 println(a)
} catch ex {
 println( ex.stack )
 println( "Fields of the exception map: " + toJsonString(ex) )
}

{"message":"Can't read file: noSuchFile.txt error: Error: ENOENT: no such file or directory, open 'noSuchFile.txt'","stack":"Error: Can't read file: noSuchFile.txt error: Error: ENOENT: no such file or directory, open 'noSuchFile.txt'\n#(2) a=readFile(\"noSuchFile.txt\")\n   |...^\n","offset":8,"fileName":[null,"try {\na=readFile(\"noSuchFile.txt\")\nprintln(a)\n} catch
```

The instructions in the statement between the ```try``` and ```catch``` keywords can throw errors. Now only when an error occurs we get into the statement in the block after the ```catch``` statement.

This block now has a special variable ```ex``` - the exception map. This value holds some more information about the error that just occured.

```
> try {
...  a=readFile("noSuchFile.txt")
...  println(a)
... } catch ex {
...  println( ex.stack )
...  println( "Fields of the exception map: " + toJsonString(ex) )
... }
Error: Can't read file: noSuchFile.txt error: Error: ENOENT: no such file or directory, open 'noSuchFile.txt'
#(2)  a=readFile("noSuchFile.txt")
   |....^

Fields of the exception map: {"message":"Can't read file: noSuchFile.txt error: Error: ENOENT: no such file or directory, open 'noSuchFile.txt'","stack":"Error: Can't read file: noSuchFile.txt error: Error: ENOENT: no such file or directory, open 'noSuchFile.txt'\n#(2)  a=readFile(\"noSuchFile.txt\")\n   |....^\n","offset":9,"fileName":[null,"try {\n a=readFile(\"noSuchFile.txt\")\n println(a)\n} catch ex {\n println( ex.stack )\n println( \"Fields of the exception map: \" + toJsonString(ex) )\n}\n"]}

```

The fields of this variable

- ex['message']   This field holds a message that describes the reason for the error
- ex['stack']     This field is a string, it holds a message that describes the location in the program, where the error occured. If you got to that point by calling a sequence of functions, then it describes each of functions that have been called.
- ex['offset']    The offset in the source file/text expression, where the error occured.
- ex['fileName']  An array with two elements. First comes the file name where the error occured, then the text of that file.

There is a third possible clause in a try/catch block - the ```finally``` statement - this block of statements is run in both the event of an error or if no error occured within the try block!


### <a id='s-1-4-15' />Generators and the yield statement

The ```for``` statement is a bit special.

You can loop over the elements of an existing list

```
> for a [1,2,3]
... println(a)
1
2
3
```

You can loop over all entries of a map

```
> for key,value {'Pooh': 'Bear', 'Piglet': 'Piggy', 'Rooh': 'Kangaroo'}
... println("key: {key} value: {value}")
key: Pooh value: Bear
key: Piglet value: Piggy
key: Rooh value: Kangaroo
```

However in many cases you don't want to create a whole list or map of entries, just in order to pass over all the elements in that structure.
You always want to create the next element, just when you want to visit it with the ```for``` loop.

Now that's when you need a generator.

Let's look at the followin special function: ```myrange``` in the next example:


```
> def mygen(from,to) {
...     while from < to {
...         yield from
...         from = from + 1
...     }
... }
"<function>"
>

> for a myrange(1,10)
... println("the number is {a}")
Error: undefined variable: myrange

> for n mygen(1,10)
... println("The number is {n}")
The number is 1
The number is 2
The number is 3
The number is 4
The number is 5
The number is 6
The number is 7
The number is 8
The number is 9

```

The function ```mygen``` is called, it produces the numbers between the argument values ```from``` to ```to``` (not including the value of ```to```).

Now ```mygen``` is passing a number the ```for``` loop via the ```yield n``` statement. At this moment the ```mygen``` function stops and the statments of the ```for``` loop work with the number they got from the ```yield``` statement. Once the loop has finished, we return from the ```yield``` statement right into the ```mygen``` function and here we are ready to produce hte next value that will be used by the next iteration/pass of the loop.

The ```mygen``` function is called a generator function, because it has a ```yield``` statement. Note that ```mygen``` can't call another function that does the ```yield``` statement, this statement has to be in the generator function itself, in the top level of the generator function.

## <a id='s-1-5' />Input and output

### <a id='s-1-5-16' />reading/writing files

tbd 

Meanwhile look at [pyxfunc](https://github.com/MoserMichael/jscriptparse/blob/main/PYXFUNC.md) - in the "Input and Output" section.

### <a id='s-1-5-17' />HTTP clients

tbd

Meanwhile look at [pyxfunc](https://github.com/MoserMichael/jscriptparse/blob/main/PYXFUNC.md) - in the "Input and Output" section.


### <a id='s-1-5-18' />HTTP servers

tbd

Meanwhile look at [pyxfunc](https://github.com/MoserMichael/jscriptparse/blob/main/PYXFUNC.md) - in the "Input and Output" section.


## <a id='s-1-6' />Conclusion

Now you can do all kinds of stuff, by putting togather all of this.

We have reached the end of our story, now I am wishing you lots of fun with the PYX programming language, may it be of use to you!


