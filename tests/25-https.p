CERT="tests/ssl-cert-snakeoil.pem"
KEY="tests//ssl-cert-snakeoil.key" 
cnt = 1

def makeSelfSignedCert() {
  HOST="127.0.0.1"
  system("openssl req -new -x509 -days 256 -nodes -newkey rsa:4096 -out {CERT} -keyout {KEY} -subj '/CN='{HOST}'/O='{HOST}'/C=US/OU=testme' 2>&1")
}


def startHttpsTxtSrv() {
    opts = {
        'privkeyfile': KEY,
        'certfile': CERT
    }

    httpServer(9010, opts, def(req, resp) {
        text = "
=====    
request url: {req.url()}  
method: {req.method()}    
headers {req.headers()}
user-agent: {req.header('User-Agent')}
requestData: {req.requestData()}
"

        resp.send(200, "Pooh says hello. {cnt}" + text)
        cnt := cnt + 1
    })
}


makeSelfSignedCert() 


# for self signed certificates: need to set this magic environment variable
ENV['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

startHttpsTxtSrv()

postData = '{ "name": "Pooh", "family": "Bear" }'

options = {
  'method': 'POST',
  'headers': {
     'Content-Type': 'text/json',
     'Content-Length' : len(postData)
  },
  'data' : postData
}

httpSend('https://127.0.0.1:9010/abcd', options, def(statusCode, headers, responseData, error) {
       if error != "" {
          println("Error occured: {error}")
          exit(1)
       }
       else {
           println("status: {statusCode} headers: {headers} response: {responseData} error: {error}\n") 

            httpSend('https://127.0.0.1:9010/cdef', none, def(statusCode, headers, responseData, error) {
                println("status: {statusCode} headers: {headers} response: {responseData} error: {error}\n") 
                exit(0)
            })
       }
})

