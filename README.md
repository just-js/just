# Just [![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/just-js/just) [![Discord](https://img.shields.io/discord/984405642091585536?label=Discord&logo=Discord)](https://discord.gg/aFpU6VzQK)

A very small v8 javascript runtime for linux only

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/just-js/binder/HEAD)

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
## Create a sample web app
### Create a new Application
```bash
# initialise a new application in the hello directory
just init hello
cd hello
```
### Edit the sample app code
Now open your favorite code editor and update the hello.js file
```ES6
const stringify = require('@stringify')
const http      = require('@http')
const process   = require('process')

const { createServer, responses }   = http
const { sjs, attr }                 = stringify

const message   = 'Hello, World!'
const json      = { message }

// This function allows us to spwn a process and run our app in it
// Every server request will spawn a separate process and will carry and instance of the app
function spawn(main) {
    if (just.env()['WORKER']) return main()
    const { watch, launch } = process
    const processes = []
    const cpus = parseInt(just.env().CPUS || just.sys.cpus, 10)
    for (let i = 0; i < cpus; i++) {
        just.sys.setenv('WORKER', i)
        //const proc = launch(just.args[0], ['--trace-gc', ...just.args.slice(1)])
        const proc = launch(just.args[0], just.args.slice(1))
        processes.push(proc)
        proc.stats = { user: 0, system: 0 }
    }
    return Promise.all(processes.map(p => watch(p)))
}

// the main function
async function main() {
    const sJSON = sjs({ message: attr('string') })

    const server = createServer()
        .get('/plaintext', res => res.text(message))
        .get('/json', res => res.utf8(sJSON(json), responses.json))
        .listen('0.0.0.0', 8080)
}

// Spawn the main function in a process and catch all errors
spawn(main)
    .catch(err => just.error(err.stack))
```
### Build wb app

Your little "Hello world" web app is ready.
Build it by invoking `just` again
```
# build hello app
just build hello.js --clean --static
./hello
```
If the program compiled successfully, you will be able to goto the route endpoints we added and see the "Hello World" message.
So, open a browser and open
http://localhost:8080/json
http://localhost:8080/plaintext


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
