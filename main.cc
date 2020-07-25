#include "just.h"
#ifdef ZLIB
#include <zlib.h>
#endif

extern char _binary_lib_repl_js_end[];
extern char _binary_lib_repl_js_start[];
extern char _binary_lib_inspector_js_end[];
extern char _binary_lib_inspector_js_start[];
extern char _binary_lib_websocket_js_end[];
extern char _binary_lib_websocket_js_start[];
extern char _binary_lib_fs_js_end[];
extern char _binary_lib_fs_js_start[];
extern char _binary_just_js_end[];
extern char _binary_just_js_start[];
extern char _binary_lib_path_js_end[];
extern char _binary_lib_path_js_start[];
extern char _binary_lib_loop_js_end[];
extern char _binary_lib_loop_js_start[];
extern char _binary_lib_require_js_end[];
extern char _binary_lib_require_js_start[];
#ifdef BUILDER
extern char _binary_lib_build_js_end[];
extern char _binary_lib_build_js_start[];
#endif

namespace just {
namespace embedder {

void InitModules(Isolate* isolate, Local<ObjectTemplate> just) {
  just::InitModules(isolate, just);
#ifdef ZLIB
  just::zlib::Init(isolate, just);
#endif
  just_builtins_add("repl", _binary_lib_repl_js_start, _binary_lib_repl_js_end - _binary_lib_repl_js_start);
  just_builtins_add("inspector", _binary_lib_inspector_js_start, _binary_lib_inspector_js_end - _binary_lib_inspector_js_start);
  just_builtins_add("websocket", _binary_lib_websocket_js_start, _binary_lib_websocket_js_end - _binary_lib_websocket_js_start);
  just_builtins_add("fs", _binary_lib_fs_js_start, _binary_lib_fs_js_end - _binary_lib_fs_js_start);
  just_builtins_add("just", _binary_just_js_start, _binary_just_js_end - _binary_just_js_start);
  just_builtins_add("path", _binary_lib_path_js_start, _binary_lib_path_js_end - _binary_lib_path_js_start);
  just_builtins_add("loop", _binary_lib_loop_js_start, _binary_lib_loop_js_end - _binary_lib_loop_js_start);
  just_builtins_add("require", _binary_lib_require_js_start, _binary_lib_require_js_end - _binary_lib_require_js_start);
#ifdef BUILDER
  just_builtins_add("build", _binary_lib_build_js_start, _binary_lib_build_js_end - _binary_lib_build_js_start);
#endif
}
}
}

int main(int argc, char** argv) {
  setvbuf(stdout, nullptr, _IONBF, 0);
  setvbuf(stderr, nullptr, _IONBF, 0);
  sigset_t set;
  int r = 0;
  r = pthread_sigmask(SIG_SETMASK, NULL, &set);
  if (r != 0) return r;
  int i = 1;
  while (r == 0) {
    r = sigaddset(&set, i++);
  }
  r = pthread_sigmask(SIG_SETMASK, &set, NULL);
  if (r != 0) return r;
  r = sigemptyset(&set);
  if (r != 0) return r;
  r = pthread_sigmask(SIG_SETMASK, &set, NULL);
  if (r != 0) return r;
  signal(SIGPIPE, SIG_IGN);
  std::unique_ptr<v8::Platform> platform = v8::platform::NewDefaultPlatform();
  v8::V8::InitializePlatform(platform.get());
  v8::V8::Initialize();
  v8::V8::SetFlagsFromCommandLine(&argc, argv, true);
  just::CreateIsolate(argc, argv, just::embedder::InitModules);
  v8::V8::Dispose();
  v8::V8::ShutdownPlatform();
  platform.reset();
  return 0;
}
