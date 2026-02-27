import { formatValue, parseInput, resolveUnit, toBytes } from './utils'

interface FormatBytesOptions {
  /** Number of digits to keep after the decimal point. */
  decimalPlaces?: number
  /** Keep trailing zeroes up to `decimalPlaces` when `true`. */
  fixedDecimals?: boolean
  /** Output shape for the formatter result. */
  output?: 'string' | 'array' | 'object'
  /** Character used to separate groups in the integer part (e.g. `,`). */
  thousandsSeparator?: string
  /** Force a specific unit (`b`, `kb`, `mb`, ...). Auto-selects when omitted. */
  unit?: string
  /** String inserted between numeric value and unit in string output mode. */
  unitSeparator?: string
}

interface FormatBytesDetail {
  /** Original byte value passed to `formatBytes`. */
  bytes: number
  /** Selected unit label (for example `KB`). */
  unit: string
  /** Formatted numeric string in the selected unit. */
  value: string
}

interface ParseBytesOptions {
  /** Output shape for the parser result. */
  output?: 'number' | 'array' | 'object'
}

interface ParseBytesDetail {
  /** Parsed byte value (rounded down to an integer). */
  bytes: number
  /** Parsed unit label (for example `MB`). */
  unit: string
  /** Parsed numeric value before conversion to bytes. */
  value: number
}

interface SafeParseSuccess<T> {
  ok: true
  value: T
}

interface SafeParseFailure {
  error: TypeError
  ok: false
}

type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure

/**
 * Format a byte count into a human-readable value.
 *
 * @param value - Raw byte value to format.
 * @param options - Formatting options.
 * @param options.decimalPlaces - Number of digits after the decimal point.
 * @param options.fixedDecimals - Keep trailing zeroes in decimal output.
 * @param options.output - Return type: string, tuple, or object.
 * @param options.thousandsSeparator - Separator for thousands groups in integer part.
 * @param options.unit - Preferred output unit (auto-selected if invalid or omitted).
 * @param options.unitSeparator - Separator between number and unit in string mode.
 * @returns Formatted value in the shape requested by `options.output`, or `null` for non-finite input.
 */
export function formatBytes(
  value: number,
  options?: FormatBytesOptions & { output?: 'string' }
): string | null
export function formatBytes(
  value: number,
  options: FormatBytesOptions & { output: 'array' }
): [string, string] | null
export function formatBytes(
  value: number,
  options: FormatBytesOptions & { output: 'object' }
): FormatBytesDetail | null
export function formatBytes(
  value: number,
  options: FormatBytesOptions = {}
): string | [string, string] | FormatBytesDetail | null {
  if (!Number.isFinite(value)) {
    return null
  }

  const {
    decimalPlaces = 2,
    fixedDecimals = false,
    thousandsSeparator = '',
    unit: preferredUnit,
    unitSeparator = '',
    output = 'string',
  } = options

  const unit = resolveUnit(Math.abs(value), preferredUnit)
  const str = formatValue(
    value,
    unit,
    decimalPlaces,
    fixedDecimals,
    thousandsSeparator
  )

  switch (output) {
    case 'array':
      return [str, unit]
    case 'object':
      return { value: str, unit, bytes: value }
    default:
      return `${str}${unitSeparator}${unit}`
  }
}

/**
 * Parse bytes from a human-readable value.
 *
 * @param val - Value to parse, such as `1024`, `1kb`, or `1.5 mb`.
 * @param options - Parser options.
 * @param options.output - Return type: number, tuple, or object.
 * @returns Parsed value in the shape requested by `options.output`, or `null` for invalid input.
 */
export function parseBytes(
  val: string | number,
  options?: ParseBytesOptions & { output?: 'number' }
): number | null
export function parseBytes(
  val: string | number,
  options: ParseBytesOptions & { output: 'array' }
): [number, string] | null
export function parseBytes(
  val: string | number,
  options: ParseBytesOptions & { output: 'object' }
): ParseBytesDetail | null
export function parseBytes(
  val: string | number,
  options: ParseBytesOptions = {}
): number | [number, string] | ParseBytesDetail | null {
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      return null
    }

    switch (options.output) {
      case 'array':
        return [val, 'B']
      case 'object':
        return { value: val, unit: 'B', bytes: val }
      default:
        return val
    }
  }

  if (typeof val !== 'string') {
    return null
  }

  const parsed = parseInput(val)
  if (!parsed) {
    return null
  }

  const bytes = toBytes(parsed.floatValue, parsed.unit)
  const unitLabel = parsed.unit.toUpperCase()

  switch (options.output) {
    case 'array':
      return [bytes, unitLabel]
    case 'object':
      return { value: parsed.floatValue, unit: unitLabel, bytes }
    default:
      return bytes
  }
}

/**
 * Safe variant of {@link parseBytes}.
 *
 * @param val - Value to parse, such as `2gb` or `2048`.
 * @param options - Parser options, including optional output shape.
 * @returns `{ ok: true, value }` on success, or `{ ok: false, error }` on failure.
 */
export function safeParseBytes(
  val: string | number,
  options?: ParseBytesOptions & { output?: 'number' }
): SafeParseResult<number>
export function safeParseBytes(
  val: string | number,
  options: ParseBytesOptions & { output: 'array' }
): SafeParseResult<[number, string]>
export function safeParseBytes(
  val: string | number,
  options: ParseBytesOptions & { output: 'object' }
): SafeParseResult<ParseBytesDetail>
export function safeParseBytes(
  val: string | number,
  options: ParseBytesOptions = {}
): SafeParseResult<number | [number, string] | ParseBytesDetail> {
  const invalidValueError = new TypeError(
    `Invalid byte value: ${typeof val === 'string' ? `"${val}"` : String(val)}`
  )

  if (options.output === 'array') {
    const result = parseBytes(val, { output: 'array' })
    if (result === null) {
      return { ok: false, error: invalidValueError }
    }
    return { ok: true, value: result }
  }

  if (options.output === 'object') {
    const result = parseBytes(val, { output: 'object' })
    if (result === null) {
      return { ok: false, error: invalidValueError }
    }
    return { ok: true, value: result }
  }

  const result = parseBytes(val)
  if (result === null) {
    return { ok: false, error: invalidValueError }
  }
  return { ok: true, value: result }
}

/**
 * Strict variant of {@link parseBytes} that throws on invalid input.
 *
 * @param val - Value to parse, such as `500mb` or `512`.
 * @param options - Parser options, including optional output shape.
 * @returns Parsed value in the shape requested by `options.output`.
 * @throws {TypeError} When the input cannot be parsed as bytes.
 */
export function parseBytesOrThrow(
  val: string | number,
  options?: ParseBytesOptions & { output?: 'number' }
): number
export function parseBytesOrThrow(
  val: string | number,
  options: ParseBytesOptions & { output: 'array' }
): [number, string]
export function parseBytesOrThrow(
  val: string | number,
  options: ParseBytesOptions & { output: 'object' }
): ParseBytesDetail
export function parseBytesOrThrow(
  val: string | number,
  options: ParseBytesOptions = {}
) {
  let result:
    | SafeParseResult<number>
    | SafeParseResult<[number, string]>
    | SafeParseResult<ParseBytesDetail>

  if (options.output === 'array') {
    result = safeParseBytes(val, { output: 'array' })
  } else if (options.output === 'object') {
    result = safeParseBytes(val, { output: 'object' })
  } else {
    result = safeParseBytes(val)
  }

  if (!result.ok) {
    throw result.error
  }
  return result.value
}
