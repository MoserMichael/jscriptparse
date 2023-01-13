#!/bin/bash

FAILED_TESTS=0

for  f in $(ls tests/[0-9]*.p); do
    echo "testing: $f"
    RESULT_F="tests/"$(basename "$f" .p)".result"
    ./pyx "$f" >${RESULT_F}

    OUT=$(cat ${RESULT_F})
    EXPECTED_F="tests/"$(basename "$f" .p)".out"
    EXPECTED=$(cat "${EXPECTED_F}")
    if [[ "$OUT" != "$EXPECTED" ]]; then
        cat <<EOF
ERROR: test $f failed"
EXPECTED:
${EXPECTED}
ACTUAL:
${OUT}
EOF
        ((FAILED_TESTS=FAILED_TESTS+1))
    else
        rm ${RESULT_F}
    fi
done

echo "------"
if [[ $FAILED_TESTS != 0 ]]; then
    echo "Some tests failed. $FAILED_TESTS test failures"
else
    echo "* all tests passed. have some honey! *"
fi
