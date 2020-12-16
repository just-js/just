CC=g++
RELEASE=0.0.7
INSTALL=/usr/local/bin
LIBS=lib/loop.js lib/path.js lib/fs.js lib/process.js lib/build.js lib/repl.js
MODULES=modules/net/net.o modules/epoll/epoll.o modules/fs/fs.o modules/sys/sys.o modules/vm/vm.o
TARGET=just
LIB=-ldl
EMBEDS=just.cc just.h Makefile main.cc lib/websocket.js lib/inspector.js just.js config.js
FLAGS=
JUST_HOME=$(shell pwd)

.PHONY: help clean

help:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_\.-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

modules: ## download the modules for this release
	rm -fr modules
	curl -L -o modules.tar.gz https://github.com/just-js/modules/archive/$(RELEASE).tar.gz
	tar -zxvf modules.tar.gz
	mv modules-$(RELEASE) modules
	rm -f modules.tar.gz

libs: ## download the libs for this release
	rm -fr libs
	curl -L -o libs.tar.gz https://github.com/just-js/libs/archive/$(RELEASE).tar.gz
	tar -zxvf libs.tar.gz
	mv libs-$(RELEASE) libs
	rm -f libs.tar.gz

examples: ## download the examples for this release
	rm -fr examples
	curl -L -o examples.tar.gz https://github.com/just-js/examples/archive/$(RELEASE).tar.gz
	tar -zxvf examples.tar.gz
	mv examples-$(RELEASE) examples
	rm -f examples.tar.gz

v8headers: ## download v8 headers
	curl -L -o v8headers-$(RELEASE).tar.gz https://raw.githubusercontent.com/just-js/v8headers/$(RELEASE)/v8.tar.gz
	tar -zxvf v8headers-$(RELEASE).tar.gz
	rm -f v8headers-$(RELEASE).tar.gz

deps/v8/libv8_monolith.a: ## download v8 monolithic library for linking
ifeq (,$(wildcard /etc/alpine-release))
	curl -L -o v8lib-$(RELEASE).tar.gz https://raw.githubusercontent.com/just-js/libv8/$(RELEASE)/v8.tar.gz
else
	curl -L -o v8lib-$(RELEASE).tar.gz https://raw.githubusercontent.com/just-js/libv8/$(RELEASE)/v8-alpine.tar.gz
endif
	tar -zxvf v8lib-$(RELEASE).tar.gz
	rm -f v8lib-$(RELEASE).tar.gz

v8src: ## download the full v8 source for this release
	curl -L -o v8src-$(RELEASE).tar.gz https://raw.githubusercontent.com/just-js/v8src/$(RELEASE)/v8src.tar.gz
	tar -zxvf v8src-$(RELEASE).tar.gz
	rm -f v8src-$(RELEASE).tar.gz

module: ## build a shared library for a module 
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ library

module-debug: ## build a debug version of a shared library for a module
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ library-debug

module-static: ## build a shared library for a module 
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ FLAGS=-DSTATIC library

module-static-debug: ## build a shared library for a module 
	JUST_HOME=$(JUST_HOME) make -C modules/${MODULE}/ FLAGS=-DSTATIC library-debug

builtins.o: just.cc just.h Makefile main.cc ## compile builtins with build dependencies
	gcc builtins.S -c -o builtins.o

main: modules builtins.o deps/v8/libv8_monolith.a
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -rdynamic -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LIB} -o ${TARGET}

main-debug: modules builtins.o deps/v8/libv8_monolith.a
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -g -rdynamic -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LIB} -o ${TARGET}

main-static: modules builtins.o deps/v8/libv8_monolith.a
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -static -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LIB} -o ${TARGET}

main-static-debug: modules builtins.o deps/v8/libv8_monolith.a
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -g -static -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LIB} -o ${TARGET}

runtime: modules deps/v8/libv8_monolith.a ## build dynamic runtime
	make MODULE=net module
	make MODULE=sys module
	make MODULE=epoll module
	make MODULE=vm module
	make MODULE=fs module
	make main

runtime-debug: modules deps/v8/libv8_monolith.a ## build debug version of runtime
	make MODULE=net module-debug
	make MODULE=sys module-debug
	make MODULE=epoll module-debug
	make MODULE=vm module-debug
	make MODULE=fs module-debug
	make main-debug

runtime-static: modules deps/v8/libv8_monolith.a ## build dynamic runtime
	make MODULE=net module
	make MODULE=sys module-static
	make MODULE=epoll module
	make MODULE=vm module
	make MODULE=fs module
	make main-static

runtime-static-debug: modules deps/v8/libv8_monolith.a ## build debug version of runtime
	make MODULE=net module-debug
	make MODULE=sys module-static-debug
	make MODULE=epoll module-debug
	make MODULE=vm module-debug
	make MODULE=fs module-debug
	make main-static-debug

clean: ## tidy up
	rm -f *.o
	rm -f ${TARGET}

cleanall: ## remove just and build deps
	rm -fr deps
	rm -f *.gz
	rm -fr modules
	rm -fr libs
	rm -fr examples
	make clean

install: ## install
	mkdir -p ${INSTALL}
	cp -f ${TARGET} ${INSTALL}/${TARGET}

uninstall: ## uninstall
	rm -f ${INSTALL}/${TARGET}

.DEFAULT_GOAL := help
