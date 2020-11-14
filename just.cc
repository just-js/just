#include "just.h"

uint64_t just::hrtime() {
  struct timespec t;
  clock_t clock_id = CLOCK_MONOTONIC;
  if (clock_gettime(clock_id, &t))
    return 0;
  return t.tv_sec * (uint64_t) 1e9 + t.tv_nsec;
}

void just::SET_METHOD(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, FunctionCallback callback) {
  recv->Set(String::NewFromUtf8(isolate, name, 
    NewStringType::kNormal).ToLocalChecked(), 
    FunctionTemplate::New(isolate, callback));
}

void just::SET_MODULE(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, Local<ObjectTemplate> module) {
  recv->Set(String::NewFromUtf8(isolate, name, 
    NewStringType::kNormal).ToLocalChecked(), 
    module);
}

void just::SET_VALUE(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, Local<Value> value) {
  recv->Set(String::NewFromUtf8(isolate, name, 
    NewStringType::kNormal).ToLocalChecked(), 
    value);
}

void just::PrintStackTrace(Isolate* isolate, const TryCatch& try_catch) {
  HandleScope handleScope(isolate);
  Local<Value> exception = try_catch.Exception();
  Local<Message> message = try_catch.Message();
  Local<StackTrace> stack = message->GetStackTrace();
  String::Utf8Value ex(isolate, exception);
  Local<Value> scriptName = message->GetScriptResourceName();
  String::Utf8Value scriptname(isolate, scriptName);
  Local<Context> context = isolate->GetCurrentContext();
  int linenum = message->GetLineNumber(context).FromJust();
  fprintf(stderr, "%s in %s on line %i\n", *ex, *scriptname, linenum);
  if (stack.IsEmpty()) return;
  for (int i = 0; i < stack->GetFrameCount(); i++) {
    Local<StackFrame> stack_frame = stack->GetFrame(isolate, i);
    Local<String> functionName = stack_frame->GetFunctionName();
    Local<String> scriptName = stack_frame->GetScriptName();
    String::Utf8Value fn_name_s(isolate, functionName);
    String::Utf8Value script_name(isolate, scriptName);
    const int line_number = stack_frame->GetLineNumber();
    const int column = stack_frame->GetColumn();
    if (stack_frame->IsEval()) {
      if (stack_frame->GetScriptId() == Message::kNoScriptIdInfo) {
        fprintf(stderr, "    at [eval]:%i:%i\n", line_number, column);
      } else {
        fprintf(stderr, "    at [eval] (%s:%i:%i)\n", *script_name,
          line_number, column);
      }
      break;
    }
    if (fn_name_s.length() == 0) {
      fprintf(stderr, "    at %s:%i:%i\n", *script_name, line_number, column);
    } else {
      fprintf(stderr, "    at %s (%s:%i:%i)\n", *fn_name_s, *script_name,
        line_number, column);
    }
  }
  fflush(stderr);
}

void just::Print(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  if (args[0].IsEmpty()) return;
  String::Utf8Value str(args.GetIsolate(), args[0]);
  int endline = 1;
  if (args.Length() > 1) {
    endline = static_cast<int>(args[1]->BooleanValue(isolate));
  }
  const char *cstr = *str;
  if (endline == 1) {
    fprintf(stdout, "%s\n", cstr);
  } else {
    fprintf(stdout, "%s", cstr);
  }
}

void just::Error(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  if (args[0].IsEmpty()) return;
  String::Utf8Value str(args.GetIsolate(), args[0]);
  int endline = 1;
  if (args.Length() > 1) {
    endline = static_cast<int>(args[1]->BooleanValue(isolate));
  }
  const char *cstr = *str;
  if (endline == 1) {
    fprintf(stderr, "%s\n", cstr);
  } else {
    fprintf(stderr, "%s", cstr);
  }
}

v8::MaybeLocal<v8::Module> just::OnModuleInstantiate(Local<Context> context, 
  Local<String> specifier, Local<Module> referrer) {
  HandleScope handle_scope(context->GetIsolate());
  return MaybeLocal<Module>();
}

void just::PromiseRejectCallback(PromiseRejectMessage message) {
  Local<Promise> promise = message.GetPromise();
  Isolate* isolate = promise->GetIsolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  PromiseRejectEvent event = message.GetEvent();
  const unsigned int argc = 3;
  Local<Object> globalInstance = context->Global();
  TryCatch try_catch(isolate);
  Local<Value> func = globalInstance->Get(context, 
    String::NewFromUtf8Literal(isolate, "onUnhandledRejection", 
      NewStringType::kNormal)).ToLocalChecked();
  if (try_catch.HasCaught()) {
    fprintf(stderr, "PromiseRejectCallback: Get\n");
    return;
  }
  Local<Function> onUnhandledRejection = Local<Function>::Cast(func);
  if (try_catch.HasCaught()) {
    fprintf(stderr, "PromiseRejectCallback: Cast\n");
    return;
  }
  Local<Value> value = message.GetValue();
  if (value.IsEmpty()) value = Undefined(isolate);
  Local<Value> argv[argc] = { promise, value, Integer::New(isolate, event) };
  MaybeLocal<Value> result = onUnhandledRejection->Call(context, globalInstance, 3, argv);
  if (result.IsEmpty() && try_catch.HasCaught()) {
    fprintf(stderr, "PromiseRejectCallback: Call\n");
  }
}

// called when we need to free the memory after the wrapping arraybuffer is gc'd
void just::FreeMemory(void* buf, size_t length, void* data) {
  free(buf);
  // todo: what do we do with *data?
}

// called when wrapping arraybuffer is gc'd and we don't want to free the underlying memory
void just::UnwrapMemory(void* buf, size_t length, void* data) {

}

// called when wrapping arraybuffer is gc'd and the underlying memory is mmaped
void just::FreeMappedMemory(void* buf, size_t length, void* data) {
  munmap(buf, length);
}

int just::CreateIsolate(int argc, char** argv, 
  uint64_t start, const char* main_src, unsigned int main_len, 
  const char* js, unsigned int js_len, struct iovec* buf, int fd) {
  Isolate::CreateParams create_params;
  int statusCode = 0;
  create_params.array_buffer_allocator = 
    ArrayBuffer::Allocator::NewDefaultAllocator();
  Isolate *isolate = Isolate::New(create_params);
  {
    Isolate::Scope isolate_scope(isolate);
    HandleScope handle_scope(isolate);
    isolate->SetCaptureStackTraceForUncaughtExceptions(true, 1000, 
      StackTrace::kDetailed);

    Local<ObjectTemplate> global = ObjectTemplate::New(isolate);

    Local<ObjectTemplate> just = ObjectTemplate::New(isolate);
    SET_METHOD(isolate, just, "print", just::Print);
    SET_METHOD(isolate, just, "error", just::Error);
    SET_VALUE(isolate, just, "START", BigInt::New(isolate, start));

    just::Init(isolate, just);

    global->Set(String::NewFromUtf8Literal(isolate, "just", 
      NewStringType::kNormal), just);

    Local<Context> context = Context::New(isolate, NULL, global);
    Context::Scope context_scope(context);
    context->AllowCodeGenerationFromStrings(false);
    isolate->SetPromiseRejectCallback(PromiseRejectCallback);
    Local<Array> arguments = Array::New(isolate);
    for (int i = 0; i < argc; i++) {
      arguments->Set(context, i, String::NewFromUtf8(isolate, argv[i], 
        NewStringType::kNormal, strlen(argv[i])).ToLocalChecked()).Check();
    }
    Local<Object> globalInstance = context->Global();
    globalInstance->Set(context, String::NewFromUtf8Literal(isolate, 
      "global", 
      NewStringType::kNormal), globalInstance).Check();
    Local<Value> obj = globalInstance->Get(context, 
      String::NewFromUtf8Literal(
        isolate, "just", 
        NewStringType::kNormal)).ToLocalChecked();
    Local<Object> justInstance = Local<Object>::Cast(obj);
    if (buf != NULL) {
      std::unique_ptr<BackingStore> backing =
          SharedArrayBuffer::NewBackingStore(buf->iov_base, buf->iov_len, 
          just::FreeMemory, nullptr);
      Local<SharedArrayBuffer> ab =
          SharedArrayBuffer::New(isolate, std::move(backing));
      justInstance->Set(context, String::NewFromUtf8Literal(isolate, 
        "buffer", NewStringType::kNormal), ab).Check();
    }
    if (fd != 0) {
      justInstance->Set(context, String::NewFromUtf8Literal(isolate, "fd", 
        NewStringType::kNormal), 
        Integer::New(isolate, fd)).Check();
    }
    justInstance->Set(context, String::NewFromUtf8Literal(isolate, "args", 
      NewStringType::kNormal), arguments).Check();
    if (js_len > 0) {
      justInstance->Set(context, String::NewFromUtf8Literal(isolate, 
        "workerSource", NewStringType::kNormal), 
        String::NewFromUtf8(isolate, js, NewStringType::kNormal, 
        js_len).ToLocalChecked()).Check();
    }
    TryCatch try_catch(isolate);
    ScriptOrigin baseorigin(
      String::NewFromUtf8Literal(isolate, "just.js", 
      NewStringType::kNormal), // resource name
      Integer::New(isolate, 0), // line offset
      Integer::New(isolate, 0),  // column offset
      False(isolate), // is shared cross-origin
      Local<Integer>(),  // script id
      Local<Value>(), // source map url
      False(isolate), // is opaque
      False(isolate), // is wasm
      True(isolate)  // is module
    );
    Local<Module> module;
    Local<String> base;
    base = String::NewFromUtf8(isolate, main_src, NewStringType::kNormal, 
      main_len).ToLocalChecked();
    ScriptCompiler::Source basescript(base, baseorigin);
    if (!ScriptCompiler::CompileModule(isolate, &basescript).ToLocal(&module)) {
      PrintStackTrace(isolate, try_catch);
      return 1;
    }
    Maybe<bool> ok = module->InstantiateModule(context, 
      NULL);
    if (!ok.ToChecked()) {
      just::PrintStackTrace(isolate, try_catch);
      return 1;
    }
    MaybeLocal<Value> result = module->Evaluate(context);
    if (result.IsEmpty()) {
      if (try_catch.HasCaught()) {
        just::PrintStackTrace(isolate, try_catch);
        return 2;
      }
    }
    Local<Value> func = globalInstance->Get(context, 
      String::NewFromUtf8Literal(isolate, "onExit", 
        NewStringType::kNormal)).ToLocalChecked();
    if (func->IsFunction()) {
      Local<Function> onExit = Local<Function>::Cast(func);
      Local<Value> argv[1] = {Integer::New(isolate, 0)};
      MaybeLocal<Value> result = onExit->Call(context, globalInstance, 0, argv);
      if (!result.IsEmpty()) {
        statusCode = result.ToLocalChecked()->Uint32Value(context).ToChecked();
      }
      if (try_catch.HasCaught() && !try_catch.HasTerminated()) {
        just::PrintStackTrace(isolate, try_catch);
        return 2;
      }
      statusCode = result.ToLocalChecked()->Uint32Value(context).ToChecked();
    }
  }
  isolate->ContextDisposedNotification();
  isolate->LowMemoryNotification();
  isolate->ClearKeptObjects();
  bool stop = false;
  while(!stop) {
    stop = isolate->IdleNotificationDeadline(1);  
  }
  isolate->Dispose();
  delete create_params.array_buffer_allocator;
  isolate = nullptr;
  return statusCode;
}

int just::CreateIsolate(int argc, char** argv, uint64_t start, const char* main_src, unsigned int main_len) {
  return CreateIsolate(argc, argv, start, main_src, main_len, NULL, 0, NULL, 0);
}

void just::DLOpen(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  int argc = args.Length();
  int mode = RTLD_LAZY;
  void* handle;
  if (argc > 1) {
    mode = args[1]->Int32Value(context).ToChecked();
  }
  if (argc > 0) {
    String::Utf8Value path(isolate, args[0]);
    handle = dlopen(*path, mode);
    //if (handle == NULL) handle = dlopen(NULL, mode);
  } else {
    handle = dlopen(NULL, mode);
  }
  if (handle == NULL) {
    args.GetReturnValue().Set(v8::Null(isolate));
    return;
  }
  args.GetReturnValue().Set(BigInt::New(isolate, (uint64_t)handle));
}

void just::DLSym(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<BigInt> address64 = Local<BigInt>::Cast(args[0]);
  // todo: this is very dangerous. need to have a think on how best to do this
  void* handle = reinterpret_cast<void*>(address64->Uint64Value());
  String::Utf8Value name(isolate, args[1]);
  void* ptr = dlsym(handle, *name);
  if (ptr == NULL) {
    args.GetReturnValue().Set(v8::Null(isolate));
    return;
  }
  args.GetReturnValue().Set(BigInt::New(isolate, (uint64_t)ptr));
}

void just::DLError(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  char* err = dlerror();
  if (err == NULL) {
    args.GetReturnValue().Set(v8::Null(isolate));
    return;
  }
  args.GetReturnValue().Set(String::NewFromUtf8(isolate, err, 
    NewStringType::kNormal).ToLocalChecked());
}

void just::DLClose(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<BigInt> address64 = Local<BigInt>::Cast(args[0]);
  void* handle = reinterpret_cast<void*>(address64->Uint64Value());
  int r = dlclose(handle);
  args.GetReturnValue().Set(Integer::New(isolate, r));
}

void just::Library(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  HandleScope handleScope(isolate);
  Local<Context> context = isolate->GetCurrentContext();
  Local<BigInt> address64 = Local<BigInt>::Cast(args[0]);
  void* ptr = reinterpret_cast<void*>(address64->Uint64Value());
  register_plugin _init = reinterpret_cast<register_plugin>(ptr);
  auto _register = reinterpret_cast<InitializerCallback>(_init());
  Local<ObjectTemplate> exports = ObjectTemplate::New(isolate);
  _register(isolate, exports);
  args.GetReturnValue().Set(exports->NewInstance(context).ToLocalChecked());
}

void just::Init(Isolate* isolate, Local<ObjectTemplate> target) {
  Local<ObjectTemplate> versions = ObjectTemplate::New(isolate);
  SET_VALUE(isolate, versions, "just", String::NewFromUtf8Literal(isolate, 
    JUST_VERSION));
  SET_VALUE(isolate, versions, "v8", String::NewFromUtf8(isolate, 
    v8::V8::GetVersion()).ToLocalChecked());
  Local<ObjectTemplate> kernel = ObjectTemplate::New(isolate);
  utsname kernel_rec;
  int rc = uname(&kernel_rec);
  if (rc == 0) {
    kernel->Set(String::NewFromUtf8Literal(isolate, "os", 
      NewStringType::kNormal), String::NewFromUtf8(isolate, 
      kernel_rec.sysname).ToLocalChecked());
    kernel->Set(String::NewFromUtf8Literal(isolate, "release", 
      NewStringType::kNormal), String::NewFromUtf8(isolate, 
      kernel_rec.release).ToLocalChecked());
    kernel->Set(String::NewFromUtf8Literal(isolate, "version", 
      NewStringType::kNormal), String::NewFromUtf8(isolate, 
      kernel_rec.version).ToLocalChecked());
  }
  versions->Set(String::NewFromUtf8Literal(isolate, "kernel", 
    NewStringType::kNormal), kernel);
  Local<ObjectTemplate> sys = ObjectTemplate::New(isolate);
  SET_METHOD(isolate, sys, "dlopen", DLOpen);
  SET_METHOD(isolate, sys, "dlsym", DLSym);
  SET_METHOD(isolate, sys, "dlerror", DLError);
  SET_METHOD(isolate, sys, "dlclose", DLClose);
  SET_METHOD(isolate, sys, "library", Library);
  SET_VALUE(isolate, sys, "RTLD_LAZY", Integer::New(isolate, RTLD_LAZY));
  SET_VALUE(isolate, sys, "RTLD_NOW", Integer::New(isolate, RTLD_NOW));
  SET_MODULE(isolate, target, "sys", sys);
  SET_MODULE(isolate, target, "versions", versions);
}
