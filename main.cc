#include "just.h"
#include <signal.h>

extern char _binary_just_js_end[];
extern char _binary_just_js_start[];

int main(int argc, char** argv) {
  uint64_t start = just::hrtime();
  // set no buffering on stdio. this will only affect sys.print, sys.error and
  // internal v8 error messages that may be written to stdio
  setvbuf(stdout, nullptr, _IONBF, 0);
  setvbuf(stderr, nullptr, _IONBF, 0);
  signal(SIGPIPE, SIG_IGN);
  std::unique_ptr<v8::Platform> platform = v8::platform::NewDefaultPlatform();
  v8::V8::InitializePlatform(platform.get());
  v8::V8::Initialize();
  //v8::V8::EnableWebAssemblyTrapHandler(true);
  //v8::V8::SetFlagsFromString("--print-all-exceptions --abort-on-uncaught-exception --stack-trace-limit=10 --use-strict --disallow-code-generation-from-strings");
  //v8::V8::SetFlagsFromString("--abort-on-uncaught-exception --stack-trace-limit=10 --use-strict --disallow-code-generation-from-strings");
  v8::V8::SetFlagsFromString("--stack-trace-limit=10 --use-strict --disallow-code-generation-from-strings");
  v8::V8::SetFlagsFromCommandLine(&argc, argv, true);
  just::CreateIsolate(argc, argv, start, _binary_just_js_start, _binary_just_js_end - _binary_just_js_start);
  v8::V8::Dispose();
  v8::V8::ShutdownPlatform();
  platform.reset();
  return 0;
}
