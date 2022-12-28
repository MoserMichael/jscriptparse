    out, status = system("echo 'hello world'")
    print("status: {status} output: {out}")
    
    a = "!hello"
    b = "world!"
    out, status = `echo "{a} {b}"`
    print("status: {status} output: {out}")

