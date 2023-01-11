
def newComplex(x,y) {
    return [x, y]
}

def cadd(a, b) {
    return [ a[0] + b[0], a[1] + b[1] ]
}

def cmul(a, b) {
    return [ a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1] ]
}    

def cshow(a) {
    return "{a[0]}+i{a[1]}"
}

