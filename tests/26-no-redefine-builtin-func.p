a="42"
println("value of variable a: {a}")

def a() { return 43 }
println("value of function call: {a()}")

# this is an error - can't redefine built-in functions
def len() { return 42 }
