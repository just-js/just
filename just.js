function wrapHrtime (hrtime) {
  const time = new BigUint64Array(1)
  return () => {
    hrtime(time)
    return time[0]
  }
}

function wrapCpuUsage (cpuUsage) {
  const cpu = new Float64Array(16)
  return () => {
    cpuUsage(cpu)
    return { user: cpu[0], system: cpu[1] }
  }
}

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

function split (str, sym) {
  const at = str.indexOf(sym)
  return [str.slice(0, at), str.slice(at + 1)]
}

function wrapEnv (env) {
  return () => {
    return env()
      .map(entry => split(entry, '='))
      .reduce((e, pair) => { e[pair[0]] = pair[1]; return e }, {})
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

function wrapRequireNative (cache = {}) {
  function require (path) {
    if (cache[path]) return cache[path].exports
    const { vm } = just
    const params = ['exports', 'require', 'module']
    const exports = {}
    const module = { exports, type: 'native' }
    module.text = vm.builtin(path)
    if (!module.text) return
    const fun = vm.compile(module.text, path, params, [])
    module.function = fun
    cache[path] = module
    fun.call(exports, exports, p => require(p, module), module)
    return module.exports
  }
  return { cache, require }
}

function setTimeout (callback, timeout, repeat = 0, loop = just.factory.loop) {
  const buf = new ArrayBuffer(8)
  const fd = just.sys.timer(repeat, timeout)
  loop.add(fd, (fd, event) => {
    callback()
    just.net.read(fd, buf)
    if (repeat === 0) {
      loop.remove(fd)
      just.net.close(fd)
    }
  })
  return fd
}

function setInterval (callback, timeout, loop = just.factory.loop) {
  return setTimeout(callback, timeout, timeout, loop)
}

function clearTimeout (fd, loop = just.factory.loop) {
  loop.remove(fd)
  just.net.close(fd)
}

function runScript (script, name) {
  return just.vm.runScript(`(function() {\n${script}\n})()`, name)
}

function loadLibrary (path, name) {
  const handle = just.sys.dlopen(path, just.sys.RTLD_LAZY)
  if (!handle) return
  const ptr = just.sys.dlsym(handle, `_register_${name}`)
  if (!ptr) return
  return just.sys.library(ptr)
}

function main () {
  const { fs, sys, net } = just
  ArrayBuffer.prototype.writeString = function(str, off = 0) { // eslint-disable-line
    return sys.writeString(this, str, off)
  }
  ArrayBuffer.prototype.readString = function (len, off) { // eslint-disable-line
    return sys.readString(this, len, off)
  }
  ArrayBuffer.prototype.copyFrom = function (ab, off, len, off2 = 0) { // eslint-disable-line
    return sys.memcpy(this, ab, off, len, off2)
  }
  ArrayBuffer.fromString = str => sys.calloc(1, str)
  just.setTimeout = setTimeout
  just.setInterval = setInterval
  just.clearTimeout = just.clearInterval = clearTimeout
  just.memoryUsage = wrapMemoryUsage(sys.memoryUsage)
  just.cpuUsage = wrapCpuUsage(sys.cpuUsage)
  just.hrtime = wrapHrtime(sys.hrtime)
  just.env = wrapEnv(sys.env)
  just.requireCache = {}
  global.require = just.require = just.requireNative = wrapRequireNative(just.requireCache).require
  const requireModule = just.require('require')
  if (requireModule) {
    global.require = just.require = requireModule.wrap(just.requireCache).require
  }
  just.heapUsage = wrapHeapUsage(sys.heapUsage)
  just.library = loadLibrary
  just.path = just.require('path')
  const { factory, createLoop } = just.require('loop')
  just.factory = factory
  const loop = factory.create(1024)
  just.factory.loop = loop
  just.createLoop = createLoop
  let waitForInspector = false
  just.args = just.args.filter(arg => {
    const found = (arg === '--inspector')
    if (found) waitForInspector = true
    return !found
  })
  const { args } = just
  if (just.workerSource) {
    just.path.scriptName = just.path.join(sys.cwd(), args[0] || 'thread')
    const source = just.workerSource
    delete just.workerSource
    runScript(source, args[0])
    factory.run()
    return
  }
  if (args.length === 1) {
    const replModule = just.require('repl')
    if (!replModule) throw new Error('REPL not enabled')
    replModule.repl(loop, new ArrayBuffer(4096))
    factory.run()
    return
  }
  if (args[1] === '-e') {
    runScript(args[2], 'eval')
    factory.run()
    return
  }
  if (args[1] === '--') {
    // todo: limit size
    // todo: allow streaming in multiple scripts with a separator and running them all
    const buf = new ArrayBuffer(4096)
    const chunks = []
    let bytes = net.read(sys.STDIN_FILENO, buf)
    while (bytes > 0) {
      chunks.push(buf.readString(bytes))
      bytes = net.read(sys.STDIN_FILENO, buf)
    }
    runScript(chunks.join(''), 'stdin')
    factory.run()
    return
  }
  if (waitForInspector) {
    const inspectorModule = just.require('inspector')
    if (!inspectorModule) throw new Error('inspector not enabled')
    just.error('waiting for inspector...')
    global.inspector = inspectorModule.createInspector({
      title: 'Just!',
      onReady: () => {
        just.path.scriptName = just.path.join(sys.cwd(), args[1])
        runScript(fs.readFile(args[1]), just.path.scriptName)
      }
    })
  } else {
    just.path.scriptName = just.path.join(sys.cwd(), args[1])
    runScript(fs.readFile(args[1]), just.path.scriptName)
  }
  factory.run()
}

main()
