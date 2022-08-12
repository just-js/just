#!/bin/sh
curl -L -o just.tar.gz https://github.com/just-js/just/archive/current.tar.gz
mkdir -p just && tar -zxvf just.tar.gz -C just --strip-components 1
make -C just runtime-static
