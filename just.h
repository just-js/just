#ifndef JUST_H
#define JUST_H

#include <v8.h>
#include <libplatform/libplatform.h>
#include <map>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/utsname.h>

namespace just {

#define JUST_MICROS_PER_SEC 1e6

using v8::String;
using v8::NewStringType;
using v8::Local;
using v8::Isolate;
using v8::Context;
using v8::ObjectTemplate;
using v8::FunctionCallbackInfo;
using v8::Function;
using v8::Object;
using v8::Value;
using v8::MaybeLocal;
using v8::Module;
using v8::TryCatch;
using v8::Message;
using v8::StackTrace;
using v8::StackFrame;
using v8::HandleScope;
using v8::Integer;
using v8::BigInt;
using v8::FunctionTemplate;
using v8::ScriptOrigin;
using v8::True;
using v8::False;
using v8::ScriptCompiler;
using v8::ArrayBuffer;
using v8::Array;
using v8::Maybe;
using v8::HeapStatistics;
using v8::Float64Array;
using v8::HeapSpaceStatistics;
using v8::BigUint64Array;
using v8::Int32Array;
using v8::Exception;
using v8::FunctionCallback;
using v8::Script;
using v8::Platform;
using v8::V8;
using v8::BackingStore;
using v8::SharedArrayBuffer;
using v8::PromiseRejectMessage;
using v8::Promise;
using v8::PromiseRejectEvent;
using v8::Uint32Array;
using v8::BigUint64Array;

ssize_t process_memory_usage();

typedef void *(*register_plugin)();
struct builtin {
  unsigned int size;
  const char* source;
};
extern std::map<std::string, builtin*> builtins;
extern std::map<std::string, register_plugin> modules;
void builtins_add (const char* name, const char* source, 
  unsigned int size);

using InitializerCallback = void (*)(Isolate* isolate, 
  Local<ObjectTemplate> exports);
MaybeLocal<Module> OnModuleInstantiate(Local<Context> context, 
  Local<String> specifier, Local<Module> referrer);

int CreateIsolate(int argc, char** argv, 
  const char* main, unsigned int main_len,
  const char* js, unsigned int js_len, struct iovec* buf, int fd);
int CreateIsolate(int argc, char** argv,
  const char* main, unsigned int main_len);
void PrintStackTrace(Isolate* isolate, const TryCatch& try_catch);
void PromiseRejectCallback(PromiseRejectMessage message);
void FreeMemory(void* buf, size_t length, void* data);

void SET_METHOD(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, FunctionCallback callback);
void SET_MODULE(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, Local<ObjectTemplate> module);
void SET_VALUE(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, Local<Value> value);

void Print(const FunctionCallbackInfo<Value> &args);
void Error(const FunctionCallbackInfo<Value> &args);
void Load(const FunctionCallbackInfo<Value> &args);
void Sleep(const FunctionCallbackInfo<Value> &args);
void PID(const FunctionCallbackInfo<Value> &args);
void Exit(const FunctionCallbackInfo<Value> &args);
void Chdir(const FunctionCallbackInfo<Value> &args);
void Builtin(const FunctionCallbackInfo<Value> &args);
void MemoryUsage(const FunctionCallbackInfo<Value> &args);
void Builtins(const FunctionCallbackInfo<Value> &args);
void Modules(const FunctionCallbackInfo<Value> &args);

/**
  * Setup the target ObjectTemplate with 'just' property which holds the
  * basic functions in the runtime core
  * .version
  * .version.just
  * .version.v8
  * .version.kernel
  * .version.kernel.os
  * .version.kernel.release
  * .version.kernel.version
  * .print()
  * .error()
  * .load()
  * .pid()
  * .sleep()
  * .exit()
  * .chdir()
  * .builtin()
  * .memoryUsage()
**/
void Init(Isolate* isolate, Local<ObjectTemplate> target);

}
#endif
