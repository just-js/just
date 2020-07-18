# Just

A very small v8 javascript runtime for linux only

## Philosophy/Goals
- small, secure, robust and performant js runtime for linux
- small codebase. easy to understand and hack
- very simple layer on top of system calls, v8 and c/c++ standard libraries
- minimal use of classes/function templates and OO - "c" in javascript
- favour return codes over exceptions
- platform for building system software on linux in javascaript
- as close to native performance as possible
- modules can be dynamically loaded shared libaries or can be statically compiled into runtime
- secure by default
- be able to write busybox in js using this
- don't necessarily care about browser compatibility, but a compatibility layer could be added in userland
- don't necessarily care about all ES features, but a compatibility layer could be added in userland
- commonjs modules, no support for ES modules
- non-async by default - can do blocking calls and not use the event loop
- event loop in JS-land. full control over epoll api
- small standard library - leave as much to userland as possible. focus on primitives needed to build higher level abstractions
- useful as a teaching/learning platform for linux system programming and learning more about javascript and v8 internals
- small number of files - keep everything in one header file if possible
- keep LOC as small as possible < 5k
- allocate as little as possible on v8 heap
- resource lifetime is responsibility of the caller
- blessed modules live in modules repo
  - must adhere to guidelines
  - must have tests
  - breaking changes in runtime can be fixed by just maintainers
- foundation for ownership/governance
- c-like api - can create object models in js
- auto discovery for modules - if we find a makefile. if we find an index.js

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
- 14 MB binary
- 15MB RSS
- Single C++ header file
- less than 4k loc
- builds in 4 seconds

## Roadmap
- harden codebase. check all return codes. handle buffer overruns. handle bad arguments
- test suits and fuzz tests
- benchmarks
- examples
- module system
- docker builds

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