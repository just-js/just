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
- avoid abstraction as much as possible. abstractions can be built in userspace
- be able to write busybox in js using this
- don't necessarily care about browser compatibility, but a compatibility layer could be added in userland
- don't necessarily care about all ES features, but a compatibility layer could be added in userland
- commonjs modules, no support for ES modules
- non-async by default - can do blocking calls and not use the event loop
- event loop in JS-land. full control over epoll api
- small standard library - leave as much to userland as possible. focus on primitives needed to build higher level abstractions
- useful as a teaching/learning platform for linux system programming and learning more about javascript and v8 internals
- small number of files - keep everything in one header/source file if possible
- keep LOC as small as possible < 5k
- allocate as little as possible on v8 heap
- resource lifetime is responsibility of the caller ?? what do i mean here?
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

### Runtime Only
```
make runtime
```
- basic runtime for running external scripts

## build builder runtime
```
JUST_HOME=$(pwd) make runtime-builder
```
- this runtime enables self building and packaging

## self build with builder runtime
```
JUST_HOME=$(pwd)/.just just build runtime-builder
```
- binary will be in .just directory under current directory by default 

## Issues

- move issues to github issues
- openssl with static build - how to solve?

## self build to a target directory with builder runtime
```
JUST_TARGET=$(pwd)/foo JUST_HOME=$(pwd)/foo/.just just build cleanall runtime-builder
```
- binary will be in foo directory under current directory

## Summary
- 15 MB static binary, 17 MB dynamic
- 8MB startup RSS for static binary, 12 MB for dynamic
- less than 5k loc
- builds in 4 seconds

## Roadmap
- harden codebase. check all return codes. handle buffer overruns. handle bad arguments
- test suits and fuzz tests
- benchmarks
- examples
- module system
- docker builds

## Todo
- remove all throws in lib/*.js
- add shm operation - https://gist.github.com/garcia556/8231e844a90457c99cc72e5add8388e4
- add file operations
- add getaddrinfo - not in static build.. ugh! no...
- for static builds, have an option to disallow any external requires. only builtins allowed
- heap snapshot api: https://github.com/bnoordhuis/node-heapdump/blob/master/src/heapdump.cc
- latt at v8 isolate snapshot blob for startup
 
## Line Count
```
total files : 12
total code lines : 4424
total comment lines : 118
total blank lines : 313

just.cc, code is 2360, comment is 59, blank is 152.
just.h, code is 469, comment is 5, blank is 66.
just.js, code is 203, comment is 5, blank is 13.
lib/build.js, code is 254, comment is 9, blank is 17.
lib/fs.js, code is 160, comment is 4, blank is 12.
lib/inspector.js, code is 310, comment is 11, blank is 20.
lib/loop.js, code is 79, comment is 1, blank is 2.
lib/path.js, code is 104, comment is 1, blank is 7.
lib/repl.js, code is 90, comment is 20, blank is 6.
lib/require.js, code is 32, comment is 0, blank is 4.
lib/websocket.js, code is 290, comment is 3, blank is 10.
main.cc, code is 73, comment is 0, blank is 4.
```

## book

A(J)PLE.js

Advanced (Javascript) Programming in the Linux Environment

## utf8

```bash
> x = ArrayBuffer.fromString('フレー')
{}
> x.byteLength
9
> u8 = new Uint8Array(x)
{
  "0": 227,
  "1": 131,
  "2": 149,
  "3": 227,
  "4": 131,
  "5": 172,
  "6": 227,
  "7": 131,
  "8": 188
}
> y = x.readString(x.byteLength)
"フレー"
> y.length
3
> String.byteLength(y)
9
> b = new ArrayBuffer(x.byteLength)
{}
> b.writeString(y)
9
> u8 = new Uint8Array(b)
{
  "0": 227,
  "1": 131,
  "2": 149,
  "3": 227,
  "4": 131,
  "5": 172,
  "6": 227,
  "7": 131,
  "8": 188
}
```
