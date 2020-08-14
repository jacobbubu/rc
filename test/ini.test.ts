import * as INI from 'ini'
import * as cc from '../src/utils'

describe('ini', () => {
  it('env', () => {
    const obj = { hello: true }
    const json = cc.parse(JSON.stringify(obj))
    const ini = cc.parse(INI.stringify(obj))
    expect(json).toEqual(ini)
  })
})
