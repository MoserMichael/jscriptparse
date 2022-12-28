#!/bin/bash
set -ex
git checkout main
jsdoc prs.js README.md

tmp=$(mktemp -d)
mv out ${tmp}/

git checkout gh-pages 

cp -rf ${tmp}/out .
