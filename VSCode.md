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

# Start in VSCode

- open the 'just' folder in vscode

you should be prompted to "Reopen in Container". Click that button.

- wait for container to be built and started
- open a terminal in vscode

# VSCode Terminal Commands

## build the builder runtime and install it

```
make runtime-builder install
```

## build a module

```
make MODULE=blake3 module
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
```

# Test Your Module

create a script: examples/fib.js

```Javascript
const { fib } = just.library('fib.so', 'fib')
just.print('fib: ' + fib.calculate(parseInt(just.args[2] || '1', 10)))
```

or eval from the shell

```bash
just eval "just.print(just.library('fib.so', 'fib').fib.calculate(parseInt(just.args[3], 10)))" 42
```

# C++ Extension and Intellisense

## Debugging Javascript

** should be fixed soon **

## Debugging C++

https://code.visualstudio.com/docs/remote/containers#_debugging-in-a-container

- build the debug version of the runtime
```
make runtime-builder-debug
```

- build a debug version of your module
```
make MODULE=fib module-debug
```

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
- Set breakpoints in your code
- Launch "Just Debug! (C++)"

## C++ Intellisense

- Install the Microsoft C/C++ Extension below
- Download the full v8 source of the release Just(js) was built with so you can drill down to the v8 code if you need to

```
make v8src
```

## Useful Extensions

- StandardJS: https://marketplace.visualstudio.com/items?itemName=chenxsan.vscode-standardjs
- Microsoft C/C++ Extension: https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools
