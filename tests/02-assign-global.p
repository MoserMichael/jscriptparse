

globVar = 1


def globNoChange(x) {
    globVar = x * x
    return globVar
}


def globVarChange(x) {
    globVar := x * x
    return globVar
}


println("globVar: {globVar}")
println("square:  {globNoChange(3)}")
println("globVar: {globVar} - not changed")
println("square:  {globVarChange(3)}")
println("globVar: {globVar} - did changed")





