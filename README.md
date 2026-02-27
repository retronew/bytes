# @retronew/bytes

Tiny TypeScript utilities for converting between raw byte values and human-readable byte strings.

## Features

- Format numeric byte values into `B`/`KB`/`MB`/... strings
- Parse strings like `1.5mb`, `42 KB`, or `1024` back into bytes
- Choose return shape: primitive, tuple, or structured object
- Safe and throwing parse variants for different error-handling styles

## Installation

```bash
npm install @retronew/bytes
```

## Quick Start

```ts
import {
  formatBytes,
  parseBytes,
  parseBytesOrThrow,
  safeParseBytes,
} from '@retronew/bytes'

formatBytes(1536) // "1.5KB"
formatBytes(1536, { unitSeparator: ' ' }) // "1.5 KB"
formatBytes(1536, { output: 'array' }) // ["1.5", "KB"]

parseBytes('1.5KB') // 1536
parseBytes('2 mb', { output: 'array' }) // [2097152, "MB"]

const safe = safeParseBytes('bad-input')
if (!safe.ok) {
  console.error(safe.error.message)
}

parseBytesOrThrow('1gb') // 1073741824
```

## API

### `formatBytes(value, options?)`

Formats a numeric byte value.

- `value: number`: byte count to format (must be finite)
- `options.decimalPlaces?: number`: decimal precision (default: `2`)
- `options.fixedDecimals?: boolean`: keep trailing zeros (default: `false`)
- `options.output?: 'string' | 'array' | 'object'`: return shape (default: `'string'`)
- `options.thousandsSeparator?: string`: separator for grouped integers
- `options.unit?: string`: preferred unit (`b`, `kb`, `mb`, ..., `yb`)
- `options.unitSeparator?: string`: separator between value and unit in string mode

Returns:

- `string | null` when `output` is `'string'` (default)
- `[string, string] | null` when `output` is `'array'`
- `{ value: string; unit: string; bytes: number } | null` when `output` is `'object'`

---

### `parseBytes(val, options?)`

Parses a value into bytes.

- `val: string | number`: numeric value or unit string (for example: `1024`, `'1kb'`, `'1.25 MB'`)
- `options.output?: 'number' | 'array' | 'object'`: return shape (default: `'number'`)

Returns:

- `number | null` when `output` is `'number'` (default)
- `[number, string] | null` when `output` is `'array'`
- `{ value: number; unit: string; bytes: number } | null` when `output` is `'object'`

---

### `safeParseBytes(val, options?)`

Same parsing behavior as `parseBytes`, but never returns `null`.

Returns:

- `{ ok: true; value: ... }` on success
- `{ ok: false; error: TypeError }` on failure

---

### `parseBytesOrThrow(val, options?)`

Same parsing behavior as `parseBytes`, but throws a `TypeError` on invalid input.

## Development

```bash
npm install
npm run test
npm run build
```

Lint and format with Ultracite:

```bash
npm run check
npm run fix
```
