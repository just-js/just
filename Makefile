CC             = clang++

.PHONY: help clean

help:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_\.-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

builtins.h: just.js lib/*.js ## compile builtins js
	xxd -i just.js > builtins.h
	xxd -i lib/websocket.js >> builtins.h
	xxd -i lib/inspector.js >> builtins.h
	xxd -i lib/loop.js >> builtins.h
	xxd -i lib/require.js >> builtins.h
	xxd -i lib/path.js >> builtins.h
	xxd -i lib/repl.js >> builtins.h
	xxd -i lib/fs.js >> builtins.h
	sed -i 's/unsigned char/const char/g' builtins.h
	sed -i 's/unsigned int/unsigned int/g' builtins.h

deps: ## download v8 lib and headers
	mkdir -p deps
	curl -L -o deps/v8.tar.gz https://github.com/just-js/libv8/raw/master/v8.tar.gz
	tar -zxvf deps/v8.tar.gz

runtime: builtins.h deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -s -static -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a just.o -Wl,--end-group -ldl -o just
	rm just.o

clean: ## tidy up
	rm -f builtins.h
	rm -f *.o
	rm -f just

uninstall: ## remove just and build deps
	sudo rm -f /usr/local/bin/just
	rm -fr deps
	make clean

install: ## install
	sudo cp -f just /usr/local/bin/
	
.DEFAULT_GOAL := help
