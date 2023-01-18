# PYXTUT - tutorial for the PYX scripting language

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

You have a lot of functions here: youst type tab two times and you get the whole list of reserved words and functions

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

You also have variables: assign a number ot a variable like this and use the value of the number in computations:

```
> two=2
2
> three=3
3
> two*three
6
```


You can make your own function that computes the sum of the suqare and the cube of a number

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

## other types of data

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

or get a list of the even numbers between one and twenty

```
> a=range(1,20,2)
[1,3,5,7,9,11,13,15,17,19]
```

Now compute a list of the squares of all numbers between one and 10.
The built-in ```map``` function will call the ```sq``` function on all element of the list and return a new list with the result!

```
> def sq(x) x * x

> sq(3)
9
> sq(4)
16
>

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

Or you can do all kinds of stuff, by putting togather all of this.










```





