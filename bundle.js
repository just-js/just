const { launch, watch } = just.process
const { isDir, readFileBytes, writeFile } = require('fs')

function make (...args) {
  return watch(launch('make', ['C=gcc', 'CC=g++', ...args], justDir))
}

async function run (configName = 'config.js') {
  const config = require(configName)
  const { version, libs, modules, target, main } = config
  const LIBS = libs.join(' ')
  const MODULES = modules.map(m => m.obj).flat().join(' ')
  const LIB = modules.map(m => m.lib).flat().filter(v => v).map(v => `-l${v}`).join(' ')
  if (modules.length && !isDir('modules')) {
    await make('modules')
  }
  await make(`TARGET=${target}`, 'clean')
  for (const module of modules) {
    await make(`MODULE=${module.name}`, 'module')
  }
  await make(`MAIN=${main}`, `RELEASE=${version}`, `LIBS=${LIBS}`, `MODULES=${MODULES}`, `TARGET=${target}`, `LIB=${LIB}`, 'runtime')
}

const justDir = just.env().JUST_TARGET || just.sys.cwd()

run(...just.args.slice(2)).catch(err => just.error(err.stack))
