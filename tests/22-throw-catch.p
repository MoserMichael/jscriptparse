# checks formatting of error messages

def rec(num) {
    if num == 0 {
      throw "throwing an error string"
    }
    return rec(num - 1)
}        

try 
    rec(5)
catch ex {
  println("handling exception")
  throw "throw from catch"
}
