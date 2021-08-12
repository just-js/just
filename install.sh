#!/bin/sh
curl -L -o just.tar.gz https://github.com/just-js/just/archive/0.1.2.tar.gz
tar -zxvf just.tar.gz
cd just-0.1.2
make runtime-static
