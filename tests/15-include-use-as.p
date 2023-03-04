    # include the source of another file with the use directive
    use "tests/testuse.p" as complex
    
    c = complex.newComplex(2,3)
    d = complex.newComplex(4,5)
    e = complex.cmul(c, d)


    println("complex product: {complex.cshow(e)}")
