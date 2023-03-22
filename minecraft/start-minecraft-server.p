
#JAR_URL='https://piston-data.mojang.com/v1/objects/8f3112a1049751cc472ec13e397eade5336ca7ae/server.jar'

# version 1.19.1
JAR_URL='https://piston-data.mojang.com/v1/objects/8399e1211e95faa421c1507b322dbeae86d604df/server.jar'

def checkJavaPresent() {

    resp, status = system("java --version")
    if status != 0 {
        println("Error: java is not installed on this system. You need the java runtime to start a minecraft server.")
        exit(1)
    }
        
}

checkJavaPresent()


options = {
  'method': 'GET'
}


def hasEulaWithYes() {
    try {
        eulaText = readFile("eula.txt")
        pos = find(eulaText, "eula=true")        
        return  pos != -1
    } catch er {

    }
    return false
}

def makeNewWorldFlat() {
    props = readFile("server.properties")
    props = replace(props, 'level-type=minecraft\\:normal', 'level-type=minecraft\\:flat' )
    props = replace(props, 'gamemode=survival', 'gamemode=creative') 
    writeFile("server.properties", props)
}

def initialServerRun() {
    println("preparing the run...")
    system("java -jar server.jar")
    eulaText = readFile("eula.txt")
    eulaText= replace(eulaText, "eula=false", "eula=true")        
    writeFile("eula.txt", eulaText)

    makeNewWorldFlat()  

}

def startServer() {
    println("starting the server...")

    cmdline="java -jar server.jar --nogui"

    runcmd(cmdline, def(event) {
        if exists('stdout', event)
            println(event.stdout)
        if exists('stderr', event)
            println(event.stderr)
        if exists('status', event) {
            println("Error: minecraft stopped. exit status: {event.status}")
            exit(1)
        }
    })
}
    


def runJavaServer() {
   if not hasEulaWithYes() 
     initialServerRun()     
   startServer()  
}

httpSendBinary(JAR_URL, options, def(resp,error) {
    #println("response: {type(resp)} {resp} error: {error}\n")
    writeFile("server.jar", resp)
    runJavaServer()
})

