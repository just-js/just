const { print, error, builtin } = just
const { launch, watch } = just.process
const { cwd } = just.sys
const { compile } = just.vm
const { unlink, isDir, isFile, writeFile, mkdir, rmdir, readDir, chdir, rename } = just.fs

const AD = '\u001b[0m' // ANSI Default
const AG = '\u001b[32m' // ANSI Green
const AY = '\u001b[33m' // ANSI Yellow
const AR = '\u001b[31m' // ANSI Red

function rmrf (dirName) {
  if (!isDir(dirName)) return
  const entries = readDir(dirName)
  for (const entry of entries) {
    const { name } = entry
    if (!name.length || (name === '.' || name === '..')) continue
    if (isFile(`${dirName}/${entry.name}`)) {
      print(`unlink ${dirName}/${entry.name}`)
      unlink(`${dirName}/${entry.name}`)
    }
  }
  rmdir(dirName)
}

function safeWrite (fileName, str) {
  if (!isFile(fileName)) {
    return writeFile(fileName, ArrayBuffer.fromString(str))
  }
  return 0
}

function make (opts, ...args) {
  const currentDir = cwd()
  const { silent } = opts
  if (silent) {
    // todo - why are we overriding C and CC here?
    const process = launch('make', [...args], currentDir)
    process.onStdout = (buf, len) => {}
    process.onStderr = (buf, len) => {}
    return watch(process)
  }
  return watch(launch('make', [...args], currentDir))
}

const rx = /[./]/g

function linkFile (fileName, name) {
  name = `_binary_${name.replace(rx, '_')}`
  return `.global ${name}_start
${name}_start:
        .incbin "${fileName}"
        .global ${name}_end
${name}_end:
`
}

function generateBuiltins (main, index, libs, embeds, modules, v8flags, v8flagsFromCommandLine = false, justDir = '') {
  const lines = []
  const files = libs.concat(embeds)
  // todo - make this a string literal/template
  for (let file of files) {
    if (file[0] === '/') {
      file = file.replace(`${justDir}/`, '')
    }
    const path = file.replace(/[./]/g, '_')
    lines.push(`extern char _binary_${path}_start[];`)
    lines.push(`extern char _binary_${path}_end[];`)
  }
  lines.push('extern "C" {')
  for (const module of modules) {
    if (module.exports) {
      for (const e of module.exports) {
        lines.push(`  extern void* _register_${e.name}();`)
      }
    } else {
      lines.push(`  extern void* _register_${module.name}();`)
    }
  }
  lines.push('}')
  lines.push('void register_builtins() {')
  for (let file of files) {
    if (file[0] === '/') {
      file = file.replace(`${justDir}/`, '')
    }
    const path = file.replace(/[./]/g, '_')
    lines.push(`  just::builtins_add("${file}", _binary_${path}_start, _binary_${path}_end - _binary_${path}_start);`)
  }
  for (const module of modules) {
    if (module.exports) {
      for (const e of module.exports) {
        lines.push(`  just::modules["${e.name}"] = &_register_${e.name};`)
      }
    } else {
      lines.push(`  just::modules["${module.name}"] = &_register_${module.name};`)
    }
  }
  lines.push('}')
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
  lines.push(`static const char* v8flags = "${v8flags}";`)
  lines.push(`static unsigned int _v8flags_from_commandline = ${v8flagsFromCommandLine ? 1 : 0};`)
  return lines.join('\n')
}

function requireText (text, fileName = 'eval', dirName = cwd()) {
  const params = ['exports', 'require', 'module']
  const exports = {}
  const module = { exports, dirName, fileName, type: 'js' }
  module.text = text
  const fun = compile(module.text, fileName, params, [])
  module.function = fun
  fun.call(exports, exports, p => require(p, module), module)
  return module.exports
}

async function run (config = {}, { cleanall = false, clean = false, dump = false, silent = false }) {
  const start = Date.now()
  let build = 'main'
  let moduleBuild = 'module'
  const text = builtin('config.js')
  if (!text) {
    error('config.js missing')
    return
  }
  const { HOME, JUST_TARGET } = just.env()
  const justDir = JUST_TARGET || `${HOME}/.just`
  const appDir = cwd()
  const runtime = requireText(text)
  const {
    version = runtime.version || just.version.just,
    debug = runtime.debug || false,
    modules = runtime.modules || [],
    flags = runtime.flags || '',
    v8flagsFromCommandLine = runtime.v8flagsFromCommandLine || false,
    v8flags = runtime.v8flags || '',
    target = runtime.target || 'just',
    main = runtime.main || 'just.js',
    index = runtime.index || ''
  } = config
  if (config.static === 'undefined') {
    config.static = runtime.static
  }
  if (config.static) {
    build = 'main-static'
    moduleBuild = 'module-static'
  }
  config.libs = config.libs || []
  config.embeds = config.embeds || []
  const links = {}
  if (config.target === 'just') {
    for (const fileName of config.libs) {
      if (isFile(`${appDir}/${fileName}`)) {
        links[fileName] = linkFile(fileName, fileName)
      } else {
        links[fileName] = linkFile(`${justDir}/${fileName}`, fileName)
      }
    }
    for (const fileName of config.embeds) {
      if (isFile(`${appDir}/${fileName}`)) {
        links[fileName] = linkFile(fileName, fileName)
      } else {
        links[fileName] = linkFile(`${justDir}/${fileName}`, fileName)
      }
    }
  } else {
    for (const fileName of config.libs) {
      if (fileName[0] === '/') {
        links[fileName] = linkFile(fileName, fileName.replace(`${justDir}/`, ''))
      } else {
        if (isFile(`${appDir}/${fileName}`)) {
          links[fileName] = linkFile(`${appDir}/${fileName}`, fileName)
        } else {
          links[fileName] = linkFile(`${justDir}/${fileName}`, fileName)
        }
      }
    }
    for (const fileName of config.embeds) {
      links[fileName] = linkFile(`${appDir}/${fileName}`, fileName)
    }
  }
  if (main === 'just.js') {
    for (const fileName of runtime.libs) {
      links[fileName] = linkFile(fileName, fileName)
    }
    for (const fileName of runtime.embeds) {
      links[fileName] = linkFile(fileName, fileName)
    }
    config.embeds = [...new Set([...config.embeds, ...[main, 'config.js']])]
    config.libs = [...new Set([...config.libs, ...runtime.libs])]
    if (index) {
      links[index] = linkFile(`${appDir}/${index}`, index)
      if (config.target === 'just') {
        config.embeds = [...new Set([...config.embeds, ...runtime.embeds, ...[index]])]
      } else {
        config.embeds = [...new Set([...config.embeds, ...[index]])]
      }
    } else {
      if (config.target === 'just') {
        config.embeds = [...new Set([...config.embeds, ...runtime.embeds])]
      }
    }
  } else {
    config.embeds = [...new Set([...config.embeds, ...[main]])]
    links[main] = linkFile(`${appDir}/${main}`, main)
  }
  config.embeds = config.embeds.filter(embed => !(config.libs.indexOf(embed) > -1))
  config.modules = modules
  if (debug) {
    build = `${build}-debug`
    moduleBuild = `${moduleBuild}-debug`
  }
  config.LIBS = config.libs.join(' ')
  config.EMBEDS = config.embeds.join(' ')
  config.MODULES = modules.map(m => (m.exports ? (m.exports.map(e => e.obj).flat()) : m.obj)).flat().join(' ')
  config.LIB = modules.map(m => m.lib).flat().filter(v => v).map(v => `-l${v}`).join(' ')
  if (dump) {
    config.build = build
    config.moduleBuild = moduleBuild
    print(JSON.stringify(config, null, '  '))
    return
  }
  if (config.target !== 'just') {
    if (!isDir(justDir)) mkdir(justDir)
    chdir(justDir)
  }
  if (config.main === 'just.js') {
    if (!isFile('just.js')) writeFile('just.js', ArrayBuffer.fromString(builtin('just.js')))
    if (!isFile('config.js')) writeFile('config.js', ArrayBuffer.fromString(builtin('config.js')))
  }
  writeFile('builtins.S', ArrayBuffer.fromString(Object.keys(links).map(k => links[k]).join('')))
  if (!isDir('lib')) mkdir('lib')
  const src = generateBuiltins(main, index, config.libs, config.embeds, modules, v8flags, v8flagsFromCommandLine, justDir)
  writeFile('main.h', ArrayBuffer.fromString(src))
  for (const fileName of runtime.embeds) {
    if (!isFile(fileName)) {
      writeFile(fileName, ArrayBuffer.fromString(builtin(fileName)))
    }
  }
  for (const lib of runtime.libs) {
    if (!isFile(lib)) {
      writeFile(lib, ArrayBuffer.fromString(builtin(lib)))
    }
  }
  if (!isFile('deps/v8/libv8_monolith.a')) {
    print(`${AG}get v8 static library${AD} `, false)
    const r = await make({ silent }, 'deps/v8/libv8_monolith.a')
    const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
    print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  }
  if (modules.length && !isDir('modules')) {
    print(`${AG}get modules${AD} `, false)
    const r = await make({ silent }, 'modules')
    const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
    print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  }
  if (clean) {
    print(`${AG}clean ${target}${AD} `, false)
    const r = await make({ silent }, `TARGET=${target}`, 'clean')
    const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
    print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  }
  for (const module of modules) {
    if (cleanall) {
      print(`${AG}clean modules/${module.name}${AD} `, false)
      const r = await make({ silent }, '-C', `modules/${module.name}`, 'clean')
      const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
      print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
    }
    if (!isFile(`./modules/${module.name}/${module.name}.o`)) {
      print(`${AG}build modules/${module.name}${AD} `, false)
      const r = await make({ silent }, `MODULE=${module.name}`, moduleBuild)
      const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
      print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
    }
  }
  print(`${AG}build ${target}${AD} ${AY}${version}${AD} (${main}) `, false)
  const r = await make({ silent }, `FLAGS=${flags}`, `EMBEDS=${config.EMBEDS}`, `MAIN=${main}`, `RELEASE=${version}`, `LIBS=${config.LIBS}`, `MODULES=${config.MODULES}`, `TARGET=${target}`, `LIB=${config.LIB}`, build)
  const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
  print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  if (config.target !== 'just') {
    chdir(appDir)
    rename(`${justDir}/${target}`, `${appDir}/${target}`)
  }
}

function init (name) {
  if (!isDir(name)) {
    mkdir(name)
  }
  chdir(name)
  safeWrite('config.json', JSON.stringify({ target: name, index: `${name}.js`, static: true }, null, '  '))
  safeWrite(`${name}.js`, 'just.print(\'hello\')\n')
  chdir('../')
}

function clean () {
  // we don't want to do this for main build
  // todo unlink linker file
  unlink('Makefile')
  unlink('just.js')
  unlink('just.cc')
  unlink('just.h')
  unlink('main.cc')
  unlink('main.h')
  unlink('v8lib-0.0.6.tar.gz')
  unlink('modules.tar.gz')
  if (isDir('lib')) {
    unlink('lib/build.js')
    unlink('lib/fs.js')
    unlink('lib/inspector.js')
    unlink('lib/loop.js')
    unlink('lib/path.js')
    unlink('lib/process.js')
    unlink('lib/repl.js')
    unlink('lib/websocket.js')
    unlink('lib/acorn.js')
    unlink('lib/configure.js')
    const files = readDir('lib').filter(f => !(['.', '..'].indexOf(f.name) > -1))
    if (files.length === 0) {
      rmrf('lib')
    }
  }
  if (isDir('config')) {
    unlink('config.js')
    unlink('config/debugger.js')
    const files = readDir('config').filter(f => !(['.', '..'].indexOf(f.name) > -1))
    if (files.length === 0) {
      rmrf('config')
    }
  }
}

module.exports = { run, init, clean }
