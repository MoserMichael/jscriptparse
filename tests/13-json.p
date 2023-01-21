    # conversion of variable to string and vice versa

    dct = { "persons": { "id": "323412343123", "name": "Michael", "surname": "Moser", "age": 52 }, "stuff": [3, 2, 1] }
    js = toJsonString( dct )
    println( "json: {js}" )
    
    vl = parseJsonString(js)
    vl['persons']['id'] = 123
    vl['persons']['age'] = 22
    js = toJsonString(vl)
    println( "json: {js}" )

