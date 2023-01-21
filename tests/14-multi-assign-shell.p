    # multiple assignment: the system built-in function returns an array with two entries. these are assigned to left hand side variables

    out, status = system("echo 'hello world'")
    print("status: {status} output: {out}")
    
    a = "!hello"
    b = "world!"

    # the backtick operator works the same as the system function

    out, status = `echo "{a} {b}"`
    print("status: {status} output: {out}")

