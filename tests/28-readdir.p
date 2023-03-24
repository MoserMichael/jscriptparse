

dir=getcwd()

println("javascript files in current directory

")

for fileName, fileType readdir('.', false) 
    if endsWith(fileName,'.js') {
        relName = mid(fileName, len(dir)+1 )
        println("fileName: {relName} fileType: {fileType}")    
    }

println("

pux files - enumerated recursively from current directory

")


for fileName, fileType readdir('.', true) 
    if endsWith(fileName,'.p') {
        if find(fileName,"tmp-publish") == -1 {
            relName = mid(fileName, len(dir)+1 )
            println("fileName: {relName} fileType: {fileType}")    
        }
    }
    

