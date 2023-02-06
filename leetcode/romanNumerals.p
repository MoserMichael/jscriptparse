

# https://leetcode.com/problems/integer-to-roman/
# conversion of number to roman numberals
# (they didn't know about negative numbers...)

def numToRoman(num) {

    convertList =[
        [ 'I',  1 ],
        [ 'IV', 4 ],
        [ 'V',  5 ],
        [ 'IX', 9 ],
        [ 'X',  10 ],
        [ 'XL', 40 ],
        [ 'L',  50 ],
        [ 'XC', 90 ], 
        [ 'C',  100 ],
        [ 'CD', 400 ],
        [ 'D',  500 ],
        [ 'CM', 900 ],
        [ 'M',  1000 ] ]
    ret = ""

    while num > 0
        for i range( len(convertList)-1, -1, -1) {
            entry = convertList[i] 

            if  entry[1] <= num {
                num = num - entry[1]
                ret = ret + entry[0]
            }
        }

    return ret
}

def showRoman(num) 
    println("number: {num} roman number: {numToRoman(num)}")

showRoman(3)
showRoman(58)
showRoman(1994)
