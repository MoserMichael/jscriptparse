urlExchangeRate='https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/eur.json' 

responseJson=httpSend(urlExchangeRate, none, def(statusCode, headers, responseData, err) {
    if (statusCode == 200) {
        data = parseJsonString(responseData)
        println("Current date: {data['date']}
  Euro to USD {data['eur']['usd']} 
  Euro to GPB {data['eur']['gbp']}
  Euro to NIS {data['eur']['ils']} 
")
    } else 
        println("Error: got http status: {statusCode} error: {err}")
})



