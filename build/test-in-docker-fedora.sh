#!/bin/bash
#
set -ex

#docker rmi pyx-test:latest || true
#docker build . -f build/Dockerfile -t pyx-test:latest
#docker run --rm -v $PWD:/mnt pyx-test:latest  bash -c 'npm install pyxlang -g; cd  /mnt; make test-installed '
#
#
#
VER=19


docker run --rm -v $PWD:/mnt fedora:latest  bash -cx 'dnf update; dnf install -y make curl; curl -fsSL https://rpm.nodesource.com/setup_'$VER'.x | bash -; dnf install -y nodejs; npm install pyxlang -g; cd /mnt; make test-installed'


