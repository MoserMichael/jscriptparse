

def makeComplex(re, im) {
    t = { 
             "re": re, 
             "im": im, 
             "add": def(c) { 
                return makeComplex(t.re + c.re, t.im + c.im)
              },
              "show": def() {
                println("re: {t.re} im: {t.im}")
              }
        }
    return t
}    

a=makeComplex(1,2)
a.show()

b=makeComplex(2,3)
b.show()

c=a.add(b)
c.show()

d=c.add(c)

d.show()


