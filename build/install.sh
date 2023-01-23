#!/bin/bash

set -e

if [[ ! -d node_modules ]]; then
    npm i yaml
fi
