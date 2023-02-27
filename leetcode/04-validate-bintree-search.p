



def makeTree(nodeValue, left = none, right = none) {

     tree = {
        'node': nodeValue,
        'left': left,
        'right': right,

        'nodeValue' : def() { return  tree.node },
         
        'showTree': def() {
            print("( {tree.node} ")

            if tree.left != none or tree.right != none {

                if tree.left != none 
                    tree.left.showTree()
                else 
                    print(". ")

                if tree.right != none
                    tree.right.showTree()
                else 
                    print(". ")
            }

            print(") ")
         },        

         'find': def(value) {
            if value < tree.node {
                if tree.left != none {
                    return tree.left.find(value)
                }     
                return none
            } elif value > tree.node {
                if tree.right != none {
                   return tree.right.find(value)
                }
                return none
            }
            return value
        },



        'validateTree': def(from=none, to=none) {
            if from != none and tree.node <= from {
                throw "Node {tree.node} must be larger than {from}"
            }
            if to != none and tree.node >= to {
                throw "Node {tree.node} most be smaller than {to}"
            }
            if tree.left != none {
                println("go left")
                #tree.left.validateTree(from, tree.node)
            }
            if tree.right != none {
                println("go right")
                #tree.right.validateTree(tree.node, to)
            }

        }

     }   
     return tree
}


tree = makeTree(50, 
            makeTree(20), 
            makeTree(70, 
                makeTree(52), 
                makeTree(80,
                    makeTree(79),
                    makeTree(101)
                )
           )
      )     


tree.showTree()
println("")

values = [
            [10, false],
            [20, true],
            [30, false],
            [70, true],
            [80, true],
            [100, false]
        ]    


for val values {
    
    res = tree.find(val[0])
    actual_res = false
    if res != none
        actual_res = true

    println("value:  {val[0]} result: {res}")
    assert( val[1] == actual_res, "expected value {val[0]} actual value: {actual_res}" )
}

