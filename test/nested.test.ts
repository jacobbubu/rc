import { RC } from '../src/'

const seed = Math.random().toString().slice(-3)
const n = 'rc' + seed
const N = 'RC' + seed

describe('basic', () => {
  it('env', () => {
    process.env[n + '_someOpt__a'] = '42'
    process.env[n + '_someOpt__x__'] = '99'
    process.env[n + '_someOpt__a__b'] = '186'
    process.env[n + '_someOpt__a__b__c'] = '243'
    process.env[n + '_someOpt__x__y'] = '1862'
    process.env[n + '_someOpt__z'] = '186577'

    // Should ignore empty strings from orphaned '__'
    process.env[n + '_someOpt__z__x__'] = '18629'
    process.env[n + '_someOpt__w__w__'] = '18629'

    // Leading '__' should ignore everything up to 'z'
    process.env[n + '___z__i__'] = '9999'

    // should ignore case for config name section.
    process.env[N + '_test_upperCase'] = '187'

    function testPrefix(prefix: string) {
      const config = new RC(prefix, {
        option: true,
      }).config

      expect(config.option).toBe(true)
      expect(config.someOpt.a).toBe('42')
      expect(config.someOpt.x).toBe('99')

      // Should not override `a` once it's been set
      expect(config.someOpt.a).toBe('42')

      // Should not override `x` once it's been set
      expect(config.someOpt.x).toBe('99')

      expect(config.someOpt.z).toBe('186577')

      // Should not override `z` once it's been set
      expect(config.someOpt.z).toBe('186577')

      expect(config.someOpt.w.w).toBe('18629')
      expect(config.z.i).toBe('9999')
      expect(config.test_upperCase).toBe('187')
    }
    testPrefix(n)
    testPrefix(N)
  })
})
