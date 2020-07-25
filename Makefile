CC = g++

.PHONY: help clean

help:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_\.-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

builtins-builder: just.cc just.h Makefile main.cc just.js lib/*.js ## compile builtins js
	#rm -f deps.tar.gz
	tar -c deps | gzip -9 > deps.tar.gz
	ld -r -b binary deps.tar.gz just.cc just.h just.js Makefile main.cc lib/websocket.js lib/inspector.js lib/loop.js lib/require.js lib/path.js lib/repl.js lib/fs.js lib/build.js -o builtins.o
	#rm deps.tar.gz

builtins: just.js lib/*.js ## compile builtins js
	ld -r -b binary just.js lib/websocket.js lib/inspector.js lib/loop.js lib/require.js lib/path.js lib/repl.js lib/fs.js -o builtins.o

deps/v8/libv8_monolith.a: ## download v8 lib and headers
	mkdir -p deps
	curl -L -o deps/0.0.1.tar.gz https://github.com/just-js/libv8/archive/0.0.1.tar.gz
	tar -zxvf deps/0.0.1.tar.gz -C deps/
	tar -zxvf deps/libv8-0.0.1/v8.tar.gz
	rm -fr deps/libv8-0.0.1
	rm -f deps/0.0.1.tar.gz

runtime: builtins deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -rdynamic -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -o just

runtime-builder: builtins-builder deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -DSHARED -DBUILDER -DZLIB -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -DSHARED -DBUILDER -DZLIB -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -rdynamic -pie -flto -pthread -m64 -Wl,--start-group ../modules/zlib/zlib.a deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -o just

runtime-builder-static: builtins-builder deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -DBUILDER -DZLIB -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -Wno-unused-parameter just.cc
	$(CC) -c -DBUILDER -DZLIB -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -Wno-unused-parameter main.cc
	$(CC) -s -static -pthread -m64 -Wl,--start-group ../modules/zlib/zlib.a deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -o just

runtime-debug: builtins deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -DSHARED -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -rdynamic -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -o just

runtime-static: builtins deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -s -static -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -o just

runtime-debug-static: builtins deps/v8/libv8_monolith.a ## build runtime
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter just.cc
	$(CC) -c -std=c++11 -DV8_COMPRESS_POINTERS -I. -I./deps/v8/include -g -O3 -march=native -mtune=native -Wpedantic -Wall -Wextra -flto -Wno-unused-parameter main.cc
	$(CC) -static -pie -flto -pthread -m64 -Wl,--start-group deps/v8/libv8_monolith.a main.o just.o builtins.o -Wl,--end-group -ldl -o just

clean: ## tidy up
	rm -f *.o
	rm -f just

cleanall: ## remove just and build deps
	sudo rm -f /usr/local/bin/just
	rm -fr deps
	make clean

install: ## install
	sudo cp -f just /usr/local/bin/

.DEFAULT_GOAL := help
