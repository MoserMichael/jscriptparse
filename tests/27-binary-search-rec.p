tosearch=[2, 4, 5, 7, 9, 10, 12, 14, 15, 17]


println("searching:", tosearch)

def search_rec(tosearch, low, high, findme) {
  if low > high
     return false

  middle = int( (high + low)/2 )
  if tosearch[ middle ] == findme 
    return true

  if tosearch[ middle ] > findme 
    return search_rec(tosearch, low, middle-1, findme)

  return search_rec(tosearch, middle+1,high, findme)
  #return search_rec(middle+1,high)
}

def search(tosearch, findme) {
  return search_rec(tosearch, 0, len(tosearch)-1, findme)
}

println("10 ", search(tosearch,10))
println("11 ", search(tosearch,11))
println("12 ", search(tosearch,12))
println("13 ", search(tosearch,13))
println("14 ", search(tosearch,14))

