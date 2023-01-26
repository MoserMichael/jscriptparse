
# test generator functions

def mygen(from,to) {
    while from < to {
        yield from
        from = from + 1
    }
}

for n mygen(1,10) {
    println("mygen - num: {n}")
}


def mygen2(from,to) {
    for n mygen(from, to) {
        yield n
    }
}

for n mygen2(1,10) {
    println("mygen2 - num: {n}")
}


# test generator from try-catch block

def mygen3(from,to) {
    try 
        for n mygen(from, to) {
            yield n
        }
    catch e 
        console.log("exception {e}")

}

for n mygen3(1,10) {
    println("mygen3 - num: {n}")
}




