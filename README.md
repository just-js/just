# Just [![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/just-js/just)

## *** Attention ***

**17 Nov 2023**

This project is not being actively maintained in it's current state. please see [lo](https://github.com/just-js/lo) for a new, low-level JavaScript runtime i am working on. Very shortly this should be in a place where I will be able to "resurrect" the "just" project and base it on lo. Keep an eye out over coming weeks on [twitter](https://twitter.com/justjs14)  or come join us on [discord](https://discord.gg/ZnNsBwaBKr) to discuss the new work. 🙏 🚀

## Build and Run

Currently working on modern linux (debian/ubuntu and alpine tested) on x86_64

```bash
# download and run the build script
sh -c "$(curl -sSL https://raw.githubusercontent.com/just-js/just/current/install.sh)"
# install just binary to /usr/local/bin
make -C just install
# export the just home directory
export JUST_HOME=$(pwd)/just
export JUST_TARGET=$JUST_HOME
# if you don't want to install, add JUST_HOME to SPATH
export PATH=$PATH:$JUST_HOME
# run a shell
just
```

## Create a new Application
```bash
# initialise a new application in the hello directory
just init hello
cd hello
# build hello app
just build hello.js --clean --static
./hello
```

## Command Line Options

### Run a Just shell/repl
```bash
just
```

### Pipe a script to stdin
```bash
cat hello.js | just --
```

### Eval some Javascript passed as an argument
```bash
just eval "just.print(just.memoryUsage().rss)"
```

### Run a script
```bash
just hello.js
```

### Initialise a new project and build it
```bash
just init hello
cd hello
just build
```

### Clean a built project
```bash
just clean
```

## Documentation

Coming soon...

## Philosophy/Goals
- small, secure, robust and performant js runtime for linux
- small codebase. easy to understand and hack
- very simple layer on top of system calls, v8 and c/c++ standard libraries
- minimal use of classes/function templates and OO - "c" in javascript
- favour return codes over exceptions
- platform for building system software on linux in javascript
- as close to native performance as possible
- secure by default
- avoid abstraction as much as possible. abstractions can be built in userland
- commonjs modules, no support for ES modules
- non-async by default - can do blocking calls and not use the event loop
- event loop in JS-land. full control over epoll api
- small standard library - leave as much to userland as possible. focus on primitives needed to build higher level abstractions
- useful as a teaching/learning platform for linux system programming and learning more about javascript and v8 internals
- small number of source files
- minimal dependencies - g++ and make only
- keep LOC as small as possible < 5k
- allocate as little as possible on v8 heap
