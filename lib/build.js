// TODO
/*
allow merging of modules
check all missing files before compilation
filter duplicates before generating .S file
*/
const { launch, watch } = just.process
const { isDir, isFile, writeFile, mkdir } = just.fs

const AD = '\u001b[0m' // ANSI Default
const AG = '\u001b[32m' // ANSI Green
const AY = '\u001b[33m' // ANSI Yellow
const AR = '\u001b[31m' // ANSI Red

function rmrf (dirName) {
  if (!just.fs.isDir(dirName)) return
  const entries = just.fs.readDir(dirName)
  for (const entry of entries) {
    const { name } = entry
    if (!name.length || (name === '.' || name === '..')) continue
    if (just.fs.isFile(`${dirName}/${entry.name}`)) {
      just.print(`unlink ${dirName}/${entry.name}`)
      just.fs.unlink(`${dirName}/${entry.name}`)
    }
  }
  just.fs.rmdir(dirName)
}

function safeWrite (fileName, str) {
  if (!just.fs.isFile(fileName)) {
    return just.fs.writeFile(fileName, ArrayBuffer.fromString(str))
  }
  return 0
}

function make (opts, ...args) {
  const currentDir = just.sys.cwd()
  const { silent } = opts
  if (silent) {
    const process = launch('make', ['C=gcc', 'CC=g++', ...args], currentDir)
    process.onStdout = (buf, len) => {}
    process.onStderr = (buf, len) => {}
    return watch(process)
  }
  return watch(launch('make', ['C=gcc', 'CC=g++', ...args], currentDir))
}

const rx = /[\.\/]/g
function linkFile (fileName, name) {
  name = `_binary_${name.replace(rx, '_')}`
  return `.global ${name}_start
${name}_start:
        .incbin "${fileName}"
        .global ${name}_end
${name}_end:
`
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
    lines.push(`  extern void* _register_${module.name}();`)
  }
  lines.push('}')
  lines.push('void register_builtins() {')
  for (const file of files) {
    const path = file.replace(/[./]/g, '_')
    lines.push(`  just::builtins_add("${file}", _binary_${path}_start, _binary_${path}_end - _binary_${path}_start);`)
  }
  for (const module of modules) {
    lines.push(`  just::modules["${module.name}"] = &_register_${module.name};`)
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
  return lines.join('\n')
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

async function run (config = {}, { clean = false, dump = false, silent = false }) {
  const start = Date.now()
  let build = 'main'
  let moduleBuild = 'module'
  const text = just.builtin('config.js')
  if (!text) {
    just.error('config.js missing')
    return
  }
  const justDir = just.env().JUST_TARGET || just.path.join(just.sys.cwd(), '.just')
  const appDir = just.sys.cwd()
  const runtime = requireText(text)
  const {
    version = runtime.version || just.version.just,
    debug = runtime.debug || false,
    modules = runtime.modules || [],
    flags = runtime.flags || '',
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
  for (const fileName of runtime.libs) {
    links[fileName] = linkFile(fileName, fileName)
  }
  for (const fileName of runtime.embeds) {
    links[fileName] = linkFile(fileName, fileName)
  }
  if (config.target !== 'just') {
    for (const fileName of config.libs) {
      links[fileName] = linkFile(`${appDir}/${fileName}`, fileName)
    }
    for (const fileName of config.embeds) {
      links[fileName] = linkFile(`${appDir}/${fileName}`, fileName)
    }
  }
  if (main === 'just.js') {
    config.libs = [...new Set([...config.libs, ...runtime.libs])]
    if (index) {
      links[index] = linkFile(`${appDir}/${index}`, index)
      config.embeds = [...new Set([...config.embeds, ...runtime.embeds, ...[index]])]
    } else {
      config.embeds = [...new Set([...config.embeds, ...runtime.embeds])]
    }
  } else {
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
  config.MODULES = modules.map(m => m.obj).flat().join(' ')
  config.LIB = ''
  if (!config.static) config.LIB = modules.map(m => m.lib).flat().filter(v => v).map(v => `-l${v}`).join(' ')
  if (dump) {
    config.build = build
    config.moduleBuild = moduleBuild
    just.print(JSON.stringify(config, null, '  '))
    return
  }
  if (config.target !== 'just') {
    if (!isDir(justDir)) just.fs.mkdir(justDir)
    just.fs.chdir(justDir)
  }
  if (config.main === 'just.js') {
    writeFile('just.js', ArrayBuffer.fromString(just.builtin('just.js')))
    if (!isFile('config.js')) {
      writeFile('config.js', ArrayBuffer.fromString(just.builtin('config.js')))
    }
  }
  writeFile('builtins.S', ArrayBuffer.fromString(Object.keys(links).map(k => links[k]).join('')))
  if (!isDir('lib')) mkdir('lib')
  const src = generateBuiltins(main, index, config.libs, config.embeds, modules)
  writeFile('main.h', ArrayBuffer.fromString(src))
  for (const fileName of runtime.embeds) {
    if (!isFile(fileName)) {
      writeFile(fileName, ArrayBuffer.fromString(just.builtin(fileName)))
    }
  }
  for (const lib of runtime.libs) {
    if (!isFile(lib)) {
      writeFile(lib, ArrayBuffer.fromString(just.builtin(lib)))
    }
  }
  if (!isFile('deps/v8/libv8_monolith.a')) {
    just.print(`${AG}get v8 static library${AD} `, false)
    const r = await make({ silent }, 'deps/v8/libv8_monolith.a')
    const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
    just.print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  }
  if (modules.length && !isDir('modules')) {
    just.print(`${AG}get modules${AD} `, false)
    const r = await make({ silent }, 'modules')
    const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
    just.print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  }
  if (clean) {
    just.print(`${AG}clean ${target}${AD} `, false)
    const r = await make({ silent }, `TARGET=${target}`, 'clean')
    const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
    just.print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  }
  for (const module of modules) {
    if (clean) {
      just.print(`${AG}clean modules/${module.name}${AD} `, false)
      const r = await make({ silent }, '-C', `modules/${module.name}`, 'clean')
      const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
      just.print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
    }
    if (!isFile(`./modules/${module.name}/${module.name}.o`)) {
      just.print(`${AG}build modules/${module.name}${AD} `, false)
      const r = await make({ silent }, `MODULE=${module.name}`, moduleBuild)
      const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
      just.print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
    }
  }
  just.print(`${AG}build ${target}${AD} ${AY}${version}${AD} (${main}) `, false)
  const r = await make({ silent }, `FLAGS=${flags}`, `EMBEDS=${config.EMBEDS}`, `MAIN=${main}`, `RELEASE=${version}`, `LIBS=${config.LIBS}`, `MODULES=${config.MODULES}`, `TARGET=${target}`, `LIB=${config.LIB}`, build)
  const status = r ? `${AR}failed${AD}` : `${AG}complete${AD}`
  just.print(`${status} in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
  if (config.target !== 'just') {
    just.fs.chdir(appDir)
    just.fs.rename(`${justDir}/${target}`, `${appDir}/${target}`)
  }
}

function init (name) {
  if (!just.fs.isDir(name)) {
    just.fs.mkdir(name)
  }
  just.fs.chdir(name)
  safeWrite('config.json', JSON.stringify({ target: name, index: `${name}.js` }, null, '  '))
  safeWrite(`${name}.js`, 'just.print(\'hello\')\n')
  just.fs.chdir('../')
}

function clean () {
  just.fs.unlink('Makefile')
  just.fs.unlink('just.js')
  just.fs.unlink('just.cc')
  just.fs.unlink('just.h')
  just.fs.unlink('main.cc')
  just.fs.unlink('main.h')
  just.fs.unlink('v8lib-0.0.6.tar.gz')
  just.fs.unlink('modules.tar.gz')
  if (just.fs.isDir('lib')) {
    just.fs.unlink('lib/build.js')
    just.fs.unlink('lib/fs.js')
    just.fs.unlink('lib/inspector.js')
    just.fs.unlink('lib/loop.js')
    just.fs.unlink('lib/path.js')
    just.fs.unlink('lib/process.js')
    just.fs.unlink('lib/repl.js')
    just.fs.unlink('lib/websocket.js')
    const files = just.fs.readDir('lib').filter(f => !(['.', '..'].indexOf(f.name) > -1))
    if (files.length === 0) {
      rmrf('lib')
    }
  }
  if (just.fs.isDir('config')) {
    just.fs.unlink('config.js')
    just.fs.unlink('config/debugger.js')
    const files = just.fs.readDir('config').filter(f => !(['.', '..'].indexOf(f.name) > -1))
    if (files.length === 0) {
      rmrf('config')
    }
  }
}

module.exports = { run, init, clean }
