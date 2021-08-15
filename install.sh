#!/bin/sh
JUST_VERSION=0.1.3
curl -L -o just.tar.gz https://github.com/just-js/just/archive/${JUST_VERSION}.tar.gz
tar -zxvf just.tar.gz
mv just-${JUST_VERSION} just
make -C just runtime-static
