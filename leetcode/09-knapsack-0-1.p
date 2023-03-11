

items = [ 
            { "size": 3, "cost": 2 },
            { "size": 4, "cost": 3 },
            { "size": 3, "cost": 1 },
            { "size": 2, "cost": 2 }

        ]
            


def solveKnapsack(sizeOfSack, items) {

    board = dimInit( [0, -1] , sizeOfSack )

    for currentSize range(0, sizeOfSack) 
        for itemIndex range(0, len(items) ) {

            previousBoardIdx = currentSize - items[itemIndex].size 
            if previousBoardIdx >= 0 {

                previousBoardCost = board[previousBoardIdx][0]
                
                costWithThisItemInstead = previousBoardCost + items[itemIndex].cost  

                if costWithThisItemInstead > board[currentSize][0] {
                    board[ currentSize ][0] = costWithThisItemInstead
                    board[ currentSize ][1] = itemIndex
                }
            }
        }

    worthOfSack = board[sizeOfSack-1][0] 
    println("Worth of sack with optimal choice {worthOfSack}")
    
    println("The choices:") 
    itemIndex = sizeOfSack - 1

    sumOfWorth = 0
    itemsChosenList=[]
    while itemIndex >= 0 {

        itemChosen=board[itemIndex][1] 
        if itemChosen == -1
            break

        push(itemsChosenList, itemChosen)   

        itemSize = items[itemChosen].size
        itemCost = items[itemChosen].cost

        println("size: {itemIndex} board cost: {itemSize} item index chosen: {itemChosen} (item size: {itemSize} cost: {itemCost})")

        itemIndex = itemIndex - items[itemChosen].size
        sumOfWorth = sumOfWorth + items[itemChosen].cost
    }

    assert(sumOfWorth == worthOfSack)

    return [worthOfSack, itemsChosenList]
}

solution=solveKnapsack(30, items)
println("solution: ", solution)
