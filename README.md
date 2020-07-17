# Just

A very small v8 javascript runtime for linux only

## Prerequisites
- modern x86_64 linux
- g++ or clang++
- make
- xxd
- docker (for building v8 lib)

## Build
```bash
make v8lib && make v8deps && make runtime && make install
```

## Summary
- 15 MB binary
- 9MB RSS on startup
- 14MB RSS
- Single C++ header file
