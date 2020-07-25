const { writeFile } = just.require('fs')
const { mkdir, open, O_TRUNC, O_CREAT, O_WRONLY, EEXIST } = just.fs
const { createInflate, writeInflate, endInflate, Z_NO_FLUSH, Z_STREAM_END } = just.zlib
const { errno, strerror, spawn, waitpid, STDERR_FILENO, STDOUT_FILENO } = just.sys
const { socketpair, AF_UNIX, SOCK_STREAM, write, close, read } = just.net
const { loop } = just.factory
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop

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
  writeFile(`${parent}/${fn}`, loadSymbolFile(fn))
}

function isLastBlock (dv, off) {
  for (let n = off + 511; n >= off; --n) {
    if (dv.getUint8(n) !== 0) {
      return false
    }
  }
  return true
}

function verifyChecksum (dv, off) {
  return true
}

function getOctal (buf, off, len) {
  const { u8 } = buf
  let i = 0
  while ((u8[off] < ZERO || u8[off] > SEVEN) && len > 0) {
    len--
    off++
  }
  while (u8[off] >= ZERO && u8[off] <= SEVEN && len > 0) {
    i *= 8
    i += (u8[off] - ZERO)
    len--
    off++
  }
  return i
}

function createFile (src, off, mode) {
  const { u8 } = src
  let len = 0
  let i = off
  while (u8[i++] !== 0) len++
  if (u8[off + len - 1] === SLASH) len--
  const fileName = src.readString(len, off)
  let fd = open(`${justDir}/${fileName}`, O_TRUNC | O_CREAT | O_WRONLY, mode)
  if (fd < 0) {
    const lastSlash = fileName.lastIndexOf('/')
    if (lastSlash > -1) {
      createDirectory(fileName.slice(0, lastSlash))
      fd = open(`${justDir}/${fileName}`, O_TRUNC | O_CREAT | O_WRONLY, mode)
    }
  }
  return fd
}

function createDirectory (src, off, mode) {
  const { u8 } = src
  let len = 0
  let i = off
  while (u8[i++] !== 0) len++
  if (u8[off + len - 1] === SLASH) len--
  const dirName = src.readString(len, off)
  let r = mkdir(`${justDir}/${dirName}`, mode)
  if (r !== 0) {
    if (errno() !== EEXIST) {
      const lastSlash = dirName.lastIndexOf('/')
      if (lastSlash > -1) {
        r = mkdir(`${justDir}/${dirName.slice(0, lastSlash)}`, mode)
      }
    }
  }
  return r
}

function writeBytes (fd, src, off, len) {
  const chunks = Math.ceil(len / 4096)
  const end = off + len
  let bytes = 0
  for (let i = 0; i < chunks; ++i, off += 4096) {
    const towrite = Math.min(end - off, 4096)
    bytes = write(fd, src, towrite, off)
    if (bytes <= 0) break
  }
  if (bytes < 0) {
    just.error(`Error Writing to File: ${errno()} (${strerror(errno())})`)
  }
  if (bytes === 0) {
    just.error(`Zero Bytes Written: ${errno()}`)
  }
  const r = close(fd)
  if (r < 0) {
    just.error(`Error Closing File: ${errno()}`)
    return r
  }
  return bytes
}

function untar (src, size = src.byteLength) {
  const dv = new DataView(src)
  const u8 = new Uint8Array(src)
  src.view = dv
  src.u8 = u8
  for (let off = 0; off < size; off += 512) {
    const end = off + 512
    if (end > size) {
      just.error('Short read')
      return -1
    }
    if (isLastBlock(dv, off)) {
      return 0
    }
    if (!verifyChecksum(dv, off)) {
      just.error('Checksum failed')
      return -1
    }
    let fileSize = getOctal(src, off + 124, 12)
    let fd = 0
    const fileType = (dv.getUint8(off + 156) - ASCII0)
    if (fileType === 5) {
      const mode = getOctal(src, off + 100, 8)
      createDirectory(src, off, mode)
      fileSize = 0
    } else if (fileType === 0) {
      const mode = getOctal(src, off + 100, 8)
      fd = createFile(src, off, mode)
    } else {
      just.error(`unknown file type ${fileType}`)
    }
    if (fd < 0) {
      if (errno() !== EEXIST) {
        just.error(`bad fd: ${fd}`)
        just.error(strerror(errno()))
        return -1
      }
    }
    if (fileSize > 0) {
      writeBytes(fd, src, off + 512, fileSize)
      off += (fileSize + (512 - (fileSize % 512)))
    }
  }
  return -1
}

function gunzip (src) {
  const state = [0, 0]
  const dest = createInflate(src, maxArchiveSize, 31)
  const r = writeInflate(dest, src, 0, src.byteLength, state, Z_NO_FLUSH)
  const [read, write] = state
  if (read === src.byteLength && r === Z_STREAM_END) {
    const tar = new ArrayBuffer(write)
    tar.copyFrom(dest, 0, write, 0)
    endInflate(dest, true)
    return tar
  }
}

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

function make () {
  const stdin = createPipe()
  const stdout = createPipe()
  const stderr = createPipe()
  const pid = spawn('make', justDir, ['-C', justDir, ...just.args.slice(2)], stdin[1], stdout[1], stderr[1])
  close(stdin[0])
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
    // todo: can't we just download this? or let the makefile download it?
    const deps = loadSymbolFile('deps.tar.gz')
    if (deps) {
      writeFile(`${justDir}/deps.tar.gz`, deps)
      const tar = gunzip(deps)
      if (!tar) throw new Error('extracting dependencies failed')
      const r = untar(tar)
      if (r !== 0) throw new Error(`untar failed ${r}`)
    }
    write(STDOUT_FILENO, ArrayBuffer.fromString(` ${ANSI_MAGENTA}time${ANSI_DEFAULT} ${getTime()}\n`))
    write(STDOUT_FILENO, ArrayBuffer.fromString(`${ANSI_YELLOW}building ${just.args.slice(2).join(', ')}${ANSI_DEFAULT}\n`))
    if (just.args.length < 3) {
      just.args.push('runtime')
    }
    const { pid, stdout, stderr } = make()
    if (pid < 0) throw new Error('Could not launch make')
    const buf = new ArrayBuffer(4096)
    loop.add(stdout[0], eventHandler(STDOUT_FILENO, buf))
    loop.add(stderr[0], eventHandler(STDERR_FILENO, buf))
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

const ASCII0 = 48
const SLASH = '/'.charCodeAt(0)
const ZERO = '0'.charCodeAt(0)
const SEVEN = '7'.charCodeAt(0)
let justDir = `${just.env().JUST_TARGET || just.sys.cwd()}/.just`
const maxArchiveSize = just.env().MAX_ARCHIVE || (64 * 1024 * 1024)
const ANSI_DEFAULT = '\u001b[0m'
const ANSI_GREEN = '\u001b[32m'
const ANSI_YELLOW = '\u001b[33m'
const ANSI_MAGENTA = '\u001b[35m'
const ANSI_RED = '\u001b[31m'

module.exports = { build, loadSymbolFile }
