
cnt = 1

def startTxtSrv() {
    httpServer(9010, def(req,resp) {
        text = "
=====    
request url: {req.url()}  
method: {req.method()}    
headers {req.headers()}
user-agent: {req.header('User-Agent')}
"

        resp.send(200, "Pooh says hello. {cnt}" + text)
        cnt = cnt + 1
    })
}


def startTimeSrv() {
    httpServer(9010, def (req,resp) {
        println("url: {req.url()} url_: {req.url_}")
        if req.url() == "/time" {
            tm = localtime()
            js = toJsonString(tm)
            resp.send(200, js, "text/json")
        } else
            resp.send(501, "no one here")
    })
}

#startTimeSrv()

startTxtSrv()

httpSend('http://127.0.0.1:9010/abcd', none, def(resp,error) {
    println("response: {resp} error: {error}\n") 

    httpSend('http://127.0.0.1:9010/cdef', none, def(resp,error) {
        println("response: {resp} error: {error}\n") 
        exit(0)
    })
})

