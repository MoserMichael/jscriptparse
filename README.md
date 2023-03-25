## pyx scripting language

[<img alt="PUX - link to youtube video" src="notes/pux.jpg" />](https://www.youtube.com/watch?v=l3yhBEQlH_Y) 

This is the pyx educational programming language / scripting langauge and REPL shell.  With pyx you can write code in functional and procedural style.

This programming language is named after Winnie-the-Pooh, in the Russian translation of [Boris Zahoder](https://en.wikipedia.org/wiki/Boris_Zakhoder)

/You might consider to sponsor this project via [github sponsors](https://github.com/sponsors/MoserMichael)/

The scripting language and interpreter for the pyx language.  

- See [pyx tutorial (pyxtut)](PYXTUT.md)
- See [pyx functions by category (pyxfunc)](PYXFUNC.md)
- see the [design document (pyxdesign)](PYXDESIGN.md)
- Example tests scripts are [here](https://github.com/MoserMichael/jscriptparse/tree/main/tests) and [here](https://github.com/MoserMichael/jscriptparse/tree/main/leetcode) - see files with extension .p (.out - expected output of the script)

## Examples

Here is an example script that gets the exchange rates for today - for a few select currencies: 

```
urlExchangeRate='https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/eur.json'

httpSend(urlExchangeRate, none, def(statusCode, headers, responseData, err) {
    if (statusCode == 200) {
        data = parseJsonString(responseData)
        println("Current date: {data['date']}
  Euro to USD {data['eur']['usd']}
  Euro to GBP {data['eur']['gbp']}
  Euro to NIS {data['eur']['ils']}
")
    } else
        println("Error: got http status: {statusCode} error: {err}")
})
```

That got me 

```
Current date: 2023-03-24
  Euro to USD 1.082544
  Euro to GBP 0.882025
  Euro to NIS 3.842182
```

Here is an example that computes the minimum, maximum, mean and standard deviation of the exchange rates for all currencies:

```
urlExchangeRate='https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/eur.json'

httpSend(urlExchangeRate, none, def(statusCode, headers, responseData, err) {
    if (statusCode == 200) {
        data = parseJsonString(responseData)


        maxRate = reduce( map(data['eur'],def(key,value) value), max, -mathconst.Infinity)
        minRate = reduce( map(data['eur'],def(key,value) value), min, mathconst.Infinity)


        sum = 0
        map(data['eur'],def(key,value) { sum = sum + value })
        mean = sum / len(data['eur'])


        sum = 0
        map(data['eur'],def(key,value) { sum = sum + pow( abs(value - mean), 2) })

        stddev = sqrt( sum / len(data['eur']) )

        println("Statistics on the euro exchange rates for: {data['date']}

  maximum exchange rate: {maxRate}
  minimum exchange rate: {minRate}
  mean exchange rate:    {mean}
  standard deviation:    {stddev}
")

    } else
        println("Error: got http status: {statusCode} error: {err}")
})
```

That got me

```
Statistics on the euro exchange rates for: 2023-03-25

  maximum exchange rate: 2603666.310995
  minimum exchange rate: 0.000039
  mean exchange rate:    11115.981531639705
  standard deviation:    157676.53204828722
```

Here is an example that does binary search in an array

```
tosearch=[2, 4, 5, 7, 9, 10, 12, 14, 15, 17]

def binarySearch(tosearch, findme) {
  low=0
  high=len(tosearch)-1

  while low <= high {
    middle = int( (high + low)/2 )

    if tosearch[ middle ] == findme
        return true
    elif tosearch[ middle ] > findme
        high = middle-1
    else
        low = middle+1

  }
  return false
}

def linearSearch(tosearch, num) {
    for n tosearch {
        if n == num
            return true
    }
    return false
}

for num range(2,18) {
    res = binarySearch(tosearch, num)
    res2 = linearSearch(tosearch, num)
    assert(res == res2, "same result for binary and linear search binarySearch: {res} linearSearch: {res2}")
}

```

## Running it

First we need the to install node.js - you can download an installer [here](https://nodejs.org/en/download/)

Now, from the command line: Install the pyx shell with the following command 

```npm install pyxlang -g```

Now run the shell 

```pyx```

( If you want to uninstall it again, later on, the run ```npm uninstall pyxlang -g``` )

The shell has command completion (tab tab) and a command history (cursor up, cursor down) 

You can also run one-line commands as follows

```
pyx -e 'println("hello world")'
```

or run any saved source file with

```
pyx source.p
```

You can also run the program in trace mode, by adding the ```-x``` option to the command line. Here each statement is shown, as it is executed.

```
./pyx -x tests/03-func-if.p
foo(val=6)
+ if true
+ println("should be happy years") {
should be happy years
+ }
+ }
foo(val=20)
+ if false # <pass>
+ elif true
+ println("youth age") {
youth age
+ }
+ }
foo(val=42)
+ if false # <pass>
+ elif false # <pass>
+ else
+ println("after youth age") {
after youth age
+ }
+ }
+ }
```

## Source code 

- the interpreter/repl script is [here](https://github.com/MoserMichael/jscriptparse/blob/main/pyx) - you need to have node installed for this.
- The parser/syntax tree is built [here](https://github.com/MoserMichael/jscriptparse/blob/main/scripty.js) the runtime for the interpeter is [here](https://github.com/MoserMichael/jscriptparse/blob/main/rt.js) and [here](https://github.com/MoserMichael/jscriptparse/blob/main/rtbase.js) 


## what I learned while writing this project

Writing a programming languages is a whole lot of work. Doing a small programming language makes me appreciate the authors of the tools that i am using everyday. Someone who is implementing a language has to take care of all the detail, a programmer who is using that language is spared this effort, that's something to appreciate!

For example there is great deal of effort that goes into having half way readable error messages during parsing...

There is an awfull amount of detail hidden within a programming languages. Now this reminds me of the movies of [Stanley Kubrick](https://en.wikipedia.org/wiki/Stanley_Kubrick). Kubrick was obsessed with putting meaning into detail, i guess he would have liked the exercise of writing a programming language... (more info in [this documentary](https://www.youtube.com/watch?v=h8t5JFeoesk) )

Another thing: i am learning about interpreted languages (such as python, php, javascript, perl, etc...) 
Now I keep noticing quite a lot of details, while writing my little interpreter. I am keeping some notes [here](https://github.com/MoserMichael/jscriptparse/blob/main/notes/notes.txt)

The moral: you can learn a lot with this type of project! (i think the important part is to keep notes, otherwise you tend to forget the details...)

... also it's a fascinating kind of project, when you start to use your own stuff for other purposes. As as if you are forming your own reality, somehow!

It's kind of a philosophical problem, wheather language has an inluence on thought (even less so with programming langauges, as these aren't quite for real). Still, having your program that interprets commands to do general computations is a big wow moment...
