CC=g++
RELEASE=0.1.1
INSTALL=/usr/local/bin
LIBS=lib/loop.js lib/path.js lib/fs.js lib/process.js lib/build.js lib/repl.js lib/acorn.js lib/configure.js
MODULES=modules/net/net.o modules/epoll/epoll.o modules/fs/fs.o modules/sys/sys.o modules/vm/vm.o
TARGET=just
LIB=-ldl -lrt
EMBEDS=just.cc just.h Makefile main.cc lib/websocket.js lib/inspector.js just.js config.js
FLAGS=${CFLAGS}
LFLAG=${LFLAGS}
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
	rm -fr libs-$(RELEASE)
	curl -L -o libs.tar.gz https://github.com/just-js/libs/archive/$(RELEASE).tar.gz
	tar -zxvf libs.tar.gz
	cp -fr libs-$(RELEASE)/* lib/
	rm -fr libs-$(RELEASE)
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
	CFLAGS="$(FLAGS)" LFLAGS="${LFLAG}" JUST_HOME="$(JUST_HOME)" make -C modules/${MODULE}/ library

module-static: ## build a shared library for a module 
	CFLAGS="$(FLAGS)" LFLAGS="${LFLAG}" JUST_HOME="$(JUST_HOME)" make -C modules/${MODULE}/ FLAGS=-DSTATIC library

builtins.o: just.cc just.h Makefile main.cc ## compile builtins with build dependencies
	gcc builtins.S -c -o builtins.o

debugger:
	just build --clean --config debugger.js

main: modules builtins.o deps/v8/libv8_monolith.a
	$(CC) -c ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++17 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c ${FLAGS} -std=c++17 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
  ifeq (${TARGET}, just)
	$(CC) -g -rdynamic -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LFLAG} ${LIB} -o ${TARGET} -Wl,-rpath=/usr/local/lib/${TARGET}
	objcopy --only-keep-debug ${TARGET} ${TARGET}.debug
	strip --strip-debug --strip-unneeded ${TARGET}
  else
	$(CC) -g -rdynamic -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group ${LFLAG} ${LIB} -o ${TARGET}
  endif

main-static: modules builtins.o deps/v8/libv8_monolith.a
	$(CC) -c -fno-exceptions -ffunction-sections -fdata-sections ${FLAGS} -DJUST_VERSION='"${RELEASE}"' -std=c++17 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -fno-exceptions -ffunction-sections -fdata-sections ${FLAGS} -std=c++17 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
  ifeq (${TARGET}, just)
	$(CC) -s -static -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group -Wl,--gc-sections ${LFLAG} ${LIB} -o ${TARGET} -Wl,-rpath=/usr/local/lib/${TARGET}
	objcopy --only-keep-debug ${TARGET} ${TARGET}.debug
	strip --strip-debug --strip-unneeded ${TARGET}
  else
	$(CC) -s -static -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o ${MODULES} -Wl,--end-group -Wl,--gc-sections ${LFLAG} ${LIB} -o ${TARGET}
  endif

runtime: modules deps/v8/libv8_monolith.a ## build dynamic runtime
	make MODULE=net module
	make MODULE=sys module
	make MODULE=epoll module
	make MODULE=vm module
	make MODULE=fs module
	make main

runtime-static: modules deps/v8/libv8_monolith.a ## build static runtime
	make MODULE=net module-static
	make MODULE=sys module-static
	make MODULE=epoll module-static
	make MODULE=vm module-static
	make MODULE=fs module-static
	make main-static

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

install-debug: ## install debug symbols
	mkdir -p ${INSTALL}/.debug
	cp -f ${TARGET}.debug ${INSTALL}/.debug/${TARGET}.debug
	objcopy --add-gnu-debuglink=${INSTALL}/${TARGET} ${INSTALL}/.debug/${TARGET}.debug

uninstall: ## uninstall
	rm -f ${INSTALL}/${TARGET}
	rm -f ${INSTALL}/${TARGET}/.debug

.DEFAULT_GOAL := help
