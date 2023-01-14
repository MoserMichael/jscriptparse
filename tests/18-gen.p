

def mygen(from,to) {
    while from < to {
        println("yielding: from: {from} to: {to}")
        yield from
        from = from + 1
    }
}

for n mygen(1,10) {
    println("num: {n}")
}
