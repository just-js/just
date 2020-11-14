function wrapMemoryUsage (memoryUsage) {
  const mem = new Float64Array(16)
  return () => {
    memoryUsage(mem)
    return {
      rss: mem[0],
      total_heap_size: mem[1],
      used_heap_size: mem[2],
      external_memory: mem[3],
      heap_size_limit: mem[5],
      total_available_size: mem[10],
      total_heap_size_executable: mem[11],
      total_physical_size: mem[12]
    }
  }
}

function wrapCpuUsage (cpuUsage) {
  const cpu = new Uint32Array(4)
  const result = { elapsed: 0, user: 0, system: 0, cuser: 0, csystem: 0 }
  const clock = cpuUsage(cpu)
  const last = { user: cpu[0], system: cpu[1], cuser: cpu[2], csystem: cpu[3], clock }
  return () => {
    const clock = cpuUsage(cpu)
    result.elapsed = clock - last.clock
    result.user = cpu[0] - last.user
    result.system = cpu[1] - last.system
    result.cuser = cpu[2] - last.cuser
    result.csystem = cpu[3] - last.csystem
    last.user = cpu[0]
    last.system = cpu[1]
    last.cuser = cpu[2]
    last.csystem = cpu[3]
    last.clock = clock
    return result
  }
}

function wrapgetrUsage (getrUsage) {
  const res = new Float64Array(16)
  return () => {
    getrUsage(res)
    return {
      user: res[0],
      system: res[1],
      maxrss: res[2],
      ixrss: res[3],
      idrss: res[4],
      isrss: res[5],
      minflt: res[6],
      majflt: res[7],
      nswap: res[8],
      inblock: res[9],
      outblock: res[10],
      msgsnd: res[11],
      msgrcv: res[12],
      ssignals: res[13],
      nvcsw: res[14],
      nivcsw: res[15]
    }
  }
}

function wrapHeapUsage (heapUsage) {
  const heap = (new Array(16)).fill(0).map(v => new Float64Array(4))
  return () => {
    const usage = heapUsage(heap)
    usage.spaces = Object.keys(usage.heapSpaces).map(k => {
      const space = usage.heapSpaces[k]
      return {
        name: k,
        size: space[2],
        used: space[3],
        available: space[1],
        physicalSize: space[0]
      }
    })
    delete usage.heapSpaces
    return usage
  }
}

function wrapHrtime (hrtime) {
  const time = new BigUint64Array(1)
  return () => {
    hrtime(time)
    return time[0]
  }
}

function wrapEnv (env) {
  return () => {
    return env()
      .map(entry => entry.split('='))
      .reduce((e, pair) => { e[pair[0]] = pair[1]; return e }, {})
  }
}

function wrapRequire (handle, cache = {}) {
  function loadLibrary (path, name) {
    if (cache[path]) return cache[path]
    const handle = just.sys.dlopen(path, just.sys.RTLD_LAZY)
    if (!handle) return
    const ptr = just.sys.dlsym(handle, `_register_${name}`)
    if (!ptr) return
    const lib = just.sys.library(ptr)
    just.sys.dlclose(handle)
    if (!lib) return
    cache[path] = lib
    return lib
  }

  function library (name, path) {
    if (path) return loadLibrary(path, name)
    if (cache[name]) return cache[name]
    const lib = just.sys.library(just.sys.dlsym(handle, `_register_${name}`))
    if (!lib) return
    cache[name] = lib
    return lib
  }

  function builtin (path) {
    path = path.replace(/[./]/g, '_')
    const start = just.sys.dlsym(handle, `_binary_${path}_start`)
    if (!start) return
    const end = just.sys.dlsym(handle, `_binary_${path}_end`)
    if (!end) return
    const buf = just.sys.readMemory(start, end)
    if (!buf) return
    if (!buf.byteLength) return
    return buf
  }

  function requireNative (path) {
    path = `lib/${path}.js`
    if (cache[path]) return cache[path].exports
    const { vm } = just
    const params = ['exports', 'require', 'module']
    const exports = {}
    const module = { exports, type: 'native' }
    const lib = builtin(path)
    if (!lib) return
    module.buf = lib
    module.text = lib.readString()
    if (!module.text) return
    const fun = vm.compile(module.text, path, params, [])
    module.function = fun
    cache[path] = module
    fun.call(exports, exports, p => just.require(p, module), module)
    return module.exports
  }

  function require (path, parent) {
    const ext = path.split('.').slice(-1)[0]
    if (ext === 'js' || ext === 'json') {
      const { join, baseName } = just.path
      let dirName = parent ? parent.dirName : baseName(join(just.sys.cwd(), just.args[1] || './'))
      const fileName = join(dirName, path)
      if (cache[fileName]) return cache[fileName].exports
      dirName = baseName(fileName)
      const params = ['exports', 'require', 'module']
      const exports = {}
      const module = { exports, dirName, fileName, type: ext }
      module.text = just.fs.readFile(fileName)
      cache[fileName] = module
      if (ext === 'js') {
        const fun = just.vm.compile(module.text, fileName, params, [])
        module.function = fun
        fun.call(exports, exports, p => require(p, module), module)
      } else {
        module.exports = JSON.parse(module.text)
      }
      return module.exports
    }
    return just.requireNative(path, parent)
  }

  return { library, builtin, requireNative, require, cache }
}

function setTimeout (callback, timeout, repeat = 0, loop = just.factory.loop) {
  const buf = new ArrayBuffer(8)
  const timerfd = just.sys.timer(repeat, timeout)
  loop.add(timerfd, (fd, event) => {
    callback()
    just.net.read(fd, buf)
    if (repeat === 0) {
      loop.remove(fd)
      just.net.close(fd)
    }
  })
  return timerfd
}

function setInterval (callback, timeout, loop = just.factory.loop) {
  return setTimeout(callback, timeout, timeout, loop)
}

function clearTimeout (fd, loop = just.factory.loop) {
  loop.remove(fd)
  just.net.close(fd)
}

class SystemError {
  constructor (syscall) {
    const { sys } = just
    this.name = 'SystemError'
    const errno = sys.errno()
    this.message = `${syscall} (${errno}) ${sys.strerror(errno)}`
    Error.captureStackTrace(this, this.constructor)
    this.stack = this.stack.split('\n').slice(0, -4).join('\n')
  }
}

function setNonBlocking (fd) {
  let flags = just.fs.fcntl(fd, just.sys.F_GETFL, 0)
  if (flags < 0) return flags
  flags |= just.net.O_NONBLOCK
  return just.fs.fcntl(fd, just.sys.F_SETFL, flags)
}

function main () {
  const handle = just.sys.dlopen()
  const { library, requireNative, require, cache } = wrapRequire(handle)

  // load the builtin modules
  just.vm = library('vm').vm
  just.loop = library('epoll').epoll
  just.fs = library('fs').fs
  just.net = library('net').net
  Object.assign(just.sys, library('sys').sys)

  ArrayBuffer.prototype.writeString = function(str, off = 0) { // eslint-disable-line
    return just.sys.writeString(this, str, off)
  }
  ArrayBuffer.prototype.readString = function (len = this.byteLength, off = 0) { // eslint-disable-line
    return just.sys.readString(this, len, off)
  }
  ArrayBuffer.prototype.getAddress = function () { // eslint-disable-line
    return just.sys.getAddress(this)
  }
  ArrayBuffer.prototype.copyFrom = function (ab, off = 0, len = ab.byteLength, off2 = 0) { // eslint-disable-line
    return just.sys.memcpy(this, ab, off, len, off2)
  }
  ArrayBuffer.fromString = str => just.sys.calloc(1, str)
  String.byteLength = just.sys.utf8Length

  Object.assign(just.fs, requireNative('fs'))
  just.path = requireNative('path')
  just.factory = requireNative('loop').factory
  just.factory.loop = just.factory.create(1024)
  just.process = requireNative('process')

  just.setTimeout = setTimeout
  just.setInterval = setInterval
  just.clearTimeout = just.clearInterval = clearTimeout
  just.SystemError = SystemError
  just.library = library
  just.requireNative = requireNative
  just.sys.setNonBlocking = setNonBlocking
  just.require = global.require = require
  just.require.cache = cache
  just.handle = handle // convenience
  just.waitForInspector = false

  just.env = wrapEnv(just.sys.env)
  just.memoryUsage = wrapMemoryUsage(just.sys.memoryUsage)
  just.cpuUsage = wrapCpuUsage(just.sys.cpuUsage)
  just.rUsage = wrapgetrUsage(just.sys.getrUsage)
  just.heapUsage = wrapHeapUsage(just.sys.heapUsage)
  just.hrtime = wrapHrtime(just.sys.hrtime)

  delete global.console

  just.args = just.args.filter(arg => {
    const found = (arg === '--inspector')
    if (found) just.waitForInspector = true
    return !found
  })

  function startup () {
    if (just.workerSource) {
      just.path.scriptName = just.path.join(just.sys.cwd(), just.args[0] || 'thread')
      const source = just.workerSource
      delete just.workerSource
      just.vm.runScript(`(function() {${source}})()`, just.args[0])
      return
    }
    if (just.args.length === 1) {
      just.path.scriptName = 'repl'
      const replModule = just.require('repl')
      if (!replModule) {
        throw new Error('REPL not enabled. Maybe I should be a standalone?')
      }
      replModule.repl()
      return
    }
    if (just.args[1] === 'eval') {
      just.path.scriptName = 'eval'
      just.vm.runScript(`(function() {${just.args[2]}})()`, just.path.scriptName)
      return
    }
    if (just.args[1] === 'build') {
      throw new Error('Build Not Implemented')
    }
    just.path.scriptName = just.path.join(just.sys.cwd(), just.args[1])
    just.vm.runScript(`(function() {${just.fs.readFile(just.args[1])}})()`, just.path.scriptName)
  }

  if (just.waitForInspector) {
    just.inspector = just.library('inspector').inspector
    if (!just.inspector) throw new SystemError('Cannot Load Inspector')
    Object.assign(just.inspector, require('inspector'))
    just.encode = library('encode').encode
    just.sha1 = library('sha1').sha1
    global.inspector = just.inspector.createInspector({
      title: 'Just!',
      onReady: startup
    })
    just.inspector.enable()
    just.factory.run()
    return
  }
  startup()
  just.factory.run()
}

main()
