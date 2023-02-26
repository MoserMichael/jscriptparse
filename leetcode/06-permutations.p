
def permuteImp(inArray, inPos, outArray) {
    if inPos == len(inArray) {
        println("\tpermutation: {outArray}")
        return 1
    }

    res = 0

    for i range(0, len(inArray) ) {
        if outArray[i] == none {
            outArray[i] = inArray[inPos]
            res = res + permuteImp(inArray, inPos + 1, outArray) 
            outArray[i] = none
        }
    }
    return res
}


def permute(inArray) {
    outArray = dimInit( none, len(inArray) )
    return permuteImp( inArray, 0, outArray )
}


def testIt() {
    test = [
        #  array-to-permute         number of permuations
        [  [1,2,3,4],               4 * 3 * 2 ],
        [  [1,2,3,4,5],             5 * 4 * 3 * 2 ], 
        [  [1,2,3,4,5,6],           6 * 5 * 4 * 3 * 2 ]
    ]

    for i range(0, len(test) ) {
        testCase = test[i][0]
        println("testing: {testCase}")
        numPermutations = test[i][1]

        actualNumPermutations = permute(testCase)
        println("actualPermutations: ",  actualNumPermutations, " expected number: ", numPermutations)
        assert( actualNumPermutations == numPermutations, "unexpected number of permuations. actual: {actualNumPermutations} expected {numPermutations}" )
    }
}

testIt()




