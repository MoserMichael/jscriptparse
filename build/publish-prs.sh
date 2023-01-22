#!/usr/bin/env bash

if [[ ${NPM_TOKEN} == "" ]]; then 
    echo "Error: set NPM_TOKEN environment variable to the npm access token of your account"
    exit 1
fi

set -ex

rm -rf tmp-publish || true
mkdir tmp-publish

cp build/prs-package.json tmp-publish/package.json
cp prs.js tmp-publish/
cp prstst.js tmp-publish/
cp PRS.md tmp-publish/README.md

pushd tmp-publish
npm publish --access public
popd

