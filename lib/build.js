const { launch, watch } = just.process
const { isDir, isFile, readFileBytes, writeFile, mkdir } = just.fs

const AD = '\u001b[0m' // ANSI Default
const AG = '\u001b[32m' // ANSI Green
const AY = '\u001b[33m' // ANSI Yellow

function make (justDir, ...args) {
  return watch(launch('make', ['C=gcc', 'CC=g++', ...args], justDir))
}

function sourceToBinary (main) {
  const buf = readFileBytes(main)
  const u8 = new Uint8Array(buf)
  const bytes = []
  let i = 1
  for (const b of u8) {
    bytes.push(`0x${b.toString(16).padStart(2, 0)}, `)
    if (i % 12 === 0) {
      bytes.push('\n')
    }
    i++
  }
  return `static const char just_js[] = {\n${bytes.join('')}\n};\nstatic unsigned int just_js_len = ${buf.byteLength};`
}

function parseArgs (args) {
  let clean = false
  let dump = false
  let debug = false
  args = args.filter(arg => {
    if (arg === '--clean') {
      clean = true
      return false
    }
    if (arg === '--dump') {
      dump = true
      return false
    }
    if (arg === '--debug') {
      debug = true
      return false
    }
    return true
  })
  return { clean, dump, debug }
}

async function run (config = {}, ...args) {
  const start = Date.now()
  let [build = 'main'] = args
  let moduleBuild = 'module'
  const { clean, dump, debug } = parseArgs(args)
  if (debug) build = `${build}-debug`
  if (debug) moduleBuild = `${moduleBuild}-debug`
  const {
    justDir = just.env().JUST_TARGET || just.sys.cwd(),
    version = just.version.just,
    libs = [
      'lib/fs.js',
      'lib/loop.js',
      'lib/path.js',
      'lib/process.js',
      'lib/build.js',
      'lib/repl.js'
    ],
    modules = [{
      name: 'sys',
      obj: [
        'modules/sys/sys.o'
      ]
    }, {
      name: 'fs',
      obj: [
        'modules/fs/fs.o'
      ]
    }, {
      name: 'net',
      obj: [
        'modules/net/net.o'
      ]
    }, {
      name: 'vm',
      obj: [
        'modules/vm/vm.o'
      ]
    }, {
      name: 'epoll',
      obj: [
        'modules/epoll/epoll.o'
      ]
    }],
    flags = '',
    target = 'just',
    main = 'just.js',
    embeds = [
      'just.cc',
      'Makefile',
      'main.cc',
      'just.h',
      'just.js',
      'lib/inspector.js',
      'lib/websocket.js',
      'config/runtime.js'
    ]
  } = config
  config.LIBS = libs.join(' ')
  config.EMBEDS = embeds.join(' ')
  config.MODULES = modules.map(m => m.obj).flat().join(' ')
  config.LIB = modules.map(m => m.lib).flat().filter(v => v).map(v => `-l${v}`).join(' ')
  if (dump) {
    config.build = build
    config.moduleBuild = moduleBuild
    just.print(`${AG}build config${AD}\n${JSON.stringify(config, null, '  ')}`)
    return
  }
  if (!isFile(main)) {
    if (main === 'just.js') {
      writeFile('just.js', just.builtin('just.js'))
      if (!isDir('config')) {
        mkdir('config')
      }
      if (!isFile('config/runtime.js')) {
        writeFile('config/runtime.js', just.builtin('config/runtime.js'))
      }
    } else {
      just.error(`${main} missing`)
      return
    }
  }
  if (!isDir('lib')) {
    mkdir('lib')
    if (!isFile('lib/fs.js')) {
      writeFile('lib/fs.js', just.builtin('lib/fs.js'))
    }
    if (!isFile('lib/loop.js')) {
      writeFile('lib/loop.js', just.builtin('lib/loop.js'))
    }
    if (!isFile('lib/process.js')) {
      writeFile('lib/process.js', just.builtin('lib/process.js'))
    }
    if (!isFile('lib/path.js')) {
      writeFile('lib/path.js', just.builtin('lib/path.js'))
    }
    if (!isFile('lib/build.js')) {
      writeFile('lib/build.js', just.builtin('lib/build.js'))
    }
    if (!isFile('lib/repl.js')) {
      writeFile('lib/repl.js', just.builtin('lib/repl.js'))
    }
    if (!isFile('lib/inspector.js')) {
      writeFile('lib/inspector.js', just.builtin('lib/inspector.js'))
    }
    if (!isFile('lib/websocket.js')) {
      writeFile('lib/websocket.js', just.builtin('lib/websocket.js'))
    }
  }
  just.print('writing main.h')
  writeFile('main.h', ArrayBuffer.fromString(sourceToBinary(main)))
  if (!isFile('Makefile')) {
    writeFile('Makefile', just.builtin('Makefile'))
  }
  if (!isFile('just.cc')) {
    writeFile('just.cc', just.builtin('just.cc'))
  }
  if (!isFile('just.h')) {
    writeFile('just.h', just.builtin('just.h'))
  }
  if (!isFile('main.cc')) {
    writeFile('main.cc', just.builtin('main.cc'))
  }
  for (const lib of libs) {
    if (!isFile(lib)) {
      writeFile(lib, just.builtin(lib))
    }
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
  await make(justDir, `FLAGS=${flags}`, `EMBEDS=${config.EMBEDS}`, `MAIN=${main}`, `RELEASE=${version}`, `LIBS=${config.LIBS}`, `MODULES=${config.MODULES}`, `TARGET=${target}`, `LIB=${config.LIB}`, build)
  just.print(`${AG}build ${target}${AD} ${AY}${version}${AD} (${main}) complete in ${AY}${Math.floor((Date.now() - start) / 10) / 100}${AD} sec`)
}

module.exports = { run }
