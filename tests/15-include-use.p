    # include the source of another file with the use directive
    use "tests/testuse.p"
    
    c = newComplex(2,3)
    d = newComplex(4,5)
    e = cmul(c, d)


    println("complex product: {cshow(e)}")
