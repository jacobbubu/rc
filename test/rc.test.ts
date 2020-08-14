import * as fs from 'fs'
import * as path from 'path'
import { RC } from '../src/'

const name = 'rc' + Math.random().toString().slice(-3)

describe('basic', () => {
  it('env', () => {
    process.env[name + '_envOption'] = '42'
    const rc = new RC(name, {
      option: true,
    })
    expect(rc.config.option).toBe(true)
    expect(rc.config.envOption).toBe('42')
  })

  it('custom argv', () => {
    const customArgv = new RC(
      name,
      {
        option: true,
      },
      {
        // nopt-like argv
        option: false,
        envOption: 24,
        argv: {
          remain: [],
          cooked: ['--no-option', '--envOption', '24'],
          original: ['--no-option', '--envOption=24'],
        },
      }
    )
    expect(customArgv.config.option).toBe(false)
    expect(customArgv.config.envOption).toBe(24)
  })

  it('commented JSON file', () => {
    const jsonrc = path.resolve('.' + name + 'rc')
    fs.writeFileSync(
      jsonrc,
      [
        '{',
        '// json overrides default',
        '"option": false,',
        '/* env overrides json */',
        '"envOption": 24',
        '}',
      ].join('\n')
    )
    const commentedJSON = new RC(name, {
      option: true,
    })
    const eventFn = jest.fn()
    commentedJSON.on('changed', eventFn)

    let { config } = commentedJSON
    expect(config.option).toBe(false)
    expect(config.envOption).toBe('42')
    expect(config.config).toBe(jsonrc)
    expect(config.configs[0]).toBe(jsonrc)

    fs.unlinkSync(jsonrc)

    commentedJSON.update({ more: 193 }, jsonrc)
    config = commentedJSON.config

    expect(config.option).toBe(false)
    expect(config.envOption).toBe('42')
    expect(commentedJSON.config.more).toBe(193)

    expect(eventFn).toHaveBeenCalledTimes(2)
  })
})
