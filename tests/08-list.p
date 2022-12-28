    a=[1, 2, 3]
    tmp = a[0]
    a[0]=a[1]
    a[1]=a[2]
    a[2]=tmp
    println("first: {a[0]} second: {a[1]} third: {a[2]}")

