const { writeFile, isFile } = just.require('fs')
const { mkdir } = just.fs
const { errno, strerror, spawn, waitpid, fcntl, STDERR_FILENO, STDOUT_FILENO } = just.sys
const { pipe, write, close, read, O_NONBLOCK, O_CLOEXEC } = just.net
const { loop } = just.factory
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop

function setNonBlocking (fd) {
  let flags = fcntl(fd, just.sys.F_GETFL, 0)
  if (flags < 0) return flags
  flags |= O_NONBLOCK
  return fcntl(fd, just.sys.F_SETFL, flags)
}

function loadSymbolFile (path) {
  const handle = just.sys.dlopen()
  path = path.replace(/[./]/g, '_')
  const start = just.sys.dlsym(handle, `_binary_${path}_start`)
  if (!start) return
  const end = just.sys.dlsym(handle, `_binary_${path}_end`)
  if (!end) return
  const buf = just.sys.readMemory(start, end)
  just.sys.dlclose(handle)
  return buf
}

function loadAndWrite (fn, parent = justDir) {
  if (isFile(`${parent}/${fn}`)) return
  writeFile(`${parent}/${fn}`, loadSymbolFile(fn))
}

function createPipe () {
  const fds = []
  const r = pipe(fds, O_CLOEXEC | O_NONBLOCK)
  if (r !== 0) throw new Error(`pipe ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

const READABLE = 0
const WRITABLE = 1

function make () {
  const stdin = createPipe()
  const stdout = createPipe()
  const stderr = createPipe()
  const pid = spawn('make', justDir, ['-C', justDir, ...just.args.slice(2)], stdin[READABLE], stdout[WRITABLE], stderr[WRITABLE])
  close(stdin[READABLE])
  close(stdout[WRITABLE])
  close(stderr[WRITABLE])
  return { pid, stdin, stdout, stderr }
}

function eventHandler (outfd, buf) {
  return (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      loop.remove(fd)
      close(fd)
      return
    }
    if (event && EPOLLIN) {
      write(outfd, buf, read(fd, buf), 0)
    }
  }
}

function build (config = {}, onComplete = () => {}) {
  setNonBlocking(STDOUT_FILENO)
  setNonBlocking(STDERR_FILENO)
  if (config.destination) justDir = config.destination
  let start
  let then = start = Date.now()
  function getTime (v = then) {
    then = Date.now()
    return `${((Date.now() - v) / 1000).toFixed(3)} ${ANSI_YELLOW}sec${ANSI_DEFAULT}`
  }
  try {
    write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_YELLOW}extracting resources${ANSI_DEFAULT}      `))
    mkdir(justDir)
    loadAndWrite('Makefile', justDir)
    loadAndWrite('just.cc', justDir)
    loadAndWrite('just.js', justDir)
    loadAndWrite('just.h', justDir)
    loadAndWrite('main.cc', justDir)
    mkdir(`${justDir}/lib`)
    loadAndWrite('lib/build.js', justDir)
    loadAndWrite('lib/fs.js', justDir)
    loadAndWrite('lib/inspector.js', justDir)
    loadAndWrite('lib/loop.js', justDir)
    loadAndWrite('lib/path.js', justDir)
    loadAndWrite('lib/repl.js', justDir)
    loadAndWrite('lib/require.js', justDir)
    loadAndWrite('lib/websocket.js', justDir)
    write(STDOUT_FILENO, ArrayBuffer.fromString(` ${ANSI_MAGENTA}time${ANSI_DEFAULT} ${getTime()}\n`))
    write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_YELLOW}extracting dependencies${ANSI_DEFAULT}   `))
    write(STDOUT_FILENO, ArrayBuffer.fromString(` ${ANSI_MAGENTA}time${ANSI_DEFAULT} ${getTime()}\n`))
    write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_YELLOW}building ${just.args.slice(2).join(', ')}${ANSI_DEFAULT}\n`))
    if (just.args.length < 3) {
      just.args.push('runtime')
    }
    const { pid, stdout, stderr } = make()
    if (pid < 0) throw new Error('Could not launch make')
    const buf = new ArrayBuffer(4096)
    loop.add(stdout[READABLE], eventHandler(STDOUT_FILENO, buf))
    loop.add(stderr[READABLE], eventHandler(STDERR_FILENO, buf))
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), pid)
      if (kpid === pid) {
        if (status === 0) {
          write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_GREEN}build successful           ${ANSI_MAGENTA}time${ANSI_DEFAULT} ${getTime()}\n`))
        } else {
          write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_RED}build failed rc=${status}          ${ANSI_MAGENTA}time${ANSI_DEFAULT} ${getTime()}\n`))
        }
        write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_YELLOW}total                      ${ANSI_MAGENTA}time${ANSI_DEFAULT} ${getTime(start)}\n`))
        just.clearInterval(timer)
        onComplete(null, { status, pid })
      }
    }, 100)
  } catch (err) {
    onComplete(err)
  }
}

let justDir = `${just.env().JUST_TARGET || just.sys.cwd()}/.just`
const ANSI_DEFAULT = '\u001b[0m'
const ANSI_GREEN = '\u001b[32m'
const ANSI_YELLOW = '\u001b[33m'
const ANSI_MAGENTA = '\u001b[35m'
const ANSI_RED = '\u001b[31m'

module.exports = { build, loadSymbolFile }
