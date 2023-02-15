tosearch=[2, 4, 5, 7, 9, 10, 12, 14, 15, 17]


println("searching:", tosearch)

def search(tosearch, findme) {
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

println("10 ", search(tosearch,10))
println("11 ", search(tosearch,11))
println("12 ", search(tosearch,12))
println("13 ", search(tosearch,13))
println("14 ", search(tosearch,14))

