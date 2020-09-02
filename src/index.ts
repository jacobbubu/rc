import { join } from 'path'
import minimist = require('minimist')
import deepMerge = require('deepmerge')
import equal = require('deep-equal')
import * as cc from './utils'
import { EventEmitter } from 'events'

const etc = '/etc'
const win = process.platform === 'win32'
const home = win ? process.env.USERPROFILE : process.env.HOME

export type ParseFunc = typeof cc.parse
export type ConfigType = Record<string, any>

export interface RC {
  addListener(
    event: 'changed',
    listener: (newConfig: ConfigType, oldConfig: ConfigType) => void
  ): this
  on(event: 'changed', listener: (newConfig: ConfigType, oldConfig: ConfigType) => void): this
  once(event: 'changed', listener: (newConfig: ConfigType, oldConfig: ConfigType) => void): this
  removeListener(
    event: 'changed',
    listener: (newConfig: ConfigType, oldConfig: ConfigType) => void
  ): this
  off(event: 'changed', listener: (newConfig: ConfigType, oldConfig: ConfigType) => void): this
  emit(event: 'changed', newConfig: ConfigType, oldConfig: ConfigType): boolean
}

export class RC extends EventEmitter {
  private readonly _env: NodeJS.ProcessEnv
  private readonly _configs: ConfigType[] = []
  private readonly _configFiles: string[] = []
  private _mergedConfig: ConfigType | null = null

  constructor(
    private readonly _name: string,
    private readonly _defaults: ConfigType,
    private readonly _argv: Record<string, any> = minimist(process.argv.slice(2)),
    private readonly _parse: ParseFunc = cc.parse
  ) {
    super()
    // tslint:disable-next-line strict-type-predicates
    if ('string' !== typeof _name) {
      throw new Error('rc(name): name *must* be string')
    }
    this._env = cc.env(_name + '_')
  }

  update(config?: ConfigType, rcFile?: string) {
    this.prepare()

    if (config) {
      if (rcFile) {
        const index = this._configFiles.indexOf(rcFile)
        if (index >= 0) {
          this._configs[index] = config
        } else {
          this._configFiles.push(rcFile)
          this._configs.push(config)
        }
      } else {
        // if no file is specified, the updated config gets the highest priority
        this._configs.push(config)
      }
    }
    this._configs.unshift(this._defaults)

    const all = this._configs.concat([this._env, this._argv])
    if (this._configFiles.length) {
      all.push({
        configs: this._configFiles,
        config: this._configFiles[this._configFiles.length - 1],
      })
    }

    const newConfig = deepMerge.all(all)
    if (!equal(newConfig, this._mergedConfig)) {
      this.emit('changed', newConfig, this._mergedConfig!)
      this._mergedConfig = newConfig
    }

    return this._mergedConfig
  }

  get config() {
    if (!this._mergedConfig) {
      this.update()
    }
    return this._mergedConfig!
  }

  private prepare() {
    const name = this._name
    const list = (!win ? [join(etc, name, 'config'), join(etc, name + 'rc')] : []).concat(
      home
        ? [
            join(home, '.config', name, 'config'),
            join(home, '.config', name),
            join(home, '.' + name, 'config'),
            join(home, '.' + name + 'rc'),
          ]
        : []
    )
    const foundFile = cc.find('.' + name + 'rc')
    if (foundFile) {
      list.push(foundFile)
    }
    if (this._env.config) {
      list.push(this._env.config)
    }
    if (this._argv.config) {
      list.push(this._argv.config)
    }
    const self = this
    list.forEach((f) => self.addConfigFile(f))
  }

  private addConfigFile(file: string) {
    if (this._configFiles.indexOf(file) >= 0) return

    const fileContent = cc.file(file)
    if (fileContent) {
      let parsed: ConfigType
      try {
        parsed = this._parse(fileContent)
      } catch (err) {
        // throw error when first parse the file
        if (!this._mergedConfig) {
          throw err
        }
        return
      }
      this._configs.push(parsed)
      this._configFiles.push(file)
    }
  }
}
