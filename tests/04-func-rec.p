def fact(n) {
   if n<=1 {
      return 1
   }
   return n * fact(n-1)
}
println(fact(1))
println(fact(2))
println(fact(7))
