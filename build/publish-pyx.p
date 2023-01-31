

def getVersion( packageJsonFile ) {
    jsonFile = readFile( packageJsonFile ) 
    json = parseJsonString(jsonFile)
    ver = json['version']
    println("version: {ver}")

    return ver
}

def makeTag(version) {

   out, status =  `git tag {version} -m "publish pyx package {version}" 2>&1`
   if status != 0 {
        println("Error tag {version} already exists. {out}")
        exit(1)
    }
}

def copyAndReplace(oldName, newName) {

    pyxFile = readFile(oldName)

    pyxFile = replace(pyxFile, "VERSION_TAG", version)
    pyxFile = replace(pyxFile, 'const prs=require(path.join(__dirname,"prs.js"))','const prs=require("prscombinator")')
    pyxFile = replace(pyxFile, "NODE_PATH=.", "")

    writeFile(newName, pyxFile)
}

def prepareAndPublish(version) {

    setErrorOnExecFail(true)

    system("rm -rf tmp-publish || true")
    system("mkdir tmp-publish")
    

    copyAndReplace("rt.js", "./tmp-publish/rt.js")
    copyAndReplace("scripty.js", "./tmp-publish/scripty.js")
    copyAndReplace("pyx", "./tmp-publish/pyx")

    system("chmod +x ./tmp-publish/pyx")
    system("cp PYXDESIGN.md	tmp-publish/")
    system("cp PYXFUNC.md	tmp-publish/") 
    system("cp PYXTUT.md	tmp-publish/")
    system("cp README.md    tmp-publish/")

    system("cp build/pyx-package.json tmp-publish/package.json")
    system("cp -rf tests     tmp-publish/")

    system("cd tmp-publish; npm publish --access public")

}
 
def publish() {
    version = getVersion("build/pyx-package.json")
    makeTag(version)
    prepareAndPublish(version)
    println("version: {version} has been published to npm")
}

publish()
