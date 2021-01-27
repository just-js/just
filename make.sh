#!/bin/bash
make clean runtime-debug
mkdir -p .debug
objcopy --only-keep-debug ./just .debug/just
strip --strip-debug --strip-unneeded ./just
objcopy --add-gnu-debuglink=.debug/just ./just
chmod -x .debug/just 
