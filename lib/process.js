const { cwd, errno, strerror, spawn, waitpid } = just.sys
const { pipe, write, close, read, O_NONBLOCK, O_CLOEXEC } = just.net
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT } = just.loop
const { loop } = just.factory
const { STDOUT_FILENO, STDERR_FILENO } = just.sys

function createPipe () {
  const fds = []
  const r = pipe(fds, O_CLOEXEC | O_NONBLOCK)
  if (r !== 0) throw new Error(`pipe ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

const READABLE = 0
const WRITABLE = 1

const processes = []

function launch (program, args, workDir = cwd(), buf = new ArrayBuffer(16384), stdio) {
  const stdin = stdio ? [-1, stdio.in] : createPipe()
  const stdout = stdio ? [-1, stdio.out] : createPipe()
  const stderr = stdio ? [-1, stdio.err] : createPipe()
  // pass in the sides of the pipe to be used for STDIN, STDOUT and STDERR by child process
  const pid = spawn(program, workDir, args, stdin[READABLE], stdout[WRITABLE], stderr[WRITABLE])
  // close the child sides of the pipes in this process
  close(stdin[READABLE])
  close(stdout[WRITABLE])
  close(stderr[WRITABLE])
  let closed = false
  // listen for close of stdin
  // TODO: fix pause/resume here
  loop.add(stdin[WRITABLE], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && !closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLOUT) {
      loop.update(fd, EPOLLIN)
      process.onWritable && process.onWritable()
    }
  }, EPOLLOUT)
  // listen to our side of the stdout pipe
  // todo: emit onReadable and onWritable and let consumer do the reading
  loop.add(stdout[READABLE], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && !closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLIN) {
      process.onStdout && process.onStdout(buf, read(fd, buf, 0, buf.byteLength))
    }
  })
  // listen to our side of the stderr pipe
  loop.add(stderr[READABLE], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && !closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLIN) {
      process.onStderr && process.onStderr(buf, read(fd, buf, 0, buf.byteLength))
    }
  })
  const process = { pid, stdin, stdout, stderr }
  process.pause = () => {
    loop.update(stdin[WRITABLE], EPOLLOUT)
  }
  process.write = (b = buf, len = b.byteLength) => {
    // write to our side of the stdin pipe
    return write(stdin[WRITABLE], b, len, 0)
  }
  processes[pid] = process
  process.onStdout = (buf, len) => write(STDOUT_FILENO, buf, len, 0)
  process.onStderr = (buf, len) => write(STDERR_FILENO, buf, len, 0)
  return process
}

function watch (p) {
  return new Promise((resolve) => {
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), p.pid)
      if (kpid === p.pid) {
        p.status = status
        // todo - if our child process has children stdio buffers could still have data
        just.sys.nextTick(() => {
          just.clearInterval(timer)
          loop.remove(p.stdin[WRITABLE])
          close(p.stdin[WRITABLE])
          loop.remove(p.stdout[READABLE])
          close(p.stdout[READABLE])
          loop.remove(p.stderr[READABLE])
          close(p.stderr[READABLE])
        })
        resolve(p)
      }
    }, 100)
  })
}

module.exports = { launch, watch }
