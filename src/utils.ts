import * as fs from 'fs'
import * as path from 'path'
import * as ini from 'ini'
import stripJsonComments = require('strip-json-comments')

export function parse(content: string) {
  // if it ends in .json or starts with { then it must be json.
  // must be done this way, because ini accepts everything.
  // can't just try and parse it and let it throw if it's not ini.
  // everything is ini. even json with a syntax error.

  if (/^\s*{/.test(content)) return JSON.parse(stripJsonComments(content)) as Record<string, any>
  return ini.parse(content)
}

export function env(prefix: string, env: NodeJS.ProcessEnv = process.env) {
  const obj: Record<string, any> = {}
  const len = prefix.length
  for (const k in env) {
    if (k.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
      const keyPath = k.slice(len).split('__')

      // trim empty strings from keyPath array
      let _emptyStringIndex
      while (true) {
        _emptyStringIndex = keyPath.indexOf('')
        if (_emptyStringIndex < 0) break
        keyPath.splice(_emptyStringIndex, 1)
      }

      let cursor = obj
      keyPath.forEach(function _buildSubObj(_subKey, i) {
        // (check for _subKey first so we ignore empty strings)
        // (check for cursor to avoid assignment to primitive objects)
        // tslint:disable-next-line strict-type-predicates
        if (!_subKey || typeof cursor !== 'object') return

        // If this is the last key, just stuff the value in there
        // Assigns actual value from env variable to final key
        // (unless it's just an empty string- in that case use the last valid key)
        if (i === keyPath.length - 1) {
          cursor[_subKey] = env[k]
        }

        // Build sub-object if nothing already exists at the keyPath
        if (cursor[_subKey] === undefined) {
          cursor[_subKey] = {}
        }

        // Increment cursor used to track the object at the current depth
        cursor = cursor[_subKey]
      })
    }
  }

  return obj
}

export function file(...argv: any[]) {
  const args = argv.filter((arg) => arg !== null)

  // path.join breaks if it's a not a string, so just skip this.
  for (const i in args) {
    if ('string' !== typeof args[i]) return
  }

  const file = path.join(...args)

  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf-8')
  }
}

export function find(...argv: any[]) {
  const rel = path.join(...argv)

  function lookup(start: string, rel: string): string | void {
    const file = path.join(start, rel)
    try {
      fs.statSync(file)
      return file
    } catch (err) {
      const dirStart = path.dirname(start)
      if (dirStart !== start) {
        // root
        return lookup(dirStart, rel)
      }
    }
  }

  return lookup(process.cwd(), rel)
}
