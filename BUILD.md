```bash
## make the main runtime
make runtime
## change the config and rebuild using an eval
./just eval "require('build').run(require('config/runtime.js'))"
## or pipe ebal to just
echo "require('build').run(require('config/runtime.js'))" | ./just --
## or rebuild like this
./just build
## or use a different config
./just build foo.js
## or use json instead
./just build foo.json
## dump a configuration
./just build config/runtime.js --dump
## clean and build
./just build config/runtime.js --clean
## clean and make a debug build
./just build config/runtime.js --clean --debug
## install examples
./just build config/runtime.js examples
## build the net module
MODULE=net ./just build config/runtime.js module
## build debug version of the net module
MODULE=net ./just build config/runtime.js module-debug
```