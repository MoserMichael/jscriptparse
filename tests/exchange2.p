urlExchangeRate='https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/eur.json' 

httpSend(urlExchangeRate, none, def(statusCode, headers, responseData, err) {
    if (statusCode == 200) {
        data = parseJsonString(responseData)
        
        
        maxRate = reduce( map(data['eur'],def(key,value) value), max, -mathconst.Infinity) 
        minRate = reduce( map(data['eur'],def(key,value) value), min, mathconst.Infinity) 


        sum = 0
        map(data['eur'],def(key,value) { sum = sum + value })
        mean = sum / len(data['eur']) 
        
       
        sum = 0
        map(data['eur'],def(key,value) { sum = sum + pow( abs(value - mean), 2) })

        # double check that you get the same result with reduce 
        sum2 = reduce( map(data['eur'],def(key,value) value), def(prev, cur) prev + pow( abs(cur - mean), 2 ), 0)
        assert(sum2==sum, "reduce must give the same result")

        stddev = sqrt( sum / len(data['eur']) )

        println("Statistics on the euro exchange rates for: {data['date']}

  maximum exchange rate: {maxRate}
  minimum exchange rate: {minRate}
  mean exchange rate:    {mean}
  standard deviation:    {stddev}
")

    } else 
        println("Error: got http status: {statusCode} error: {err}")
})



