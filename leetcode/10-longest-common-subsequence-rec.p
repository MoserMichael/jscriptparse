
def lcs(stringA, stringB) {

    doIt = def(stringA, posA, stringB, posB, memoIt) {

        if posA == -1 or posB == -1 
            return 0

        lookUp = memoIt[posA][posB]    
        if lookUp != -1
            return lookUp

        if stringA[posA] == stringB[posB]
            res = 1 + doIt(stringA, posA-1, stringB, posB-1, memoIt)  
        else 
            res = max( doIt(stringA, posA-1, stringB, posB, memoIt), doIt(stringA, posA, stringB, posB-1, memoIt) )

        memoIt[posA][posB] = res

        return res
    }
    
    memo = dimInit( -1, len(stringA), len(stringB) )
    return doIt(stringA, len(stringA)-1, stringB, len(stringB)-1, memo)
}

testCases = [
        [ "azzbzcd", "zzabzcdzz", 6 ],
        [ "bacadaaf", "abacadaf", 7 ]
        ]


for t each(testCases) {
   res = lcs(t[0], t[1])
   println("{t[0]} vs {t[1]} - actual {res} expected {t[2]}")
   assert(res == t[2], "test case {t} failed")
}
