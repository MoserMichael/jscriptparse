#!/bin/bash
#
set -ex

docker rmi pyx-test:latest || true
docker build . -f build/Dockerfile -t pyx-test:latest
docker run --rm -v $PWD:/mnt pyx-test:latest  bash -c 'cd  /mnt; make test-installed '
