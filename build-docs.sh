#!/bin/bash
set -ex
git checkout main
jsdoc prs.js PRS.md

tmp=$(mktemp -d)
mv out "${tmp}/"

BRANCH=$(git branch --show-current)
git checkout gh-pages 

cp -rf "${tmp}/out" .
rm -rf "${tmp}"

git add out/* || true

today=$(date)

git commit -am "documentation changes ${today}"

git checkout "${BRANCH}"
