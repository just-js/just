const libs = [
  'lib/fs.js',
  'lib/loop.js',
  'lib/path.js',
  'lib/websocket.js',
  'lib/inspector.js',
  'lib/repl.js'
]

const version = '0.0.6'
const v8flags = ''

const capabilities = [] // list of allowed internal modules, api calls etc. TBD

const modules = [{
  name: 'sys',
  obj: [
    'modules/sys/sys.o'
  ]
}, {
  name: 'sha1',
  obj: [
    'modules/sha1/sha1.o'
  ]
}, {
  name: 'encode',
  obj: [
    'modules/encode/encode.o'
  ]
}, {
  name: 'fs',
  obj: [
    'modules/fs/fs.o'
  ]
}, {
  name: 'inspector',
  obj: [
    'modules/inspector/inspector.o'
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

const target = 'debugger'
const main = 'just.js'

module.exports = { version, libs, modules, capabilities, target, main, v8flags }
