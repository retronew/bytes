const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const

type UnitLabel = (typeof UNITS)[number]
type ByteUnit = Lowercase<UnitLabel>

const LOG_1024 = Math.log(1024)

const POWERS = [
  1, // 2^0
  1024, // 2^10
  1_048_576, // 2^20
  1_073_741_824, // 2^30
  1_099_511_627_776, // 2^40
  1_125_899_906_842_624, // 2^50
  1024 ** 6, // 2^60
  1024 ** 7, // 2^70
  1024 ** 8, // 2^80
] as const

const UNIT_VALUE_BY_LABEL = Object.fromEntries(
  UNITS.map((unit, i) => [unit, POWERS[i]])
) as Record<UnitLabel, number>

const UNIT_VALUE_BY_LOWER = Object.fromEntries(
  UNITS.map((unit, i) => [unit.toLowerCase(), POWERS[i]])
) as Record<ByteUnit, number>

const PARSEABLE_UNITS = UNITS.map((u) => u.toLowerCase()).filter(
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
  return normalized in UNIT_VALUE_BY_LOWER ? (normalized as ByteUnit) : null
}

function toUnitLabel(value: string): UnitLabel | null {
  const lowerUnit = toByteUnit(value)
  return lowerUnit ? (lowerUnit.toUpperCase() as UnitLabel) : null
}

export function resolveUnit(magnitude: number, preferredUnit?: string): string {
  if (preferredUnit) {
    const explicitUnit = toUnitLabel(preferredUnit)
    if (explicitUnit) {
      return explicitUnit
    }
  }

  if (magnitude < 1) {
    return 'B'
  }

  let e = Math.floor(Math.log(magnitude) / LOG_1024)
  if (e > 8) {
    e = 8
  }

  return UNITS[e]
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

export function parseInput(
  value: string
): { floatValue: number; unit: ByteUnit } | null {
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
