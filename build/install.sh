#!/bin/bash

set -ex

if [[ ! -d node_modules ]]; then
    npm i yaml
fi
