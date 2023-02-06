#!/bin/bash

set -x

# build PYXFUNC.md
./pyx tests/pyxfunc.p > PYXFUNC.md

# build table of content for PYXTUT.md
./pyx tests/buildtoc.p PYXTUT.md

