# Prerequisites

This should work on recent Windows, Linux and Mac. Needs docker and ability to run VSCode

# Install VSCode

https://code.visualstudio.com/download

# Install VSCode Remote Containers Extension

https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers

# Clone the just Repo

```
git clone git@github.com:just-js/just.git
```

# Checkout a Specific Branch

main branch may be broken at any moment in time (until we finalise a better process for release management) so you may want to checkout a specific release tag

```
cd just
git checkout 0.1.0
```

# Start in VSCode

- open the 'just' folder in vscode

you should be prompted to "Reopen in Container". Click that button.

- wait for container to be built and started
- open a terminal in vscode

# VSCode Terminal Commands

## build the runtime and install it

```
make clean runtime
sudo make install
```

## build a module

```
make MODULE=blake3 module
sudo make -C modules/blake3 install
```

## Download Examples

```
make examples
```

## Create a Module

- we'll use modules/fib that comes by default as an example
- build your module

```
make MODULE=fib module
sudo make -C modules/fib install
```

# Test Your Module

create a script: examples/fib.js

```Javascript
const { fib } = just.library('fib')
just.print('fib: ' + fib.calculate(parseInt(just.args[2] || '1', 10)))
```

or eval from the shell

```bash
just eval "just.print(just.library('fib').fib.calculate(parseInt(just.args[3], 10)))" 42
```

# C++ Extension and Intellisense

## Debugging Javascript

This should now be working. To try it out, follow the instructions to run the HTTP server below but instead run the server with the --inspector flag, e.g.
```
just --inspector server.js
```

You should then be able to debug from VSCode using this launch configuration:
```json
    {
      "address": "127.0.0.1",
      "localRoot": "/workspaces/just",
      "name": "Attach to Remote",
      "port": 9222,
      "remoteRoot": "/workspaces/just",
      "request": "attach",
      "skipFiles": [
        "<node_internals>/**"
      ],
      "type": "pwa-node"
    },
```

give it a couple of seconds to hook up and you should see "server.js" appear in the "Loaded Scripts" section. You may need to expand the workspaces to see it.

![Hello World](https://i.ibb.co/854RS8z/debugging.png)


double-click on server.js to open it in the editor and then you can set breakpoints, step through code etc.

## Debugging C++

https://code.visualstudio.com/docs/remote/containers#_debugging-in-a-container

- build the debug version of the runtime
```
make runtime-debug
```

- build a debug version of your module
```
make MODULE=fib module-debug
```
- Install the Microsoft [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
- create a .vscode/launch.json file
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Just Debug! (C++)",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/just",
      "args": ["fib.js", "42"],
      "stopAtEntry": false,
      "additionalSOLibSearchPath": "/usr/local/lib/just",
      "cwd": "${workspaceFolder}/examples",
      "externalConsole": false,
      "MIMode": "gdb",
      "setupCommands": [
          {
              "description": "Enable pretty-printing for gdb",
              "text": "-enable-pretty-printing",
              "ignoreFailures": true
          }
      ]
    }

  ]
}
```
- Set breakpoints in your C++ code
- Launch "Just Debug! (C++)"
- Add the following to your .vscode/settings.json for code browsing
```json
{
  "C_Cpp.default.defines": ["V8_TARGET_ARCH_X64"],
  "C_Cpp.default.includePath": [
      "${workspaceFolder}",
      "${workspaceFolder}/deps/v8/include",
      "${workspaceFolder}/deps/v8/src",
      "${workspaceFolder}/deps/v8/gen",
      "${workspaceFolder}/deps/v8",
      "${workspaceFolder}/modules/blake3",
      "${workspaceFolder}/modules/ffi",
      "${workspaceFolder}/modules/fib",
      "${workspaceFolder}/modules/html",
      "${workspaceFolder}/modules/openssl",
      "${workspaceFolder}/modules/openssl/deps/openssl-OpenSSL_1_1_1d/include",
      "${workspaceFolder}/modules/pg",
      "${workspaceFolder}/modules/pg/deps/postgresql-12.3/src/include",
      "${workspaceFolder}/modules/pg/deps/postgresql-12.3/src",
      "${workspaceFolder}/modules/pg/deps/postgresql-12.3/src/interfaces/libpq",
      "${workspaceFolder}/modules/picohttp",
      "${workspaceFolder}/modules/rocksdb",
      "${workspaceFolder}/modules/rocksdb/deps/rocksdb-6.10.2/include",
      "${workspaceFolder}/modules/tcc",
      "${workspaceFolder}/modules/tcc/deps/tcc-0.9.27",
      "${workspaceFolder}/modules/zlib/deps/zlib-1.2.11",
      "${workspaceFolder}/modules/zlib"
  ],
  "C_Cpp.default.cppStandard": "c++11"
}
```

## C++ Intellisense/Code Browsing

- Install the Microsoft C/C++ Extension below
- Download the full v8 source of the release Just(js) was built with so you can drill down to the v8 code if you need to

```
make v8src
```

## Useful Extensions

- StandardJS: https://marketplace.visualstudio.com/items?itemName=chenxsan.vscode-standardjs. Add the following to your .vscode/settings.json:
```json
  "standard.enable": true,
  "standard.options": {
      "globals": ["just", "BigInt", "BigUint64Array", "Atomics", "WebAssembly", "SharedArrayBuffer"]
  },
```
- Microsoft C/C++ Extension: https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools

## HTTP Server Example

Run the server. It listens on 127.0.0.1:3000

```
make runtime
sudo make install
make MODULE=http module
sudo make -C modules/http install
make examples
cd examples/http
just server.js
```

Test the Server

```
curl -vvv http://127.0.0.1:3000/
curl -vvv http://127.0.0.1:3000/json
curl -vvv http://127.0.0.1:3000/async
```