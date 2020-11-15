CC=g++
RELEASE=0.0.6
INSTALL=/usr/local/bin
LIBS=lib/loop.js lib/path.js lib/fs.js lib/process.js lib/build.js
MODULES=modules/net/net.o modules/epoll/epoll.o modules/fs/fs.o modules/sys/sys.o modules/vm/vm.o
TARGET=just
LIB=
EMBEDS=just.cc just.h Makefile main.cc
FLAGS=

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
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ library

module-debug: modules ## build a debug version of a shared library for a module
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ library-debug

builtins: deps just.cc just.h Makefile main.cc ## compile builtins with build dependencies
	ld -r -b binary ${EMBEDS} ${LIBS} -o builtins.o

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

main: modules builtins deps
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -rdynamic -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group -ldl -lrt ${LIB} -o ${TARGET}

main-static: modules builtins deps
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -static -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LIB} -o ${TARGET}

main-debug: modules builtins deps
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -rdynamic -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group -ldl -lrt ${LIB} -o ${TARGET}

runtime: modules builtins deps ## build dynamic runtime
	make MODULE=net module
	make MODULE=sys module
	make MODULE=epoll module
	make MODULE=vm module
	make MODULE=fs module
	make main

runtime-debug: modules builtins deps ## build debug version of runtime
	make MODULE=net module-debug
	make MODULE=sys module-debug
	make MODULE=epoll module-debug
	make MODULE=vm module-debug
	make MODULE=fs module-debug
	make main-debug

clean: ## tidy up
	rm -f *.o
	rm -f ${TARGET}

cleanall: ## remove just and build deps
	rm -fr deps
	rm -f *.gz
	rm -fr modules
	rm -fr examples
	make clean

install: ## install
	mkdir -p ${INSTALL}
	cp -f ${TARGET} ${INSTALL}/${TARGET}

uninstall: ## uninstall
	rm -f ${INSTALL}/${TARGET}

.DEFAULT_GOAL := help
