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
- wait for container to be built and started
- open a terminal in vscode

# VSCode Terminal Commands

## build the builder runtime and install it

```
make runtime-builder install
```

## build a module

```
just build modules-blake3
```

## Download Examples

```
just build examples
```

## Create a Module

- we'll use modules/fib that comes by default as an example
- build your module

```
MODULE=fib just build module
```
OR

```
just build MODULE=fib module
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
      "name": "(gdb) Launch",
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
- Launch "gdb (Launch)"

## Useful Extensions

- StandardJS: https://marketplace.visualstudio.com/items?itemName=chenxsan.vscode-standardjs
- Microsoft C/C++ Extension: https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools
