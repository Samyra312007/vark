# Vark

**Type-safe environment variable validation** for Node.js. Parse `process.env` strings into numbers, booleans, arrays, and objects with a declarative schema no more manual `parseInt()` or `JSON.parse()` scattered across your config.

```ts
import { validateEnv, schema } from "@onelifepolymath/vark";

const config = validateEnv(process.env, {
  PORT: schema().number({ required: true }),
  DEBUG: schema().boolean({ default: false }),
});

// config.PORT  → number
// config.DEBUG → boolean
```

## Features

- **Type-safe** — returns correctly typed values inferred from your schema
- **Schema builder** — fluent API via `schema()` or plain objects
- **Transformers** — `trim`, `lowercase`, `uppercase`, and custom `transform`
- **Pattern matching** — regex validation on string fields
- **Enum validation** — restrict values to a predefined set
- **Nested objects** — recursive validation of deeply nested env JSON
- **Custom validation** — per-field sync or async validators with custom messages
- **Defaults & optionals** — default values, optional fields
- **Error aggregation** — collects all errors before reporting
- **Flexible error handling** — throw on error or return partial results
- **Caching** — in-memory cache with optional TTL to skip repeated validation
- **Async validators** — support for async/Promise-based validation functions
- **Dotenv integration** — `loadDotenv()` helper for `.env` file loading
- **CLI tool** — `vark validate` command for validating against schema files
- **Zero dependencies** — built-in parser for `.env` files; `dotenv` is optional

## Installation

```bash
npm install @onelifepolymath/vark
```

For `.env` file loading with `dotenv` (optional):

```bash
npm install dotenv
```

## Quick Start

```ts
import { validateEnv } from "@onelifepolymath/vark";

const config = validateEnv(process.env, {
  PORT: { type: "number", required: true },
  NODE_ENV: { type: "string", required: true },
  DEBUG: { type: "boolean", default: false },
});

console.log(config.PORT);    // 3000 (number)
console.log(config.DEBUG);   // true (boolean)
```

## API

### `validateEnv(env, schema, options?)`

Validates environment variables against a schema (sync).

```ts
validateEnv(
  env: Record<string, string | undefined>,
  schema: Schema,
  options?: {
    throwOnError?: boolean;    // default: true
    allowUnknown?: boolean;    // default: false
    cache?: {                  // optional caching
      enabled: boolean;
      ttl?: number;            // TTL in ms (no expiry if omitted)
    };
  },
): ValidatedEnv<T>
```

### `validateEnvAsync(env, schema, options?)`

Same API as `validateEnv` but supports async `validate` functions. Returns a `Promise<ValidatedEnv<T>>`.

### `schema()`

Fluent builder for schema fields:

```ts
schema().string({ trim: true, lowercase: true, pattern: /^[a-z]+$/ })
schema().number({ enum: [1, 2, 3] })
schema().integer({ transform: (v) => Math.abs(v) })
schema().boolean({ default: false })
schema().array({ items: { type: "number" } })
schema().object({ schema: { NAME: { type: "string" } } })
```

### `SchemaField`

```ts
interface SchemaField<T = any> {
  type: "string" | "number" | "boolean" | "integer" | "array" | "object";
  required?: boolean;
  default?: T;

  // Validation
  validate?: (value: T) => boolean | Promise<boolean>;
  message?: string;

  // Transformers (string-only: trim, lowercase, uppercase)
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  transform?: (value: any) => any;

  // Pattern matching (string-only)
  pattern?: RegExp;

  // Enum validation
  enum?: readonly T[];

  // Nested types
  items?: SchemaField;     // for array items
  schema?: Schema;          // for object fields
}
```

### `loadDotenv(options?)`

Load environment variables from a `.env` file. Tries `dotenv` if installed; falls back to a built-in parser.

```ts
loadDotenv(options?: {
  path?: string;       // default: ".env"
  encoding?: string;   // default: "utf8"
}): Record<string, string>
```

### `invalidCache(key?)`

Clear cached validation results.

```ts
invalidateCache();        // clear all cache
invalidateCache(key);     // clear specific entry
```

### `ValidationError` (class)

Thrown when validation fails with `throwOnError: true`:

```ts
class ValidationError extends Error {
  name: "ValidationError";
  errors: Array<{ field: string; message: string; value?: any }>;
  data: Record<string, any>;
}
```

## CLI

A CLI tool is available via the `vark` binary:

```bash
npx vark validate <schema-file> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `-e, --env-file <path>` | Path to `.env` file (default: `.env`) |
| `--no-throw` | Don't exit with error on validation failures |
| `-u, --allow-unknown` | Allow unknown environment variables |
| `-c, --cache` | Enable caching |
| `--cache-ttl <ms>` | Cache TTL in milliseconds |
| `-o, --output <format>` | Output format: `json` (default) or `text` |

**Exit codes:**
- `0` — all validations passed
- `1` — validation errors (or runtime error)

**Example:**

```bash
# schema.json: { "PORT": { "type": "number" } }
# .env: PORT=3000

vark validate schema.json
# → { "PORT": 3000 }
```

## Examples

### Schema builder with transformers

```ts
const config = validateEnv(process.env, {
  NAME: schema().string({ trim: true, lowercase: true }),
  CODE: schema().string({ uppercase: true, pattern: /^[A-Z]{3}$/ }),
  RATE: schema().number({ transform: (v) => Math.round(v * 100) / 100 }),
});
```

### Enum validation

```ts
const config = validateEnv(process.env, {
  NODE_ENV: {
    type: "string",
    enum: ["development", "staging", "production"],
    message: "NODE_ENV must be one of: development, staging, production",
  },
  LOG_LEVEL: schema().string({ enum: ["debug", "info", "warn", "error"] }),
});
```

### Async validation

```ts
const config = await validateEnvAsync(process.env, {
  API_KEY: {
    type: "string",
    validate: async (value) => {
      const res = await fetch(`https://api.example.com/verify?key=${value}`);
      return res.ok;
    },
    message: "API key is invalid",
  },
});
```

### Nested object validation

```ts
const config = validateEnv(process.env, {
  DB: schema().object({
    schema: {
      HOST: { type: "string", required: true },
      PORT: { type: "number", default: 5432 },
    },
  }),
});
```

### Caching

```ts
const config = validateEnv(process.env, schema, {
  cache: { enabled: true, ttl: 60000 }, // cache for 60s
});
```

### Dotenv integration

```ts
import { loadDotenv, validateEnv } from "@onelifepolymath/vark";

const env = loadDotenv(); // loads .env file
const config = validateEnv(env, schema);
```

### Using with `dotenv`

```bash
npm install dotenv
```

```ts
import dotenv from "dotenv";
import { validateEnv } from "@onelifepolymath/vark";

dotenv.config();
const config = validateEnv(process.env, schema);
```

### Error handling (partial data)

```ts
const config = validateEnv(
  { DEBUG: "true" },
  { PORT: { type: "number", required: true }, DEBUG: { type: "boolean" } },
  { throwOnError: false },
);
// config.PORT  → undefined (missing, but no throw)
// config.DEBUG → true
```

### Arrays and objects (JSON-stringified)

```ts
// env: ALLOWED_HOSTS='["localhost","127.0.0.1"]'
const config = validateEnv(process.env, {
  ALLOWED_HOSTS: { type: "array", items: { type: "string" } },
});
// config.ALLOWED_HOSTS → ["localhost", "127.0.0.1"]
```

### Get all validation errors

```ts
try {
  validateEnv(process.env, schema);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.errors);
    // [{ field: "PORT", message: "Expected a number, got \"abc\"", value: "abc" }]
    console.error(error.data);  // partial validated data
  }
}
```

## TypeScript Types

All types are exported:

```ts
import type {
  Schema,
  SchemaField,
  SchemaType,
  PrimitiveType,
  ValidationResult,
  ValidationError,
  ValidatedEnv,
  CacheOptions,
  LoadDotenvOptions,
} from "@onelifepolymath/vark";
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## License

ISC
