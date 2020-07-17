function HYBIMessage () {
  this.FIN = 1
  this.RSV1 = 0
  this.RSV2 = 0
  this.RSV3 = 0
  this.OpCode = 1
  this.length = 0
}

function Parser () {
  var _parser = this
  var current = new HYBIMessage()
  var pos = 0
  var bpos = 0
  var _complete = false
  var _inheader = true
  var _payload16 = false
  var _payload64 = false

  function onHeader () {
    if (_parser.onHeader) _parser.onHeader(current)
  }

  function onMessage () {
    if (_parser.onMessage) _parser.onMessage(current)
    pos = 0
    _complete = true
  }

  function onChunk (off, len, header) {
    if (_parser.onChunk) _parser.onChunk(off, len, header)
  }

  this.reset = function () {
    current = new HYBIMessage()
    pos = 0
    bpos = 0
    _complete = false
    _inheader = true
    _payload16 = false
    _payload64 = false
  }

  _parser.execute = function (buffer, start, end) {
    var toread, cbyte
    while (start < end) {
      if (_inheader) {
        cbyte = buffer[start++]
        switch (pos) {
          case 0:
            _payload16 = false
            _payload64 = false
            _complete = false
            current.FIN = cbyte >> 7 & 0x01
            current.RSV1 = cbyte >> 6 & 0x01
            current.RSV2 = cbyte >> 5 & 0x01
            current.RSV3 = cbyte >> 4 & 0x01
            current.OpCode = cbyte & 0x0f
            current.maskkey = [0, 0, 0, 0]
            break
          case 1:
            current.mask = cbyte >> 7 & 0x01
            current.length = cbyte & 0x7f
            if (current.length === 126) {
              _payload16 = true
            } else if (current.length === 127) {
              _payload64 = true
            } else if (!current.length) {
              onMessage()
            } else if (!current.mask) {
              _inheader = false
              bpos = 0
              onHeader()
            }
            break
          case 2:
            if (_payload16) {
              current.length = cbyte << 8
            } else if (!_payload64) {
              current.maskkey[0] = cbyte
            }
            break
          case 3:
            if (_payload16) {
              current.length += cbyte
              if (!current.mask) {
                if (current.length) {
                  _inheader = false
                  bpos = 0
                  onHeader()
                } else {
                  onMessage()
                }
              }
            } else if (_payload64) {
              current.length = cbyte << 48
            } else {
              current.maskkey[1] = cbyte
            }
            break
          case 4:
            if (_payload16) {
              current.maskkey[0] = cbyte
            } else if (_payload64) {
              current.length += cbyte << 40
            } else {
              current.maskkey[2] = cbyte
            }
            break
          case 5:
            if (_payload16) {
              current.maskkey[1] = cbyte
            } else if (_payload64) {
              current.length += cbyte << 32
            } else {
              current.maskkey[3] = cbyte
              if (current.length) {
                _inheader = false
                bpos = 0
                onHeader()
              } else {
                onMessage()
              }
            }
            break
          case 6:
            if (_payload16) {
              current.maskkey[2] = cbyte
            } else if (_payload64) {
              current.length += cbyte << 24
            }
            break
          case 7:
            if (_payload16) {
              current.maskkey[3] = cbyte
              if (current.length) {
                _inheader = false
                bpos = 0
                onHeader()
              } else {
                onMessage()
              }
            } else if (_payload64) {
              current.length += cbyte << 16
            }
            break
          case 8:
            if (_payload64) {
              current.length += cbyte << 8
            }
            break
          case 9:
            if (_payload64) {
              current.length += cbyte
              if (current.mask === 0) {
                if (current.length) {
                  _inheader = false
                  bpos = 0
                  onHeader()
                } else {
                  onMessage()
                }
              }
            }
            break
          case 10:
            if (_payload64) {
              current.maskkey[0] = cbyte
            }
            break
          case 11:
            if (_payload64) {
              current.maskkey[1] = cbyte
            }
            break
          case 12:
            if (_payload64) {
              current.maskkey[2] = cbyte
            }
            break
          case 13:
            if (_payload64) {
              current.maskkey[3] = cbyte
              if (current.length) {
                _inheader = false
                bpos = 0
                onHeader()
              } else {
                onMessage()
              }
            }
            break
          default:
            // error
            break
        }
        if (!_complete) {
          pos++
        } else {
          _complete = false
        }
      } else {
        toread = current.length - bpos
        if (toread === 0) {
          _inheader = true
          onMessage()
        } else if (toread <= end - start) {
          onChunk(start, toread, current)
          start += toread
          bpos += toread
          onMessage()
          _inheader = true
        } else {
          toread = end - start
          onChunk(start, toread, current)
          start += toread
          bpos += toread
        }
      }
    }
  }
}

function createMessage (str) {
  const OpCode = 0x81
  const dataLength = str.length
  let startOffset = 2
  let secondByte = dataLength
  let i = 0
  // todo: hmmm....
  if (dataLength > 65536) {
    startOffset = 10
    secondByte = 127
  } else if (dataLength > 125) {
    startOffset = 4
    secondByte = 126
  }
  const buf = new ArrayBuffer(startOffset + str.length)
  const bytes = new Uint8Array(buf)
  bytes[0] = OpCode
  bytes[1] = secondByte | 0
  switch (secondByte) {
    case 126:
      bytes[2] = dataLength >>> 8
      bytes[3] = dataLength % 256
      break
    case 127:
      var l = dataLength
      for (i = 1; i <= 8; ++i) {
        bytes[startOffset - i] = l & 0xff
        l >>>= 8
      }
      break
  }
  buf.writeString(str, startOffset)
  return buf
}

function createBinaryMessage (ab, len, off = 0) {
  const OpCode = 0x81
  const dataLength = len
  let startOffset = 2
  let secondByte = dataLength
  let i = 0
  // todo: hmmm....
  if (dataLength > 65536) {
    startOffset = 10
    secondByte = 127
  } else if (dataLength > 125) {
    startOffset = 4
    secondByte = 126
  }
  const buf = new ArrayBuffer(startOffset + len)
  const bytes = new Uint8Array(buf)
  bytes[0] = OpCode
  bytes[1] = secondByte | 0
  switch (secondByte) {
    case 126:
      bytes[2] = dataLength >>> 8
      bytes[3] = dataLength % 256
      break
    case 127:
      var l = dataLength
      for (i = 1; i <= 8; ++i) {
        bytes[startOffset - i] = l & 0xff
        l >>>= 8
      }
      break
  }
  buf.copyFrom(ab, startOffset, len, off)
  return buf
}

function unmask (bytes, maskkey, off, len) {
  let size = len
  let pos = off
  while (size--) {
    bytes[pos] = bytes[pos] ^ maskkey[(pos - off) % 4]
    pos++
  }
}

module.exports = { Parser, createMessage, createBinaryMessage, unmask }
