#include "just.h"

namespace just {
namespace embedder {

void InitModules(Isolate* isolate, Local<ObjectTemplate> just) {
  just::InitModules(isolate, just);
  just_builtins_add("repl", lib_repl_js, lib_repl_js_len);
  just_builtins_add("inspector", lib_inspector_js, lib_inspector_js_len);
  just_builtins_add("websocket", lib_websocket_js, lib_websocket_js_len);
  just_builtins_add("fs", lib_fs_js, lib_fs_js_len);
  just_builtins_add("just", just_js, just_js_len);
  just_builtins_add("path", lib_path_js, lib_path_js_len);
  just_builtins_add("loop", lib_loop_js, lib_loop_js_len);
  just_builtins_add("require", lib_require_js, lib_require_js_len);
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
