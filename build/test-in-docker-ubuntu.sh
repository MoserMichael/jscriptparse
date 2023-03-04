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

docker run --rm -v $PWD:/mnt ubuntu:latest  bash -cx 'apt update; apt install -y make curl; curl -sL https://deb.nodesource.com/setup_'${VER}'.x | bash; apt-get install -y nodejs; npm install pyxlang -g; pyx -v; cd /mnt; make test-installed'


