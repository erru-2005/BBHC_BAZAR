// Minimal stream polyfill for browser compatibility
// Used by xlsx-js-style library

export const Readable = class Readable {
  constructor() {
    this._readableState = {}
  }
  read() {
    return null
  }
  pipe() {
    return this
  }
  on() {
    return this
  }
  once() {
    return this
  }
  emit() {
    return this
  }
}

export default {
  Readable,
}

