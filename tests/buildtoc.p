
fileName = ARGV[0]

tocStart = "<!-- toc-start -->\n"
tocEnd = "\n<!-- toc-end -->"

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

def removeOldLink(title) {
    pos = find(title,"<a id=")
    if pos != -1 {
        posEnd = find(title,'/>', pos+1)
        if posEnd != -1
            return mid(title, 0, pos) + mid(title, posEnd+2)
    }
    return title
}

def makeToc(fileName, textTokenList) {
    mode = 0
    tocHdr={}
    tocText=""
    noTocText = ""

    for token textTokenList {
        if mid(token,0,3) == "```" {
            noTocText = noTocText + token
            continue
        }
        first = true
        for line split(token) {
            if not first
                noTocText = noTocText + "\n"
            first = false

            trimLine = trim(line)

            if trimLine != "" and trimLine[0]=='#' {
                trimLine = removeOldLink(trimLine)
                depth, title = countDepth(trimLine)

                #println("depth: {depth} line: {line} title: {title}")

                if not exists(depth,tocHdr) {
                    tocHdr[depth]=1
                } else {
                    tocHdr[depth] = tocHdr[depth] + 1
                }

                label = makeLabel(tocHdr,depth)
                line = repeat('#', depth) + "<a id='{label}' />{title}"

                tocText = tocText + "\n" + repeat(" ", depth) + "* [{title}] (#{ label })"
            }
            noTocText = noTocText + line
        }

    }

    allText = "
{tocStart}
{tocText}
{tocEnd}
{noTocText}"
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
        text = mid(text, 0, pos) + mid(text, next_pos + len(to))
    } else
        text = mid(text, 0, pos)

    return [true, text]
}

def removeBetween2(text, from, to) {
    posFrom = find(text, from)
    if posFrom == -1
        return [[text], ""]

    posTo = find(text, to , posFrom + len(from) )

    if posTo != -1 {
        posTo = posTo + len(to)
        return [ [ mid(text,0, posFrom), mid(text, posFrom, posTo) ], mid(text, posTo) ]
    }     

    return  [[ mid(text, 0, posFrom), mid(text, posFrom) ], "" ]
}

def splitTokens(text) {
    tokens = []

    while true {

        nextTokens, text = removeBetween2(text,  "```", "```")
        tokens = joinl(tokens, nextTokens)
        if text == ''
            break
    }

    return tokens
}

def processFile(fileName) {

    text = readFile(fileName)

    # remove old table of contents
    _, text = removeBetween(text, tocStart, tocEnd)

    # split into text and no-format sections
    textTokenList = splitTokens(text)

    # make table of contents
    makeToc(fileName, textTokenList)
}

processFile(fileName)


