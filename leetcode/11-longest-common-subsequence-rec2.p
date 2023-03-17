
def lcs(stringA, stringB) {

    fetchSolution = def(inputString, indexPath, idx ) {
    
        rval = ""

        for elm each(indexPath) {
            pos = elm[idx]
            if  pos != -1
                rval = inputString[pos] + rval
        }

        return rval
    }

    doIt = def(stringA, posA, stringB, posB, memoIt) {

        if posA == -1 or posB == -1 
            return [0, [[-1, -1]] ]

        lookUp = memoIt[posA][posB]
        if lookUp[0] != -1
            return lookUp

        if stringA[posA] == stringB[posB] {

            nextSolution = doIt(stringA, posA-1, stringB, posB-1, memoIt) 
            path = joinl([[posA,posB]], nextSolution[1])

            res = [1 + nextSolution[0], path ]  
        } else {

            nextA = doIt(stringA, posA-1, stringB, posB, memoIt) 
            nextB = doIt(stringA, posA, stringB, posB-1, memoIt) 

            if nextA[0] > nextB[0]
                res = nextA
            else 
                res = nextB
        }   

        memoIt[posA][posB] = res

        return res
    }
    
    memo = dimInit( [-1, []] , len(stringA), len(stringB) )
    res =  doIt(stringA, len(stringA)-1, stringB, len(stringB)-1, memo)

    solutionA = fetchSolution(stringA, res[1], 0)
    solutionB = fetchSolution(stringB, res[1], 1)

    return [ res[0], solutionA, solutionB ]
}

testCases = [
                [ "azzbzcd", "zzabzcdzz", [6, "zzbzcd"] ],
                [ "bacadaaf", "abacadaf", [7, "bacadaf"] ]
            ]

for t each(testCases) {
   res = lcs(t[0], t[1])

   println(res,t)
   assert(res[1]==res[2])

   assert(res[0] == t[2][0], "test case {t} failed")
   assert(res[1] == t[2][1], "wrong common substring in test case {t}")
}


