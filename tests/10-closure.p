    # closures: makeAdder returns a function that accesses a captured variable
    def makeAdder(num) {
        return def(arg) {
            return num + arg
       }
    }
    ad = makeAdder(10)
    println( ad(42) )

