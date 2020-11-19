# Just

A very small v8 javascript runtime for linux only

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/just-js/binder/HEAD)

## Build and Run

Currently working on modern linux (debian/ubuntu and alpine tested) on x86_64

```bash
# download and run the build script
sh -c "$(curl -sSL https://raw.githubusercontent.com/just-js/just/0.0.6/install.sh)"
# install just binary to /usr/local/bin
make -C just-0.0.6 install
# export the just home directory
export JUST_HOME=$(pwd)/just-0.0.6
# if you don't want to install, add JUST_HOME to SPATH
export PATH=$PATH:$JUST_HOME
# initialise a new application in the hello directory
just init hello
cd hello
# build hello app
just build
./hello
# clean all the just makefile artifacts
make cleanall
# clean the just source files required for build
just clean
```

## Docker

```

```
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
- build: generated files
.gitignore
.vscode/c_cpp_properties.json
.vscode/launch.json
.dockerignore
{main}.js?
{index}.js

allow overriding the auto-generated files with an env var to a path with templates

- build: --shared option
- build: autodiscover dependencies
- build: config for each module listing object files - can we autodiscover this too?
- build: 'just init'
- build: all modules are in lib/{name}.js or lib/{name}/index.js
- build: they can have files underneath
- general: when requiring, we lookup the internal cache if we don't find the real file
- build: option to disallow any external files in require when building
- build: add the config at a known location so we can look it up and parse it (JSON, not JS)
- library: allow just.library('foo.so') to load internal first and if that fails to try dlopen
- docker: naming convention for docker images
- general: catch all exceptions in c++ and do return codes
- build: generate dockerfile/.gitignore/.dockerignore when building a project
- build: docker build in makefile (parameterize dockefile)
- build: init command to initialize a basic app with a name you provide on command line
- build: put all the generated files in '.just'
- general: look at gvisor - we could do similar and reduce syscalls to a subset
- library: /dev/loop module
- library: shared memory module
- build: recurse all the way down the directory - auto-discover the dependencies
- build: merge libs/modules arrays - .flat()
- general: allow requiring a string
- net: remove dependency on linux-headers - linux/if_packet.h
- general: build on alpine
```
export JUST_HOME=$(pwd)
apk add g++ make curl linux-headers
```


- remove all throws in lib/*.js
- add shm operation - https://gist.github.com/garcia556/8231e844a90457c99cc72e5add8388e4
- add file operations
- add getaddrinfo - not in static build.. ugh! no...
- for static builds, have an option to disallow any external requires. only builtins allowed
- heap snapshot api: https://github.com/bnoordhuis/node-heapdump/blob/master/src/heapdump.cc
- latt at v8 isolate snapshot blob for startup
- free memory in thread spawn on thread completion
- test memory being freed in pg module
- do MIT licenses

```
Copyright 2020 Andrew Johnston

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
 
## Line Count
```
total files : 12
total code lines : 4816
total comment lines : 128
total blank lines : 337

just.cc, code is 2653, comment is 71, blank is 175.
just.h, code is 484, comment is 8, blank is 64.
just.js, code is 253, comment is 7, blank is 15.
lib/build.js, code is 261, comment is 1, blank is 16.
lib/fs.js, code is 180, comment is 4, blank is 14.
lib/inspector.js, code is 318, comment is 11, blank is 20.
lib/loop.js, code is 80, comment is 2, blank is 2.
lib/path.js, code is 104, comment is 1, blank is 7.
lib/repl.js, code is 90, comment is 20, blank is 6.
lib/require.js, code is 32, comment is 0, blank is 4.
lib/websocket.js, code is 290, comment is 3, blank is 10.
main.cc, code is 71, comment is 0, blank is 4.
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
