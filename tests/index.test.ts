import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  parseBytes,
  parseBytesOrThrow,
  safeParseBytes,
} from '../src/index'

describe('formatBytes', () => {
  describe('output: string (default)', () => {
    it('returns null for non-finite input', () => {
      expect(formatBytes(Number.NaN)).toBeNull()
      expect(formatBytes(Number.POSITIVE_INFINITY)).toBeNull()
      expect(formatBytes(Number.NEGATIVE_INFINITY)).toBeNull()
    })

    it('formats 0', () => {
      expect(formatBytes(0)).toBe('0B')
    })

    it('formats bytes', () => {
      expect(formatBytes(100)).toBe('100B')
    })

    it('formats kilobytes', () => {
      expect(formatBytes(1024)).toBe('1KB')
      expect(formatBytes(1536)).toBe('1.5KB')
    })

    it('formats megabytes', () => {
      expect(formatBytes(1_048_576)).toBe('1MB')
    })

    it('formats gigabytes', () => {
      expect(formatBytes(1_073_741_824)).toBe('1GB')
    })

    it('formats terabytes', () => {
      expect(formatBytes(1024 ** 4)).toBe('1TB')
    })

    it('formats petabytes', () => {
      expect(formatBytes(1024 ** 5)).toBe('1PB')
    })

    it('formats exabytes', () => {
      expect(formatBytes(1024 ** 6)).toBe('1EB')
    })

    it('handles negative values', () => {
      expect(formatBytes(-1_048_576)).toBe('-1MB')
    })

    it('strips trailing zeros by default', () => {
      expect(formatBytes(1_048_576)).toBe('1MB')
      expect(formatBytes(1_048_576 * 1.5)).toBe('1.5MB')
    })

    it('respects fixedDecimals', () => {
      expect(formatBytes(1_048_576, { fixedDecimals: true })).toBe('1.00MB')
    })

    it('respects decimalPlaces', () => {
      expect(formatBytes(1_234_567_890, { decimalPlaces: 3 })).toBe('1.15GB')
      expect(formatBytes(1_234_567_890, { decimalPlaces: 4 })).toBe('1.1498GB')
    })

    it('respects thousandsSeparator', () => {
      expect(
        formatBytes(1_234_567_890, {
          decimalPlaces: 3,
          thousandsSeparator: ',',
        })
      ).toBe('1.15GB')

      // Force KB to get a large integer part
      expect(
        formatBytes(123_456_789, {
          unit: 'KB',
          thousandsSeparator: ',',
          decimalPlaces: 0,
        })
      ).toBe('120,563KB')
    })

    it('respects unitSeparator', () => {
      expect(formatBytes(1_048_576, { unitSeparator: ' ' })).toBe('1 MB')
    })

    it('respects preferred unit', () => {
      expect(formatBytes(1536, { unit: 'KB' })).toBe('1.5KB')
      expect(formatBytes(1_073_741_824, { unit: 'MB' })).toBe('1024MB')
    })

    it('ignores invalid preferred unit and falls back', () => {
      expect(formatBytes(1_048_576, { unit: 'INVALID' })).toBe('1MB')
    })
  })

  describe('output: array', () => {
    it('returns [value, unit] tuple', () => {
      expect(formatBytes(1_048_576, { output: 'array' })).toEqual(['1', 'MB'])
    })

    it('returns null for non-finite input', () => {
      expect(formatBytes(Number.NaN, { output: 'array' })).toBeNull()
    })

    it('applies formatting options to the value part', () => {
      const result = formatBytes(1_234_567_890, {
        output: 'array',
        decimalPlaces: 3,
        thousandsSeparator: ',',
      })
      expect(result).toEqual(['1.15', 'GB'])
    })
  })

  describe('output: object', () => {
    it('returns { value, unit, bytes } detail', () => {
      expect(formatBytes(1_048_576, { output: 'object' })).toEqual({
        value: '1',
        unit: 'MB',
        bytes: 1_048_576,
      })
    })

    it('returns null for non-finite input', () => {
      expect(
        formatBytes(Number.POSITIVE_INFINITY, { output: 'object' })
      ).toBeNull()
    })

    it('preserves original bytes in the detail', () => {
      const detail = formatBytes(123_456, { output: 'object' })
      expect(detail).not.toBeNull()
      expect(detail?.bytes).toBe(123_456)
    })
  })
})

// ─── parseBytes ─────────────────────────────────────────────────────────────

describe('parseBytes', () => {
  describe('output: number (default)', () => {
    it('returns null for invalid input', () => {
      expect(parseBytes('foobar')).toBeNull()
      expect(parseBytes('')).toBeNull()
      expect(parseBytes(Number.NaN)).toBeNull()
      expect(parseBytes(Number.POSITIVE_INFINITY)).toBeNull()
    })

    it('passes through finite numbers unchanged', () => {
      expect(parseBytes(0)).toBe(0)
      expect(parseBytes(1024)).toBe(1024)
    })

    it('parses plain number strings as bytes', () => {
      expect(parseBytes('512')).toBe(512)
      expect(parseBytes('0')).toBe(0)
    })

    it('parses B', () => {
      expect(parseBytes('100B')).toBe(100)
      expect(parseBytes('100b')).toBe(100)
    })

    it('parses KB', () => {
      expect(parseBytes('1KB')).toBe(1024)
      expect(parseBytes('1kb')).toBe(1024)
      expect(parseBytes('1.5KB')).toBe(1536)
    })

    it('parses MB', () => {
      expect(parseBytes('1MB')).toBe(1_048_576)
      expect(parseBytes('2.5MB')).toBe(2_621_440)
    })

    it('parses GB', () => {
      expect(parseBytes('1GB')).toBe(1_073_741_824)
    })

    it('parses TB', () => {
      expect(parseBytes('1TB')).toBe(1024 ** 4)
    })

    it('parses PB', () => {
      expect(parseBytes('1PB')).toBe(1024 ** 5)
    })

    it('parses EB', () => {
      expect(parseBytes('1EB')).toBe(1024 ** 6)
    })

    it('handles whitespace between value and unit', () => {
      expect(parseBytes('1 KB')).toBe(1024)
      expect(parseBytes('  2.5  MB  ')).toBe(2_621_440)
    })

    it('handles negative values', () => {
      expect(parseBytes('-1KB')).toBe(-1024)
    })

    it('floors fractional byte results', () => {
      expect(parseBytes('1.5B')).toBe(1)
    })
  })

  describe('output: array', () => {
    it('returns [bytes, unit] tuple', () => {
      expect(parseBytes('2.5MB', { output: 'array' })).toEqual([
        2_621_440,
        'MB',
      ])
    })

    it('returns null for invalid input', () => {
      expect(parseBytes('bad', { output: 'array' })).toBeNull()
    })

    it('defaults to B for plain numbers', () => {
      expect(parseBytes(1024, { output: 'array' })).toEqual([1024, 'B'])
    })
  })

  describe('output: object', () => {
    it('returns { value, unit, bytes } detail', () => {
      expect(parseBytes('2.5MB', { output: 'object' })).toEqual({
        value: 2.5,
        unit: 'MB',
        bytes: 2_621_440,
      })
    })

    it('returns null for invalid input', () => {
      expect(parseBytes('bad', { output: 'object' })).toBeNull()
    })

    it('returns B details for plain numbers', () => {
      expect(parseBytes(512, { output: 'object' })).toEqual({
        value: 512,
        unit: 'B',
        bytes: 512,
      })
    })

    it('preserves original parsed float in value', () => {
      const result = parseBytes('3.5TB', { output: 'object' })
      expect(result).not.toBeNull()
      expect(result?.value).toBe(3.5)
      expect(result?.unit).toBe('TB')
    })
  })
})

// ─── safeParseBytes ─────────────────────────────────────────────────────────

describe('safeParseBytes', () => {
  it('returns { ok: true, value } for valid input', () => {
    const result = safeParseBytes('10MB')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(10_485_760)
    }
  })

  it('returns { ok: false, error } for invalid input', () => {
    const result = safeParseBytes('not-a-size')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(TypeError)
      expect(result.error.message).toContain('not-a-size')
    }
  })

  it('returns { ok: false, error } for NaN', () => {
    const result = safeParseBytes(Number.NaN)
    expect(result.ok).toBe(false)
  })

  it('forwards output options', () => {
    const result = safeParseBytes('5GB', { output: 'object' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        value: 5,
        unit: 'GB',
        bytes: 5_368_709_120,
      })
    }
  })
})

// ─── parseBytesOrThrow ──────────────────────────────────────────────────────

describe('parseBytesOrThrow', () => {
  it('returns the byte count for valid input', () => {
    expect(parseBytesOrThrow('1KB')).toBe(1024)
  })

  it('throws TypeError for invalid input', () => {
    expect(() => parseBytesOrThrow('???')).toThrow(TypeError)
    expect(() => parseBytesOrThrow('???')).toThrow(
      new TypeError('Invalid byte value: "???"')
    )
  })

  it('throws for NaN', () => {
    expect(() => parseBytesOrThrow(Number.NaN)).toThrow(TypeError)
  })

  it('supports output: array', () => {
    expect(parseBytesOrThrow('2MB', { output: 'array' })).toEqual([
      2_097_152,
      'MB',
    ])
  })

  it('supports output: object', () => {
    expect(parseBytesOrThrow('2MB', { output: 'object' })).toEqual({
      value: 2,
      unit: 'MB',
      bytes: 2_097_152,
    })
  })
})

// ─── Roundtrip ──────────────────────────────────────────────────────────────

describe('roundtrip', () => {
  const cases = [1024, 1_048_576, 1_073_741_824, 1024 ** 4, 1024 ** 5]

  it.each(cases)('formatBytes → parseBytes roundtrips for %d', (n) => {
    const str = formatBytes(n)
    expect(str).not.toBeNull()
    expect(parseBytes(str ?? '')).toBe(n)
  })

  it('handles fractional roundtrip within floor precision', () => {
    const formatted = formatBytes(1536, { unit: 'KB' })
    expect(formatted).toBe('1.5KB')
    expect(parseBytes(formatted ?? '')).toBe(1536)
  })
})
