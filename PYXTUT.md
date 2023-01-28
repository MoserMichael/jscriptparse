
<span hidden>toc-start</span>

 * [PYXTUT - tutorial for the PYX scripting language] (#s-1)
  * [Installation] (#s-1-1)
 * [functions working on lists of values] (#s-2)
  * [Statements] (#s-2-2)
  * [Maps] (#s-2-3)
 * [Working with text] (#s-3)
 * [Running processes] (#s-4)
  * [Conclusion] (#s-4-4)
<span hidden>toc-end</span>

#<a id='s-1' />PYXTUT - tutorial for the PYX scripting language

##<a id='s-1-1' />Installation

First we need the to install node.js - you can download an installer [here](https://nodejs.org/en/download/)

Now, from the command line: Install the pyx shell with the following command

You can always uninstall it later with the command ## First steps

Run the ogram, first thing you see is a command prompt

ou can enter arithmetic expression, and see the result

r more complicated ones: the sum of the square of three with the square of two

r even more complicated ones: First the expression  computed, that's because of the brackets. This can be usefull: sometimes you are not quite sure which expression is computed first - the brackets force some order into all of this.

ou can always return to the previous expression with arrow up and to the next expression with the arrow up and down - and change them all over (that's a big deal!)

(the ogram is also writing the le, each time that you run a statement successfully it is written onto the end of this file)

Now you also have mathematical constants = like pi and the euler constant

ou can ask about stuff, typing  ll explain all about ``
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
(3)cos(3)
-0.9899924966004454
cos(mathconst['pi'])
-1
and               break             continue          def               elif              else              false             for               if                none
not               or                return            true              use               while             yield             ARGV              ENV               abs(
atan(             cos(              each(             exists(           exit(             find(             help(             int(              join(             joinl(
keys(             lc(               len(              localtime(        map(              mapIndex(         mathconst         max(              mid(              min(
parseJsonString(  pop(              pow(              print(            println(          push(             random(           range(            readFile(         reduce(
repeat(           reverse(          sin(              sort(             split(            sqrt(             str(              system(           tan(              time(
toJsonString(     type(             uc(               writeFile(
two=2
2
> three=3
3
` will be used - that's the value that we just assigned to the variable!

You can make your own function that computes the sum of the square and the cube of a number

nd then call use that function to compute the sum of the square and the cube of any number!

he same function can be written as follows: now it uses the built-in function this one computes the power of a number

ou can get some explanation on the built-in function pow, or look at the [PYX function reference - pyxfunc](PYXFUNC.md)

utocompletion: a big trick - you can write the beginning of a function or variale name and then press tab tab - it will show you the name of all functions that start with wht you just typed. ll show you the list of functions that start with the letter s.

f you type en there is only one function sin(  - so it will just put sin( at the place where you are typing. Believe me, that's a big time saver!

#<a id='s-2' />functions working on lists of values

You can have a list of the numbers between one and five

r get such a list with the nction

r get a list of the odd numbers between one and twenty (odd numbers do not divide by two)

ow compute a list of the squares of all numbers between one and 10.

The first step is to define a function at computes the square of the number given as argument. note that the last mathematical expression is also computing the value returnd by the function)

ou see that ands for the parameter of the function - that's the value which is passed to the function when it is called.

The built-in nction will call the nction on all element of the list of numbers from one to 9 - and return a new list with the result. In the returned list each number of the original list is turned into its square!

ow lets the compute the sum of all the squares between one and ten

First put that list of squares in a variable - squares

ow let's get the sum of the squares between one and ten with the built-in nction.

ou can also have functions that return other functions. now that's a bit tricky:

function ts the argument variable n.
all it does is to return an unnamed function as return value is function can always use the outer variable n - as it was passed when s called.

ow calling ll return another function that will always compute the power of three.

n now you can use that to compute the table of squares for any number

nd now lets get the sum of the power of three for the numbers between one and one hundred

##<a id='s-2-2' />Statements

You can do the same thing differently

lets print out all numbers between one and one hundred in a differnt way

irst the number 0 is put into variable i
now we have a while statement: this one continues to do the stuff within the brackets, while the variable i is smaller than 100
Now the stuff in the brackets does two things - it prints out the value of i with d then sets i to the value of i plus one.
Now if you want to group togather more then one statement then you need to put these within the brackets { and }

Now lets get the sum of all squares between one and one hundred

r you can make a function that computes the sum of all the squares of numbers for a given range numbers


t is possible to write the same thing as a op.

A for loop is quite similar, you have a number x that is running for every value provided by the nction.
However you don't have to add one to a variable and check if the loop condition is try, the for loop just runs on all values provided by the range function..
The following statement is run for each of these values.

s a for loop better than a while loop? Depends how you look on it,

- on the one hand a while loop has a lot of flexibility - you are writing the expression that checks if you continue with the loop.
- on the other hand a for loop means less code, less code means fewer opportunities to do something wrong.

It's a kind of trade off - the world of programming has many trade offs...

##<a id='s-2-3' />Maps

There is a type of data called a map. It allows to give names to things.

Like the days of the week - this map has the key, the number of the day of a week, and the name of the day.

We put the map into a variable called dayOfWeek.

nd then show the name of the day of the week - ows the name of the sixth day.

ow you can also map between the name of the day and its number.

f you can use the map to organize your data, like having a list of records for each employees in the muppet show:

#<a id='s-3' />Working with text

You can define variables that refer to text. lets define variable `a` that refers to the text  `hello world` and then print that text to the screen with the function println

orking with text is a bit like working with an array - you can access each letter contained within the text like this: (accessing a letter that is outside of the range gives you an error)

the text is included within the characters You can have multiple lines of text - every string constant can span multiple lines.



The lines are separated by a newline character - you can either enter a new line or write it as the sequence of characters his here is the same text!




Now there is also a second form of writing text constants: with the aracter.
Now this form is very different from the previous form. This one is used for writing reports.

You can have sections within the characters nd these refer to variables in the program.
If this is text is used in a program, then you will see the the following:

ow you can write a program that tells you the whole story:

he same program can be written with fewer commands, in this form:

r you can have a function that receives the number of bottles to write the song - this has a big advantage: you can just call the function and tell it the number of lines you want to print on the screen

ou can also text values with the gn

ut you can't add a text value and a number - that's an error

ou can turn a number into a string with the nction, now this one is valid:

he other way round: you can turn a text string into a floating point number

r you can turn a text string into an integer

text string that starts with 0x counts as a hexadecimal number (with base 16)

r you can explicitly set the radix/base like this:

There are also other built-in [functions with strings](https://github.com/MoserMichael/jscriptparse/blob/HEAD/PYXFUNC.md#functions-for-scalars-or-strings)

A function that returns the number of chracters in a text

ike finding the position of a text within a larger text

he function returns -1 when it can't find the text

You can extract the text between the first and the third character of a text - like this

r get all of the text after the fourth character

ou can repeat a text three times like this

r change all of the occurances of one string with another one

f replace just the first occurance of one string with another one

r replace the first two occurances like this:

#<a id='s-4' />Running processes


##<a id='s-4-4' />Conclusion

Or you can do all kinds of stuff, by putting togather all of this.











