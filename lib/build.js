const { launch, watch } = just.process
const { isDir, isFile, writeFile, mkdir } = just.fs

const AD = '\u001b[0m' // ANSI Default
const AG = '\u001b[32m' // ANSI Green
const AY = '\u001b[33m' // ANSI Yellow
const AR = '\u001b[31m' // ANSI Red

function make (justDir, ...args) {
  return watch(launch('make', ['C=gcc', 'CC=g++', ...args], justDir))
}

function generateBuiltins (main, index, libs, embeds, modules) {
  const lines = []
  const files = libs.concat(embeds)
  // todo - make this a string literal/template
  for (const file of files) {
    const path = file.replace(/[./]/g, '_')
    lines.push(`extern char _binary_${path}_start[];`)
    lines.push(`extern char _binary_${path}_end[];`)
  }
  lines.push('extern "C" {')
  for (const module of modules) {
    lines.push(`extern void* _register_${module.name}();`)
  }
  lines.push('}')
  lines.push('void register_builtins() {')
  for (const file of files) {
    const path = file.replace(/[./]/g, '_')
    lines.push(`just::builtins_add("${file}", _binary_${path}_start, _binary_${path}_end - _binary_${path}_start);`)
  }
  for (const module of modules) {
    lines.push(`just::modules["${module.name}"] = &_register_${module.name};`)
  }
  lines.push('}\n')

  let path = main.replace(/[./]/g, '_')
  lines.push(`static unsigned int just_js_len = _binary_${path}_end - _binary_${path}_start;`)
  lines.push(`static const char* just_js = _binary_${path}_start;`)
  if (index) {
    path = index.replace(/[./]/g, '_')
    lines.push(`static unsigned int index_js_len = _binary_${path}_end - _binary_${path}_start;`)
    lines.push(`static const char* index_js = _binary_${path}_start;`)
    lines.push('static unsigned int _use_index = 1;')
  } else {
    path = index.replace(/[./]/g, '_')
    lines.push('static unsigned int index_js_len = 0;')
    lines.push('static const char* index_js = NULL;')
    lines.push('static unsigned int _use_index = 0;')
  }
  return lines.join('\n')
}

function parseArgs (args) {
  let clean = false
  let dump = false
  args = args.filter(arg => {
    if (arg === '--clean') {
      clean = true
      return false
    }
    if (arg === '--dump') {
      dump = true
      return false
    }
    return true
  })
  return { args, clean, dump }
}

function requireText (text, fileName = 'eval', dirName = just.sys.cwd()) {
  const params = ['exports', 'require', 'module']
  const exports = {}
  const module = { exports, dirName, fileName, type: 'js' }
  module.text = text
  const fun = just.vm.compile(module.text, fileName, params, [])
  module.function = fun
  fun.call(exports, exports, p => require(p, module), module)
  return module.exports
}

async function run (config = {}, ...args) {
  const start = Date.now()
  let build = 'main'
  let moduleBuild = 'module'
  const text = just.builtin('config/runtime.js')
  if (!text) {
    just.error('config/runtime.js missing')
    return
  }
  const runtime = requireText(text)
  const { clean, dump } = parseArgs(args)
  const {
    justDir = just.env().JUST_TARGET || just.sys.cwd(),
    version = runtime.version || just.version.just,
    debug = runtime.debug || false,
    modules = runtime.modules || [],
    flags = runtime.flags || '',
    target = runtime.target || 'just',
    main = runtime.main || 'just.js',
    index = runtime.index || ''
  } = config
  config.static = config.static || runtime.static
  if (config.static) {
    build = 'main-static'
    moduleBuild = 'module-static'
  }
  config.libs = config.libs || []
  config.embeds = config.embeds || []
  if (main === 'just.js') {
    config.libs = [...new Set([...config.libs, ...runtime.libs])]
    if (index) {
      config.embeds = [...new Set([...config.embeds, ...runtime.embeds, ...[index]])]
    } else {
      config.embeds = [...new Set([...config.embeds, ...runtime.embeds])]
    }
  }
  config.modules = modules
  if (debug) {
    build = `${build}-debug`
    moduleBuild = `${moduleBuild}-debug`
  }
  config.LIBS = config.libs.join(' ')
  config.EMBEDS = config.embeds.join(' ')
  config.MODULES = modules.map(m => m.obj).flat().join(' ')
  config.LIB = ''
  if (!config.static) config.LIB = modules.map(m => m.lib).flat().filter(v => v).map(v => `-l${v}`).join(' ')
  if (dump) {
    config.build = build
    config.moduleBuild = moduleBuild
    just.print(JSON.stringify(config, null, '  '))
    return
  }
  if (!isFile(main)) {
    if (main === 'just.js') {
      writeFile('just.js', ArrayBuffer.fromString(just.builtin('just.js')))
      if (!isDir('config')) {
        mkdir('config')
      }
      if (!isFile('config/runtime.js')) {
        writeFile('config/runtime.js', ArrayBuffer.fromString(just.builtin('config/runtime.js')))
      }
    } else {
      just.error(`${main} missing`)
      return
    }
  }
  if (!isDir('lib')) {
    mkdir('lib')
    if (!isFile('lib/fs.js')) {
      writeFile('lib/fs.js', ArrayBuffer.fromString(just.builtin('lib/fs.js')))
    }
    if (!isFile('lib/loop.js')) {
      writeFile('lib/loop.js', ArrayBuffer.fromString(just.builtin('lib/loop.js')))
    }
    if (!isFile('lib/process.js')) {
      writeFile('lib/process.js', ArrayBuffer.fromString(just.builtin('lib/process.js')))
    }
    if (!isFile('lib/path.js')) {
      writeFile('lib/path.js', ArrayBuffer.fromString(just.builtin('lib/path.js')))
    }
    if (!isFile('lib/build.js')) {
      writeFile('lib/build.js', ArrayBuffer.fromString(just.builtin('lib/build.js')))
    }
    if (!isFile('lib/repl.js')) {
      writeFile('lib/repl.js', ArrayBuffer.fromString(just.builtin('lib/repl.js')))
    }
    if (!isFile('lib/inspector.js')) {
      writeFile('lib/inspector.js', ArrayBuffer.fromString(just.builtin('lib/inspector.js')))
    }
    if (!isFile('lib/websocket.js')) {
      writeFile('lib/websocket.js', ArrayBuffer.fromString(just.builtin('lib/websocket.js')))
    }
  }
  just.print('writing main.h')
  const src = generateBuiltins(main, index, config.libs, config.embeds, modules)
  writeFile('main.h', ArrayBuffer.fromString(src))
  if (!isFile('Makefile')) {
    writeFile('Makefile', ArrayBuffer.fromString(just.builtin('Makefile')))
  }
  if (!isFile('just.cc')) {
    writeFile('just.cc', ArrayBuffer.fromString(just.builtin('just.cc')))
  }
  if (!isFile('just.h')) {
    writeFile('just.h', ArrayBuffer.fromString(just.builtin('just.h')))
  }
  if (!isFile('main.cc')) {
    writeFile('main.cc', ArrayBuffer.fromString(just.builtin('main.cc')))
  }
  for (const lib of config.libs) {
    if (!isFile(lib)) {
      writeFile(lib, ArrayBuffer.fromString(just.builtin(lib)))
    }
  }
  if (!isDir('deps')) {
    just.print(`${AG}get dependencies${AD}`)
    await make(justDir, 'deps')
  }
  if (modules.length && !isDir('modules')) {
    just.print(`${AG}get modules${AD}`)
    await make(justDir, 'modules')
  }
  if (clean) {
    just.print(`${AG}clean ${target}${AD}`)
    await make(justDir, `TARGET=${target}`, 'clean')
  }
  for (const module of modules) {
    if (clean) {
      just.print(`${AG}clean modules/${module.name}${AD}`)
      await make(justDir, '-C', `modules/${module.name}`, 'clean')
    }
    if (!isFile(`./modules/${module.name}/${module.name}.o`)) {
      just.print(`${AG}building modules/${module.name}${AD}`)
      await make(justDir, `MODULE=${module.name}`, moduleBuild)
    }
  }
  just.print(`${AG}build ${target}${AD} ${AY}${version}${AD} (${main})`)
  const r = await make(justDir, `FLAGS=${flags}`, `EMBEDS=${config.EMBEDS}`, `MAIN=${main}`, `RELEASE=${version}`, `LIBS=${config.LIBS}`, `MODULES=${config.MODULES}`, `TARGET=${target}`, `LIB=${config.LIB}`, build)
  const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
  just.print(`${AG}build ${target}${AD} ${AY}${version}${AD} (${main}) ${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
}

module.exports = { run }
