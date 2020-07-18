# Just

A very small v8 javascript runtime for linux only

## Prerequisites
- builds on debian/ubuntu with precompiled libv8
- g++
- make
- curl (to download dependencies)

## Build
```
make runtime
```

## Summary
- 15 MB binary
- 15MB RSS
- Single C++ header file
- less than 4k loc
- builds in 4 seconds

## Line Count
```
total files : 10
total code lines : 3781
total comment lines : 97
total blank lines : 288

just.cc, code is 63, comment is 0, blank is 5.
just.h, code is 2500, comment is 53, blank is 214.
just.js, code is 184, comment is 4, blank is 11.
lib/fs.js, code is 129, comment is 4, blank is 9.
lib/inspector.js, code is 310, comment is 11, blank is 20.
lib/loop.js, code is 79, comment is 1, blank is 2.
lib/path.js, code is 104, comment is 1, blank is 7.
lib/repl.js, code is 90, comment is 20, blank is 6.
lib/require.js, code is 32, comment is 0, blank is 4.
lib/websocket.js, code is 290, comment is 3, blank is 10.
```