


def countdownAndError(n) {

    if n > 0
        return countdownAndError(n-1)

    return 42 / 0
}
