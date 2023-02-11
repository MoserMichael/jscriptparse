
if true 
    obj = { "foo": def () {
                    if true false 
                    $ # this error is reported incorrectly
                }
          }
