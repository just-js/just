CC=g++
RELEASE=0.0.5
INSTALL=/usr/local/bin
LIBS=/usr/local/lib/just

.PHONY: help clean

help:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_\.-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

modules: ## download the modules for this release
	rm -fr modules
	curl -L -o modules.tar.gz https://github.com/just-js/modules/archive/$(RELEASE).tar.gz
	tar -zxvf modules.tar.gz
	mv modules-$(RELEASE) modules

examples: ## download the examples for this release
	rm -fr examples
	curl -L -o examples.tar.gz https://github.com/just-js/examples/archive/$(RELEASE).tar.gz
	tar -zxvf examples.tar.gz
	mv examples-$(RELEASE) examples

module: modules ## build a shared library for a module 
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ clean shared

module-debug: modules ## build a debug version of a shared library for a module
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ clean debug-shared

module-static: modules ## build a static library for a module
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ clean static

builtins: deps just.cc just.h Makefile main.cc just.js lib/*.js ## compile builtins with build dependencies
	ld -r -b binary just.cc just.h just.js Makefile main.cc lib/websocket.js lib/inspector.js lib/loop.js lib/require.js lib/path.js lib/repl.js lib/fs.js lib/build.js -o builtins.o

deps: ## download v8 lib and headers
	mkdir -p deps
	curl -L -o deps/$(RELEASE).tar.gz https://github.com/just-js/libv8/archive/$(RELEASE).tar.gz
	tar -zxvf deps/$(RELEASE).tar.gz -C deps/
	tar -zxvf deps/libv8-$(RELEASE)/v8.tar.gz
	mv deps/libv8-$(RELEASE)/v8.tar.gz deps.tar.gz
	rm -fr deps/libv8-$(RELEASE)
	rm -f deps/$(RELEASE).tar.gz

v8src: ## download the v8 source for this release
	rm -fr deps
	mkdir -p deps
	curl -L -o deps/$(RELEASE).tar.gz https://github.com/just-js/v8src/archive/$(RELEASE).tar.gz
	tar -zxvf deps/$(RELEASE).tar.gz -C deps/
	tar -zxvf deps/v8src-$(RELEASE)/v8src.tar.gz
	mv deps/v8src-$(RELEASE)/v8src.tar.gz deps.tar.gz
	rm -fr deps/v8src-$(RELEASE)
	rm -f deps/$(RELEASE).tar.gz

runtime: builtins deps ## build dynamic runtime
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -rdynamic -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -lrt -o just

runtime-debug: builtins deps ## build debug version of runtime
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -rdynamic -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -lrt -o just

runtime-static: builtins deps ## build static version of runtime
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -static -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -lrt -o just

runtime-debug-static: builtins deps ## build static debug version of runtime
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -static -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -lrt -o just

clean: ## tidy up
	rm -f *.o
	rm -f just

cleanall: ## remove just and build deps
	rm -fr deps
	rm -f *.gz
	rm -fr modules
	rm -fr examples
	make clean

install: ## install
	mkdir -p ${INSTALL}
	cp -f just ${INSTALL}/just

uninstall: ## uninstall
	rm -f ${INSTALL}/just

.DEFAULT_GOAL := help
