    # checks formatting of error messages

    def rec(num) {
        if num == 0 {
          throw "throwing an error string"
        }
        return rec(num - 1)
    }        
    
    rec(5)
