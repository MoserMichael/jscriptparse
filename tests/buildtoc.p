
fileName = ARGV[0]

tocStart = "<span hidden>toc-start</span>"
tocEnd = "<span hidden>toc-end</span>"

println("fileName: {fileName}")

def countDepth(line) {
    depth = 0
    for i range(0,len(line)) 
        if line[i] == '#'
            depth = depth + 1
        else 
            return [ depth, mid(line,i) ]

    return [0, ""]
}

def makeLabel(tocHdr, depth) {
    lbl="s"

    for i range(1,depth+1)
        lbl = lbl + "-{tocHdr[i]}"
    
    return lbl
}

def makeToc(text,fileName) {
    mode = 0
    tocHdr={}
    tocText=""
    noTocText = ""

    for line split(text) {
        line = trim(line)

        if line != "" and line[0]=='#' {
            depth, title = countDepth(line)
            title = trim(title)

            println("depth: {depth} line: {line} title: {title}")

            if not exists(depth,tocHdr) {
                tocHdr[depth]=1
            } else {
                tocHdr[depth] = tocHdr[depth] + 1
            }

            label = makeLabel(tocHdr,depth)
            line = repeat('#', depth) + "<a id='{label}' />{title}"

            tocText = tocText + "\n" + repeat(" ", depth) + "* [{title}] (#{ label })"
        }
        noTocText = noTocText + "\n" + line
    }

    allText = "
{tocStart}
{tocText}
{tocEnd}
{noTocText}
"
    fileNameTemp=fileName+".tmp"

    writeFile(fileNameTemp, allText)
    unlink(fileName)
    rename(fileNameTemp, fileName)
}

def removeBetween(text, from, to) {
    pos = find(text, from)
    if pos == -1
        return [false, text]

    next_pos = find(text, to , pos + len(from) )

    if next_pos != -1 {
        next_pos = next_pos + 3
        text = mid(text, 0, pos) + mid(text, next_pos + len(to))
    } else
        text = mid(text, 0, pos)

    return [true, text]
}

def removeNoFormat(text) {

    while true {
        status, text = removeBetween(text, "```", "```")
        if not status
            break
    }

    return text
}

def processFile(fileName) {

    text = readFile(fileName)

    _, text = removeBetween(text, tocStart, tocEnd)
    text = removeNoFormat(text)
    makeToc(text, fileName)

}

processFile(fileName)


