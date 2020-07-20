#ifndef JUST_H
#define JUST_H

#include <v8.h>
#include <libplatform/libplatform.h>
#include <unistd.h>
#include <sys/epoll.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <sys/timerfd.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
#include <sys/un.h>
#include <netinet/tcp.h>
#include <sys/utsname.h>
#include <sys/signalfd.h>
#include <signal.h>
#include <dirent.h>
#include <sys/stat.h>
#include <v8-inspector.h>
#include <map>
#include <dlfcn.h>

namespace just {

#define JUST_MICROS_PER_SEC 1e6
#define JUST_VERSION "0.0.1"

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
using v8::ArrayBufferCreationMode;
using v8::HeapStatistics;
using v8::Float64Array;
using v8::HeapSpaceStatistics;
using v8::BigUint64Array;
using v8::Int32Array;
using v8::Exception;
using v8::Signature;
using v8::FunctionCallback;
using v8::ScriptOrModule;
using v8::Script;
using v8::MicrotasksScope;
using v8::Platform;
using v8::V8;
using v8::BackingStore;
using v8::BackingStoreDeleterCallback;
using v8::SharedArrayBuffer;
using v8::PromiseRejectMessage;
using v8::Promise;
using v8::PromiseRejectEvent;

typedef void    (*InitModulesCallback) (Isolate*, Local<ObjectTemplate>);
int CreateIsolate(int argc, char** argv, InitModulesCallback InitModules, 
  const char* js, unsigned int js_len, struct iovec* buf, int fd);

struct builtin {
  unsigned int size;
  const char* source;
};

static std::map<std::string, builtin*> builtins;

void just_builtins_add(const char* name, const char* source, 
  unsigned int size);
ssize_t process_memory_usage();
uint64_t hrtime();
void SET_METHOD(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, FunctionCallback callback);
void SET_MODULE(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, Local<ObjectTemplate> module);
void SET_VALUE(Isolate *isolate, Local<ObjectTemplate> 
  recv, const char *name, Local<Value> value);
Local<String> ReadFile(Isolate *isolate, const char *name);
MaybeLocal<Module> OnModuleInstantiate(Local<Context> context, 
  Local<String> specifier, Local<Module> referrer);
void PrintStackTrace(Isolate* isolate, const TryCatch& try_catch);
void Print(const FunctionCallbackInfo<Value> &args);
void Error(const FunctionCallbackInfo<Value> &args);

namespace vm {
void CompileScript(const FunctionCallbackInfo<Value> &args);
void RunModule(const FunctionCallbackInfo<Value> &args);
void Builtin(const FunctionCallbackInfo<Value> &args);
void RunScript(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace sys {
typedef void *(*register_plugin)();
using InitializerCallback = void (*)(Isolate* isolate, Local<ObjectTemplate> exports);

void WaitPID(const FunctionCallbackInfo<Value> &args);
void Spawn(const FunctionCallbackInfo<Value> &args);
void HRTime(const FunctionCallbackInfo<Value> &args);
void RunMicroTasks(const FunctionCallbackInfo<Value> &args);
void EnqueueMicrotask(const FunctionCallbackInfo<Value>& args);
void Exit(const FunctionCallbackInfo<Value>& args);
void Kill(const FunctionCallbackInfo<Value>& args);
void CPUUsage(const FunctionCallbackInfo<Value> &args);
void PID(const FunctionCallbackInfo<Value> &args);
void Errno(const FunctionCallbackInfo<Value> &args);
void StrError(const FunctionCallbackInfo<Value> &args);
void Sleep(const FunctionCallbackInfo<Value> &args);
void USleep(const FunctionCallbackInfo<Value> &args);
void NanoSleep(const FunctionCallbackInfo<Value> &args);
void MemoryUsage(const FunctionCallbackInfo<Value> &args);
void SharedMemoryUsage(const FunctionCallbackInfo<Value> &args);
void HeapObjectStatistics(const FunctionCallbackInfo<Value> &args);
void HeapCodeStatistics(const FunctionCallbackInfo<Value> &args);
void HeapSpaceUsage(const FunctionCallbackInfo<Value> &args);
void FreeMemory(void* buf, size_t length, void* data);
void Memcpy(const FunctionCallbackInfo<Value> &args);
void Calloc(const FunctionCallbackInfo<Value> &args);
void ReadString(const FunctionCallbackInfo<Value> &args);
void WriteString(const FunctionCallbackInfo<Value> &args);
void Fcntl(const FunctionCallbackInfo<Value> &args);
void Cwd(const FunctionCallbackInfo<Value> &args);
void Env(const FunctionCallbackInfo<Value> &args);
void Timer(const FunctionCallbackInfo<Value> &args);
void AvailablePages(const FunctionCallbackInfo<Value> &args);
void DLOpen(const FunctionCallbackInfo<Value> &args);
void DLSym(const FunctionCallbackInfo<Value> &args);
void Library(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace net {
void Socket(const FunctionCallbackInfo<Value> &args);
void SetSockOpt(const FunctionCallbackInfo<Value> &args);
void GetSockName(const FunctionCallbackInfo<Value> &args);
void GetPeerName(const FunctionCallbackInfo<Value> &args);
void Listen(const FunctionCallbackInfo<Value> &args);
void SocketPair(const FunctionCallbackInfo<Value> &args);
void Connect(const FunctionCallbackInfo<Value> &args);
void Bind(const FunctionCallbackInfo<Value> &args);
void Accept(const FunctionCallbackInfo<Value> &args);
void Read(const FunctionCallbackInfo<Value> &args);
void Recv(const FunctionCallbackInfo<Value> &args);
void Write(const FunctionCallbackInfo<Value> &args);
void Writev(const FunctionCallbackInfo<Value> &args);
void Send(const FunctionCallbackInfo<Value> &args);
void Close(const FunctionCallbackInfo<Value> &args);
void Shutdown(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace loop {
void EpollCtl(const FunctionCallbackInfo<Value> &args);
void EpollCreate(const FunctionCallbackInfo<Value> &args);
void EpollWait(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace fs {
void ReadFile(const FunctionCallbackInfo<Value> &args);
void Unlink(const FunctionCallbackInfo<Value> &args);
void Open(const FunctionCallbackInfo<Value> &args);
void Ioctl(const FunctionCallbackInfo<Value> &args);
void Fstat(const FunctionCallbackInfo<Value> &args);
void Rmdir(const FunctionCallbackInfo<Value> &args);
void Mkdir(const FunctionCallbackInfo<Value> &args);
void Readdir(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace versions {
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace tty {
void TtyName(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace encode {

const int8_t unbase64_table[256] =
  { -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -2, -1, -1, -2, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, 62, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, 63,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1
  };


const int8_t unhex_table[256] =
  { -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
     0,  1,  2,  3,  4,  5,  6,  7,  8,  9, -1, -1, -1, -1, -1, -1,
    -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1
  };

inline unsigned unhex(uint8_t x) {
  return unhex_table[x];
}

size_t hex_decode(char* buf,
                         size_t len,
                         const char* src,
                         const size_t srcLen);

inline size_t hex_encode(const char* src, size_t slen, char* dst, size_t dlen) {
  // We know how much we'll write, just make sure that there's space.
  dlen = slen * 2;
  for (uint32_t i = 0, k = 0; k < dlen; i += 1, k += 2) {
    static const char hex[] = "0123456789abcdef";
    uint8_t val = static_cast<uint8_t>(src[i]);
    dst[k + 0] = hex[val >> 4];
    dst[k + 1] = hex[val & 15];
  }

  return dlen;
}

inline int8_t unbase64(uint8_t x) {
  return unbase64_table[x];
}

inline constexpr size_t base64_encoded_size(size_t size) {
  return ((size + 2 - ((size + 2) % 3)) / 3 * 4);
}

// Doesn't check for padding at the end.  Can be 1-2 bytes over.
inline size_t base64_decoded_size_fast(size_t size) {
  size_t remainder = size % 4;

  size = (size / 4) * 3;
  if (remainder) {
    if (size == 0 && remainder == 1) {
      // special case: 1-byte input cannot be decoded
      size = 0;
    } else {
      // non-padded input, add 1 or 2 extra bytes
      size += 1 + (remainder == 3);
    }
  }

  return size;
}

size_t base64_decoded_size(const char* src, size_t size);
bool base64_decode_group_slow(char* dst, const size_t dstlen,
                              const char* src, const size_t srclen,
                              size_t* const i, size_t* const k);
size_t base64_decode_fast(char* dst, const size_t dstlen,
                          const char* src, const size_t srclen,
                          const size_t decoded_size);
size_t base64_decode(char* dst, const size_t dstlen,
                     const char* src, const size_t srclen);
size_t base64_encode(const char* src,
                            size_t slen,
                            char* dst,
                            size_t dlen);
void HexEncode(const FunctionCallbackInfo<Value> &args);
void Base64Encode(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace inspector {

using v8_inspector::V8InspectorClient;
using v8_inspector::V8Inspector;
using v8_inspector::StringBuffer;
using v8_inspector::StringView;
using v8_inspector::V8ContextInfo;
using v8_inspector::V8InspectorSession;
using v8_inspector::V8Inspector;
using v8::Global;

const int kInspectorClientIndex = 33;

class SymbolInfo {
  public:
  std::string name;
  std::string filename;
  size_t line = 0;
  size_t dis = 0;
};

class InspectorFrontend final : public V8Inspector::Channel {
 public:

  explicit InspectorFrontend(Local<Context> context) {
    isolate_ = context->GetIsolate();
    context_.Reset(isolate_, context);
  }

  ~InspectorFrontend() override = default;

 private:

  void sendResponse(int callId, std::unique_ptr<StringBuffer> message) override {
    Send(message->string());
  }

  void sendNotification(std::unique_ptr<StringBuffer> message) override {
    Send(message->string());
  }

  void flushProtocolNotifications() override {}

  void Send(const v8_inspector::StringView& string) {
    v8::Isolate::AllowJavascriptExecutionScope allow_script(isolate_);
    int length = static_cast<int>(string.length());
    Local<String> message = (string.is8Bit() ? 
      v8::String::NewFromOneByte(isolate_, 
      reinterpret_cast<const uint8_t*>(string.characters8()), 
      v8::NewStringType::kNormal, length) : 
      v8::String::NewFromTwoByte(isolate_, 
      reinterpret_cast<const uint16_t*>(string.characters16()), 
      v8::NewStringType::kNormal, length)).ToLocalChecked();
    Local<String> callback_name = v8::String::NewFromUtf8Literal(isolate_, 
      "receive", v8::NewStringType::kNormal);
    Local<Context> context = context_.Get(isolate_);
    Local<Value> callback = context->Global()->Get(context, 
      callback_name).ToLocalChecked();
    if (callback->IsFunction()) {
      v8::TryCatch try_catch(isolate_);
      Local<Value> args[] = {message};
      Local<Function>::Cast(callback)->Call(context, Undefined(isolate_), 1, 
        args).ToLocalChecked();
    }
  }

  Isolate* isolate_;
  Global<Context> context_;
};

class InspectorClient : public V8InspectorClient {
 public:
  InspectorClient(Local<Context> context, bool connect) {
    if (!connect) return;
    isolate_ = context->GetIsolate();
    channel_.reset(new InspectorFrontend(context));
    inspector_ = V8Inspector::create(isolate_, this);
    session_ = inspector_->connect(1, channel_.get(), StringView());
    context->SetAlignedPointerInEmbedderData(kInspectorClientIndex, this);
    inspector_->contextCreated(V8ContextInfo(context, kContextGroupId, 
      StringView()));

    Local<Value> function = FunctionTemplate::New(isolate_, 
      SendInspectorMessage)->GetFunction(context).ToLocalChecked();
    Local<String> function_name = String::NewFromUtf8Literal(isolate_, 
      "send", NewStringType::kNormal);
    context->Global()->Set(context, function_name, function).FromJust();
    context_.Reset(isolate_, context);
  }

  void runMessageLoopOnPause(int context_group_id) override {
    Local<String> callback_name = v8::String::NewFromUtf8Literal(isolate_, 
      "onRunMessageLoop", v8::NewStringType::kNormal);
    Local<Context> context = context_.Get(isolate_);
    Local<Value> callback = context->Global()->Get(context, 
      callback_name).ToLocalChecked();
    if (callback->IsFunction()) {
      v8::TryCatch try_catch(isolate_);
      Local<Value> args[1] = {Integer::New(isolate_, 0)};
      Local<Function>::Cast(callback)->Call(context, Undefined(isolate_), 0, 
        args).ToLocalChecked();
    }
  }

  void quitMessageLoopOnPause() override {
    Local<String> callback_name = v8::String::NewFromUtf8Literal(isolate_, 
      "onQuitMessageLoop", v8::NewStringType::kNormal);
    Local<Context> context = context_.Get(isolate_);
    Local<Value> callback = context->Global()->Get(context, 
      callback_name).ToLocalChecked();
    if (callback->IsFunction()) {
      v8::TryCatch try_catch(isolate_);
      Local<Value> args[1] = {Integer::New(isolate_, 0)};
      Local<Function>::Cast(callback)->Call(context, Undefined(isolate_), 0, 
        args).ToLocalChecked();
    }
  }

 private:

  static V8InspectorSession* GetSession(Local<Context> context) {
    InspectorClient* inspector_client = 
      static_cast<InspectorClient*>(
        context->GetAlignedPointerFromEmbedderData(kInspectorClientIndex));
    return inspector_client->session_.get();
  }

  Local<Context> ensureDefaultContextInGroup(int group_id) override {
    return context_.Get(isolate_);
  }

  static void SendInspectorMessage(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    HandleScope handle_scope(isolate);
    Local<Context> context = isolate->GetCurrentContext();
    args.GetReturnValue().Set(Undefined(isolate));
    Local<String> message = args[0]->ToString(context).ToLocalChecked();
    V8InspectorSession* session = InspectorClient::GetSession(context);
    int length = message->Length();
    std::unique_ptr<uint16_t[]> buffer(new uint16_t[length]);
    message->Write(isolate, buffer.get(), 0, length);
    StringView message_view(buffer.get(), length);
    session->dispatchProtocolMessage(message_view);
    args.GetReturnValue().Set(True(isolate));
  }

  static const int kContextGroupId = 1;
  std::unique_ptr<V8Inspector> inspector_;
  std::unique_ptr<V8InspectorSession> session_;
  std::unique_ptr<V8Inspector::Channel> channel_;
  Global<Context> context_;
  Isolate* isolate_;
};

void Enable(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace sha1 {

inline unsigned int rol(const unsigned int value, const unsigned int steps)
{
  return ((value << steps) | (value >> (32 - steps)));
}

inline void clearWBuffert(unsigned int* buffert)
{
  int pos = 0;
  for (pos = 16; --pos >= 0;)
  {
    buffert[pos] = 0;
  }
}

void innerHash(unsigned int* result, unsigned int* w);
void shacalc(const char* src, char* hash, int bytelength);
void Hash(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace signals {
void SignalFD(const FunctionCallbackInfo<Value> &args);
void SigEmptySet(const FunctionCallbackInfo<Value> &args);
void SigProcMask(const FunctionCallbackInfo<Value> &args);
void SigAddSet(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

namespace thread {

struct threadContext {
  int argc;
  char** argv;
  char* source;
  struct iovec buf;
  int fd;
  unsigned int source_len;
};

// TODO: implement thread cancellation and cleanup handlers: https://man7.org/linux/man-pages/man3/pthread_cancel.3.html

void* startThread(void *data);

void Spawn(const FunctionCallbackInfo<Value> &args);
void Join(const FunctionCallbackInfo<Value> &args);
void Self(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target, 
  InitModulesCallback InitModules);
}

namespace udp {
void RecvMsg(const FunctionCallbackInfo<Value> &args);
void SendMsg(const FunctionCallbackInfo<Value> &args);
void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

void PromiseRejectCallback(PromiseRejectMessage message);
void InitModules(Isolate* isolate, Local<ObjectTemplate> just);
int CreateIsolate(int argc, char** argv, InitModulesCallback InitModules, 
  const char* js, unsigned int js_len, struct iovec* buf, int fd);
int CreateIsolate(int argc, char** argv, InitModulesCallback InitModules);

}
#endif
