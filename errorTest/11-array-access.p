
a=[1,2,3]

println("accessing a list", a)

try {
    println(a['aa'])
} catch e {
    println(e.stack)
}


try {
    println(a[4]) 
} catch e {
    println(e.stack)
}

try {
    println(a[-1])
} catch e {
    println(e.stack)
}

try {
    a[4] = 1
} catch e {
    println(e.stack)
}

try {
    a['b'] = 1
} catch e {
    println(e.stack)
}

a='abc'

println("accessing a string ", a)

try {
    println(a['aa'])
} catch e {
    println(e.stack)
}


try {
    println(a[4]) 
} catch e {
    println(e.stack)
}

try {
    println(a[-1])
} catch e {
    println(e.stack)
}

try {
    a[4] = 'z'
} catch e {
    println(e.stack)
}

try {
    a['b'] = 1
} catch e {
    println(e.stack)
}

try {
    a[0]=[1,2,3]
} catch e {
    println(e.stack)
}




