    a = [1, 2, 3, 4]
    b = map(a, def(x) { return x * x })
    
    println("b: {b[0]} {b[1]} {b[2]} {b[3]}")
    
    c = reduce(b, def(x, y) { return x + y }, 0)
    println("sum of squares: {c}")
