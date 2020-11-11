#include "just.h"

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
extern char _binary_lib_build_js_end[];
extern char _binary_lib_build_js_start[];

namespace just {
namespace embedder {

void InitModules(Isolate* isolate, Local<ObjectTemplate> just) {
  just::InitModules(isolate, just);
  // todo: this could be done from JS
  just_builtins_add("repl", _binary_lib_repl_js_start, _binary_lib_repl_js_end - _binary_lib_repl_js_start);
  just_builtins_add("inspector", _binary_lib_inspector_js_start, _binary_lib_inspector_js_end - _binary_lib_inspector_js_start);
  just_builtins_add("websocket", _binary_lib_websocket_js_start, _binary_lib_websocket_js_end - _binary_lib_websocket_js_start);
  just_builtins_add("fs", _binary_lib_fs_js_start, _binary_lib_fs_js_end - _binary_lib_fs_js_start);
  just_builtins_add("just", _binary_just_js_start, _binary_just_js_end - _binary_just_js_start);
  just_builtins_add("path", _binary_lib_path_js_start, _binary_lib_path_js_end - _binary_lib_path_js_start);
  just_builtins_add("loop", _binary_lib_loop_js_start, _binary_lib_loop_js_end - _binary_lib_loop_js_start);
  just_builtins_add("require", _binary_lib_require_js_start, _binary_lib_require_js_end - _binary_lib_require_js_start);
  just_builtins_add("build", _binary_lib_build_js_start, _binary_lib_build_js_end - _binary_lib_build_js_start);
}
}
}

int main(int argc, char** argv) {
  // set no buffering on stdio. this will only affect sys.print, sys.error and
  // internal v8 error messages that may be written to stdio
  setvbuf(stdout, nullptr, _IONBF, 0);
  setvbuf(stderr, nullptr, _IONBF, 0);
  //signal(SIGPIPE, SIG_IGN);
  std::unique_ptr<v8::Platform> platform = v8::platform::NewDefaultPlatform();
  v8::V8::InitializePlatform(platform.get());
  v8::V8::Initialize();
  v8::V8::EnableWebAssemblyTrapHandler(true);
  v8::V8::SetFlagsFromCommandLine(&argc, argv, true);
  just::CreateIsolate(argc, argv, just::embedder::InitModules);
  v8::V8::Dispose();
  v8::V8::ShutdownPlatform();
  platform.reset();
  return 0;
}
