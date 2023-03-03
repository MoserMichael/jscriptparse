

def erastohenes(maxNum) {
    
    arr = dimInit(-1, maxNum)

    for i range(2,maxNum) {
        j = i
        mult = i
        while j < maxNum {
            j = j + mult
            if j >= maxNum 
                break
            arr[j] = 1 
        }
    }

    # second pass: show prime numbers
    for i range(2, maxNum) {
        if arr[i] != 1  
            println(i)
    }
}

erastohenes(1000)

