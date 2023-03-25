tosearch=[2, 4, 5, 7, 9, 10, 12, 14, 15, 17]

def binarySearch(tosearch, findme) {
  low=0
  high=len(tosearch)-1

  while low <= high {
    middle = int( (high + low)/2 )

    if tosearch[ middle ] == findme 
        return true
    elif tosearch[ middle ] > findme 
        high = middle-1
    else 
        low = middle+1
    
  }
  return false
}

def linearSearch(tosearch, num) {
    for n tosearch {
        if n == num
            return true
    }
    return false
}

for num range(2,18) {
    res = binarySearch(tosearch, num)
    res2 = linearSearch(tosearch, num)
    assert(res == res2, "same result for binary and linear search binarySearch: {res} linearSearch: {res2}")
}

