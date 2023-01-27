# PYXTUT - tutorial for the PYX scripting language

## Installation

First we need the to install node.js - you can download an installer [here](https://nodejs.org/en/download/)

Now, from the command line: Install the pyx shell with the following command 

```
npm install pyxlang -g
```

(You can always uninstall it later with the command ```npm uninstall pyxlang -g```)

## First steps

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

Now you also have mathematical constants = like pi and the euler constant

```
> mathconst['pi']
3.141592653589793

> mathconst['e']
2.718281828459045
```

You can ask about stuff, typing  ```help(mathconst)``` will explain all about ```mathconst```

```
> help(mathconst)

How to use in shell:

map of mathematical constant

the number PI

> mathconst['pi']
3.141592653589793

the Euler constant

> mathconst['e']
2.718281828459045

The square root of two

> mathconst["sqrt2"]
1.4142135623730951

Other values:
mathconst["sqrt1_2"] - square root of one half.
mathconst["log2e"] - base e logarithm of 2
mathconst["log10e"] - base e logarithm of 10
mathconst["log2e"] - base 2 logarithm of e
mathconst["log10e"] - base 10 logarithm of e
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
> two*three
6
```


You can make your own function that computes the sum of the square and the cube of a number

```
> def s(x) x * x + x * x * x
```

and then call use that function to compute the sum of the square and the cube of any number!

```
> s(2)
12
> s(3)
36
```

The same function can be written as follows: now it uses the built-in function ```pow``` - this one computes the power of a number

```
> def s(x) pow(x,2) + pow(x,3)

> s(2)
12
> s(3)
36
```

You can get some explanation on the built-in function pow, or look at the [PYX function reference - pyxfunc](PYXFUNC.md)

```
> help(pow)

How to use in shell:

> pow(2,2)
4
> pow(2,3)
8
> pow(2,4)
16
```

Autocompletion: a big trick - you can write the beginning of a function or variale name and then press tab tab - it will show you the name of all functions that start with wht you just typed. ```s tab tab``` will show you the list of functions that start with the letter s.

```
> s
s(       sin(     sort(    split(   sqrt(    str(     system(
```

if you type ```si tab tab``` then there is only one function sin(  - so it will just put sin( at the place where you are typing. Believe me, that's a big time saver!

# functions working on lists of values

You can have a list of the numbers between one and five

```
> a=[1,2,3,4,5]
[1,2,3,4,5]
```

or get such a list with the ```range``` function

```
> a=range(1,10)
[1,2,3,4,5,6,7,8,9]
```

or get a list of the odd numbers between one and twenty (odd numbers do not divide by two)

```
> a=range(1,20,2)
[1,3,5,7,9,11,13,15,17,19]
```

Now compute a list of the squares of all numbers between one and 10.

The first step is to define a function ```s``` that computes the square of the number given as argument. note that the last mathematical expression is also computing the value returnd by the function)

```
> def sq(x) x * x

> sq(2)
4
> sq(3)
9
> sq(4)
16
```

You see that ```x``` stands for the parameter of the function - that's the value which is passed to the function when it is called.

The built-in ```map``` function will call the ```sq``` function on all element of the list of numbers from one to 9 - and return a new list with the result. In the returned list each number of the original list is turned into its square!

```
> map( range(1,10), sq)
[1,4,9,16,25,36,49,64,81]
```

Now lets the compute the sum of all the squares between one and ten

First put that list of squares in a variable - squares

```
> squares=map( range(1,10), sq)
[1,4,9,16,25,36,49,64,81]
```

now let's get the sum of the squares between one and ten with the built-in ```reduce``` function.

```
> def sum(x,y) x+y

> reduce(squares, sum, 0)
285
```

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

### Statements

You can do the same thing differently

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

First the number 0 is put into variable i
now we have a while statement: this one continues to do the stuff within the brackets, while the variable i is smaller than 100
Now the stuff in the brackets does two things - it prints out the value of i with ```println(i)``` and then sets i to the value of i plus one.
Now if you want to group togather more then one statement then you need to put these within the brackets { and }

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

## Maps

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

## Working with text 

You can define variables that refer to text. lets define variable `a` that refers to the text  `hello world` and then print that text to the screen with the function println

```
> a='hello world'
"hello world"
> println(a)
hello world
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

You can have sections within the characters ```{```` and ```}``` - these refer to variables in the program. 
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

## Running processes


## Conclusion

Or you can do all kinds of stuff, by putting togather all of this.










```





