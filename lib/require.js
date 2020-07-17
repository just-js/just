const pathMod = require('path')

function wrap (cache = {}) {
  const { join, baseName } = pathMod

  function getDirname () {
    return baseName(join(just.sys.cwd(), just.args[1] || './'))
  }

  function require (path, parent) {
    const ext = path.split('.').slice(-1)[0]
    if (ext === 'js' || ext === 'json') {
      let dirName = parent ? parent.dirName : getDirname()
      const fileName = join(dirName, path)
      if (cache[fileName]) return cache[fileName].exports
      dirName = baseName(fileName)
      const params = ['exports', 'require', 'module']
      const exports = {}
      const module = { exports, dirName, fileName, type: ext }
      module.text = just.fs.readFile(fileName)
      cache[fileName] = module
      if (ext === 'js') {
        const fun = just.vm.compile(module.text, fileName, params, [])
        module.function = fun
        fun.call(exports, exports, p => require(p, module), module)
      } else {
        module.exports = JSON.parse(module.text)
      }
      return module.exports
    }
    return just.requireNative(path, parent)
  }
  return { require, cache }
}

module.exports = { wrap }
