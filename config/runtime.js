const libs = [
  'lib/fs.js',
  'lib/loop.js',
  'lib/path.js',
  'lib/process.js',
  'lib/build.js',
  'lib/repl.js'
]

const version = just.version.just
const v8flags = ''

const capabilities = [] // list of allowed internal modules, api calls etc. TBD

const modules = [{
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
}]

const embeds = [
  'just.cc',
  'just.h',
  'Makefile',
  'main.cc',
  'just.js',
  'lib/inspector.js',
  'lib/websocket.js',
  'config/runtime.js'
]

const target = 'just'
const main = 'just.js'

module.exports = { version, libs, modules, capabilities, target, main, v8flags, embeds }
