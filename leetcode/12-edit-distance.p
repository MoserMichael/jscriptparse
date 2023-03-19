
# https://en.wikipedia.org/wiki/Levenshtein_distance

def edit_distance_imp(string_a, pos_a, string_b, pos_b, memo) {

    key = str(pos_a) + "-" + str(pos_b)
    if exists(key, memo)
        return memo[key]

    if pos_a==0 or pos_b == 0
        return max(pos_a,pos_b)

    ed_a = 1 + edit_distance_imp(string_a, pos_a-1, string_b, pos_b, memo)
    ed_b = 1 + edit_distance_imp(string_a, pos_a, string_b, pos_b-1, memo) 

    if string_a[pos_a] == string_b[pos_b]
        ed_c = edit_distance_imp(string_a, pos_a-1, string_b, pos_b-1, memo) 
    else 
        ed_c = 1 + edit_distance_imp(string_a, pos_a-1, string_b, pos_b-1, memo) 

    res = min(ed_a, ed_b, ed_c)

    memo[key] = res

    return res
}

def edit_distance(string_a, string_b ) {
    memo = {}

    return edit_distance_imp(string_a, len(string_a)-1, string_b, len(string_b)-1, memo)
}


tests = [
    [ "dog", "doggy", 2 ],
    [ "akidtty", "kidttyaaa", 4 ],
    [ "abear", "bears", 2 ]
]
 
for t tests {
    dst = edit_distance(t[0],t[1])
    println("distance {t[0]} to {t[1]} is {dst}")
    assert(dst == t[2], "expected edit distance")
}    


