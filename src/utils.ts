const UNITS = [
  { unit: 'B', power: 0 },
  { unit: 'KB', power: 1 },
  { unit: 'MB', power: 2 },
  { unit: 'GB', power: 3 },
  { unit: 'TB', power: 4 },
  { unit: 'PB', power: 5 },
  { unit: 'EB', power: 6 },
  { unit: 'ZB', power: 7 },
  { unit: 'YB', power: 8 },
] as const

type UnitLabel = (typeof UNITS)[number]['unit']
type ByteUnit = Lowercase<UnitLabel>

interface ParsedInput {
  floatValue: number
  unit: ByteUnit
}

const UNIT_VALUE_BY_LABEL = Object.fromEntries(
  UNITS.map(({ unit, power }) => [unit, 1024 ** power])
) as Record<UnitLabel, number>

const UNIT_VALUE_BY_LOWER = Object.fromEntries(
  UNITS.map(({ unit, power }) => [unit.toLowerCase(), 1024 ** power])
) as Record<ByteUnit, number>

const UNIT_THRESHOLDS = [...UNITS]
  .reverse()
  .map(({ unit, power }) => ({ unit, threshold: 1024 ** power }))

const PARSEABLE_UNITS = UNITS.map(({ unit }) => unit.toLowerCase()).filter(
  (unit) => unit !== 'b'
)

const PARSE_RE = new RegExp(
  `^([+-]?\\d+(?:\\.\\d+)?)\\s*(${PARSEABLE_UNITS.join('|')}|b)$`,
  'i'
)

const FORMAT_THOUSANDS_RE = /\B(?=(\d{3})+(?!\d))/g
const FORMAT_DECIMALS_RE = /(?:\.0*|(\.[^0]+)0+)$/

function toByteUnit(value: string): ByteUnit | null {
  const normalized = value.toLowerCase()
  if (normalized in UNIT_VALUE_BY_LOWER) {
    return normalized as ByteUnit
  }
  return null
}

function toUnitLabel(value: string): UnitLabel | null {
  const lowerUnit = toByteUnit(value)
  if (!lowerUnit) {
    return null
  }
  return lowerUnit.toUpperCase() as UnitLabel
}

export function resolveUnit(magnitude: number, preferredUnit?: string): string {
  if (preferredUnit) {
    const explicitUnit = toUnitLabel(preferredUnit)
    if (explicitUnit) {
      return explicitUnit
    }
  }

  for (const { threshold, unit } of UNIT_THRESHOLDS) {
    if (magnitude >= threshold) {
      return unit
    }
  }

  return 'B'
}

export function formatValue(
  value: number,
  unit: string,
  decimalPlaces: number,
  fixedDecimals: boolean,
  thousandsSeparator: string
): string {
  const normalizedUnit = toUnitLabel(unit)
  if (!normalizedUnit) {
    return Number.NaN.toString()
  }

  const divisor = UNIT_VALUE_BY_LABEL[normalizedUnit]
  let formattedValue = (value / divisor).toFixed(decimalPlaces)

  if (!fixedDecimals) {
    formattedValue = formattedValue.replace(FORMAT_DECIMALS_RE, '$1')
  }

  if (thousandsSeparator) {
    const [integerPart, decimalPart] = formattedValue.split('.')
    const groupedInteger = integerPart.replace(
      FORMAT_THOUSANDS_RE,
      thousandsSeparator
    )
    formattedValue =
      decimalPart !== undefined
        ? `${groupedInteger}.${decimalPart}`
        : groupedInteger
  }

  return formattedValue
}

export function parseInput(value: string): ParsedInput | null {
  const trimmed = value.trim()
  const strictMatch = PARSE_RE.exec(trimmed)

  if (strictMatch) {
    const floatValue = Number.parseFloat(strictMatch[1])
    const unit = toByteUnit(strictMatch[2])

    if (!(Number.isFinite(floatValue) && unit)) {
      return null
    }

    return { floatValue, unit }
  }

  const floatValue = Number.parseFloat(trimmed)
  if (!Number.isFinite(floatValue)) {
    return null
  }

  return { floatValue, unit: 'b' }
}

export function toBytes(floatValue: number, unit: string): number {
  const normalizedUnit = toByteUnit(unit)
  if (!normalizedUnit) {
    return Number.NaN
  }
  return Math.floor(UNIT_VALUE_BY_LOWER[normalizedUnit] * floatValue)
}
