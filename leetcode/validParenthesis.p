# https://leetcode.com/problems/valid-parentheses/

def isMatchingParenthesis(input) {
    matchParenthesis = {
        ')': '(',
        '}': '{',
        ']': '['
    }

    validSyms = {
        '{': 1,
        '}': 1,
        '(': 1,
        ')': 1,
        '[': 1,
        ']': 1
    }
    stack = []


    for ch split(input,"") {
        if exists(ch,validSyms) {
            if exists(ch,matchParenthesis) {
                if pop(stack) != matchParenthesis[ch]
                    return false
            } else  {
                push(stack, ch)
            }
        } else {
            println("Error: Invalid symbol {ch}")
            return false
        }
    }
    return len(stack) == 0
}

def check(input, expected)
    if isMatchingParenthesis(input) != expected {
        println("Error: input: {input} expected: {expected}")
        exit(1)
    }

check('()', true)
check('()[]{}', true)
check('(]', false)
check('{[(]',false)
check('{[()]', false)
check('{[()]}', true)

println("all tests passed")
 

