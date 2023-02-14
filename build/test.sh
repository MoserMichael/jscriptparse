#!/bin/bash


FAILED_TESTS=0
DIR="$1"
PYX="$2"

if [[ $DIR == "" ]]; then
    DIR="tests"
fi

if [[ $PYX == "" ]]; then
    PYX="./pyx"
fi


for  f in $(ls ${DIR}/[0-9]*.p); do
    echo "testing: $f"
    RESULT_F="${DIR}/"$(basename "$f" .p)".result"
    ${PYX} "$f" >${RESULT_F}

    OUT=$(cat ${RESULT_F})
    EXPECTED_F="${DIR}/"$(basename "$f" .p)".out"
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
    exit 1
else
    echo "* all tests passed. have some honey! *"
fi
echo ""
