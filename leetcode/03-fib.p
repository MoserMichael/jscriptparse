
def fib_(n, cache) {
    if n <= 1
        return n

    if exists(n, cache)
        return cache[n]
    
    ret = fib_(n-1, cache) + fib_(n-2, cache)
    cache[n] = ret
    return ret
}

def fib(n) {
    cache = {}
    return fib_(n, cache)
}

test_cases=[2,5,10,20,30,40]    

for n test_cases {
    println("test case: fib: {fib(n)}")
}

