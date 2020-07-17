# Just

A very small v8 javascript runtime for linux only

## Prerequisites
- builds on debian/ubuntu with precompiled libv8
- g++
- make
- curl (to download dependencies)

## Build
```bash
make runtime
```

## Summary
- 15 MB binary
- 9MB RSS on startup
- 14MB RSS stable
- Single C++ header file
