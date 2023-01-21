
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

