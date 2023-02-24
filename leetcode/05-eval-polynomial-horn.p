
def evalPoly(args, x) {
   res = args[0]
   i = 1

   while i < len(args) {
     res = x * res + args[i]
     i = i + 1
   }

   return res
}

def evalSlow(args, x) {

    println(args)
    res = 0
    for i range(0, len(args)) {
        res = res + args[len(args) - 1 - i] * pow(x,i)
    }
    return res
}


tests = [
    [3],          #   3
    [3,2],        #   3x+2
    [5,1,4],      #   5x^2 + x + 4
    [9,0,3,2,5]   #   9x^4 + 3 x^2 + 2x +5
]

def testIt() {
    for i range(0,len(tests)) {

        fast =  evalPoly(tests[i], 4) 
        slow = evalSlow(tests[i], 4) 

        println("fast: {fast} slow {slow}")
        assert( fast == slow,  "equal value of polynomial evaluation" )
    }
}

testIt()




