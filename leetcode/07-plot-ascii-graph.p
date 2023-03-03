
def plotGraph(func, x_from, x_to, x_step = none, displayed_chars_x = 80, displayed_chars_y = 24)  {
    if x_step == none {
        x_step = (x_to - x_from) / displayed_chars_x
    } else {
        x_step = (x_to - x_from) / (displayed_chars_x * x_step)
    }
    numEntries = x_step * displayed_chars_x

    values = dim(numEntries)

    # compute all values

    xval = x_from
    maxVal =  -mathconst.Infinity
    minVal =  mathconst.Infinity

    for i range(0,numEntries) {
        yval = func(xval)
        xval = xval + x_step

        maxVal = max(maxVal, yval)
        minVal = min(minVal, yval)

        values[i] = yval
    }

    #println("minValue:", minVal, "maxValue:", maxVal)

    values_per_x_char = numEntries / displayed_chars_x

    displayScreen = dimInit(' ', displayed_chars_y+1,  displayed_chars_x+1) 

    # compute the map of displayed characters

    pos = 0
    x_pos = 0
    while pos < numEntries {
        sum_values = 0
        num_vals = 0
        for i range(0, values_per_x_char) {
            if pos == numEntries
                break
            sum_values = sum_values + values[pos]
            pos = pos + 1
            num_vals = num_vals + 1
        }
        avg_value = sum_values / num_vals

        #println("minVal:", minVal, "avg_value:", avg_value, "maxVal:", maxVal)
        
        # scale it inx_to the picture
        y_pos = ( (avg_value - minVal)  / (maxVal - minVal) ) *  displayed_chars_y

    
        #println("xpos", x_pos, "ypos", int(y_pos), y_pos)
        displayScreen[ displayed_chars_y - int(y_pos) ][ x_pos ] = '*'
        x_pos = x_pos + 1
    }

    # plot the picture

    println("x-range, from:", x_from, "to:", x_to, "step:", x_step)
    println("y-range, from:", minVal, "to: ", maxVal)

    for y range(0, displayed_chars_y) {
       for x range(0, displayed_chars_x) {
            print(displayScreen[y][x])
       }
       println("|")
    }

    for x range(0, displayed_chars_x) {
        print("_")
    }
    println("")
}

def mysqr(x)  x*x

plotGraph( mysqr, -200, +200 )

def lin(x) pow(x,3) + pow(x,2) +2*x +1
plotGraph( lin, -40, 40 )

