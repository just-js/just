#include "just.h"

namespace just {
namespace embedder {

void InitModules(Isolate* isolate, Local<ObjectTemplate> just) {
  just::InitModules(isolate, just);
  just_builtins_add("repl", _binary_lib_repl_js_start, _binary_lib_repl_js_end - _binary_lib_repl_js_start);
  just_builtins_add("inspector", _binary_lib_inspector_js_start, _binary_lib_inspector_js_end - _binary_lib_inspector_js_start);
  just_builtins_add("websocket", _binary_lib_websocket_js_start, _binary_lib_websocket_js_end - _binary_lib_websocket_js_start);
  just_builtins_add("fs", _binary_lib_fs_js_start, _binary_lib_fs_js_end - _binary_lib_fs_js_start);
  just_builtins_add("just", _binary_just_js_start, _binary_just_js_end - _binary_just_js_start);
  just_builtins_add("path", _binary_lib_path_js_start, _binary_lib_path_js_end - _binary_lib_path_js_start);
  just_builtins_add("loop", _binary_lib_loop_js_start, _binary_lib_loop_js_end - _binary_lib_loop_js_start);
  just_builtins_add("require", _binary_lib_require_js_start, _binary_lib_require_js_end - _binary_lib_require_js_start);
}

int Start(int argc, char** argv) {
  setvbuf(stdout, nullptr, _IONBF, 0);
  setvbuf(stderr, nullptr, _IONBF, 0);
  sigset_t set;
  int r = 0;
  r = pthread_sigmask(SIG_SETMASK, NULL, &set);
  if (r != 0) return r;
  for (int i = 1; i < 64; i++) {
    r = sigaddset(&set, i);
    if (r != 0) return r;
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
  just::CreateIsolate(argc, argv, InitModules);
  v8::V8::Dispose();
  v8::V8::ShutdownPlatform();
  platform.reset();
  return 0;
}
}
}

int main(int argc, char** argv) {
  return just::embedder::Start(argc, argv);
}
