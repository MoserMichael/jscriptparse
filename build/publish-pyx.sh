#!/usr/bin/env bash

if [[ ${NPM_TOKEN} == "" ]]; then 
    echo "Error: set NPM_TOKEN environment variable to the npm access token of your account"
    exit 1
fi

set -ex

rm -rf tmp-publish || true
mkdir tmp-publish

cp build/pyx-package.json tmp-publish/package.json
cp PYXDESIGN.md	tmp-publish/
cp PYXFUNC.md	tmp-publish/ 
cp PYXTUT.md	tmp-publish/
cp README.md    tmp-publish/
cp rt.js        tmp-publish/
cp scripty.js   tmp-publish/
cp pyx          tmp-publish/pyxcmd
cp -rf tests     tmp-publish/
#cp build/test.sh tmp-publish/tests

pushd tmp-publish
npm publish --access public
popd

