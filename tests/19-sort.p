# test sort with a callback

def cmp(x, y) {
    if x[1] < y[1] return -1
    if x[1] > y[1] return 1
    return 0
}
r=sort([['a',100],['b',1],['c',1000]],cmp) 
println(toJsonString(r))

# test sort without a callback

r=sort(range(10,1,-1))
println(toJsonString(r))

