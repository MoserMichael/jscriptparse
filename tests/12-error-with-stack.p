    # checks formatting of error messages

    def rec(num) {
        if num == 0 {
            return 1 / 0
        }
        return rec(num - 1)
    }        
    
    rec(5)
