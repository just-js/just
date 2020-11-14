const { launch, watch } = just.process
const { isDir, isFile, readFileBytes, writeFile } = just.fs

const AD = '\u001b[0m' // ANSI Default
const AG = '\u001b[32m' // ANSI Green
const AY = '\u001b[33m' // ANSI Yellow

function make (...args) {
  return watch(launch('make', ['C=gcc', 'CC=g++', ...args], justDir))
}

async function run (...args) {
  let clean = false
  just.print(args)
  args = args.filter(arg => {
    const found = (arg === '--clean')
    if (found) clean = true
    return !found
  })
  const [configName = 'lib/config.js', build = 'main'] = args
  const config = require(configName)
  const { version, libs, modules, target, main } = config

  just.print(main)
  const buf = readFileBytes(main)
  just.print(buf.byteLength)
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
  const source = `static const char just_js[] = {\n${bytes.join('')}\n};\nstatic unsigned int just_js_len = ${buf.byteLength};`
  writeFile('main.h', ArrayBuffer.fromString(source))
  const LIBS = libs.join(' ')
  const MODULES = modules.map(m => m.obj).flat().join(' ')
  const LIB = modules.map(m => m.lib).flat().filter(v => v).map(v => `-l${v}`).join(' ')
  if (modules.length && !isDir('modules')) {
    await make('modules')
  }
  if (clean) {
    just.print(`${AG}cleaning ${target}${AD}`)
    await make(`TARGET=${target}`, 'clean')
  }
  for (const module of modules) {
    if (clean) {
      just.print(`${AG}cleaning modules/${module.name}${AD}`)
      await make('-C', `modules/${module.name}`, 'clean')
    }
    if (!isFile(`./modules/${module.name}/${module.name}.o`)) {
      just.print(`${AG}building modules/${module.name}${AD}`)
      await make(`MODULE=${module.name}`, 'module')
    }
  }
  just.print(`${AG}building ${target}${AD} ${AY}${version}${AD} (${main})`)
  await make(`MAIN=${main}`, `RELEASE=${version}`, `LIBS=${LIBS}`, `MODULES=${MODULES}`, `TARGET=${target}`, `LIB=${LIB}`, build)
}

const justDir = just.env().JUST_TARGET || just.sys.cwd()

run(...just.args.slice(2)).catch(err => just.error(err.stack))
