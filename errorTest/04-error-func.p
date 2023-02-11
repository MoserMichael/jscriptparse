def check(input, expected)
    if isMatchingParenthesis(input) != expected {
        println("Error: input: {input} expected: {expected}")[
        exit(1)
    }


