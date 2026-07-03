# env-validator

**Zero-dependency** TypeScript library for validating environment variables (`process.env`) against a declarative schema. Automatically parses strings into numbers, booleans, arrays, and objects while providing type-safe access to validated values.

```ts
import { validateEnv, schema } from "env-validator";

const config = validateEnv(process.env, {
  PORT: schema().number({ required: true }),
  DEBUG: schema().boolean({ default: false }),
});

// config.PORT  → number
// config.DEBUG → boolean
```

## Features

- **Type-safe** — returns correctly typed values based on your schema
- **Zero dependencies** — no runtime overhead
- **Schema builder** — fluent API via `schema()`
- **Custom validation** — per-field validation functions with custom error messages
- **Defaults & optionals** — default values for missing vars, optional fields
- **Arrays & objects** — parse JSON-stringified env vars into structured data
- **Error aggregation** — collects all validation errors before reporting
- **Flexible error handling** — throw on error or return partial results

## Installation

```bash
npm install env-validator
```

## Quick Start

### Basic validation

```ts
import { validateEnv, ValidationError } from "env-validator";

const env = {
  PORT: "3000",
  NODE_ENV: "production",
  DEBUG: "true",
};

const config = validateEnv(env, {
  PORT: { type: "number", required: true },
  NODE_ENV: { type: "string", required: true },
  DEBUG: { type: "boolean", default: false },
});

console.log(config.PORT); // 3000 (number)
console.log(config.DEBUG); // true (boolean)
```

### Using the schema builder

```ts
import { validateEnv, schema } from "env-validator";

const config = validateEnv(process.env, {
  PORT: schema().number({ required: true, validate: (v) => v >= 1024 }),
  DB_URL: schema().string({ required: true }),
  DEBUG: schema().boolean({ default: false }),
  ALLOWED_ORIGINS: schema().array({ default: [] }),
});
```

## API

### `validateEnv(env, schema, options?)`

Validates environment variables against a schema.

**Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `env` | `Record<string, string \| undefined>` | — | Environment variables object (e.g., `process.env`) |
| `schema` | `Schema` | — | Schema definition (see below) |
| `options.throwOnError` | `boolean` | `true` | If `true`, throws `ValidationError` on failures |
| `options.allowUnknown` | `boolean` | `false` | If `false`, unknown env vars trigger validation errors |

**Returns** — `ValidatedEnv<T>` — an object with type-mapped values.

### `schema()`

Fluent schema builder returning helper methods for each type:

| Method | Returns type |
|--------|-------------|
| `schema().string(opts)` | `SchemaField<string>` |
| `schema().number(opts)` | `SchemaField<number>` |
| `schema().integer(opts)` | `SchemaField<number>` |
| `schema().boolean(opts)` | `SchemaField<boolean>` |
| `schema().array(opts)` | `SchemaField<any[]>` |
| `schema().object(opts)` | `SchemaField<object>` |

### `Schema`

A plain object where keys map to field names and values are `SchemaField` definitions:

```ts
interface Schema {
  [key: string]: SchemaField;
}
```

### `SchemaField`

```ts
interface SchemaField<T = any> {
  type: "string" | "number" | "boolean" | "integer" | "array" | "object";
  required?: boolean;         // default: true
  default?: T;                // fallback if the variable is not set
  validate?: (value: T) => boolean; // custom validator
  message?: string;           // custom error message
  items?: SchemaField;        // for array types: schema for items
  schema?: Schema;            // for object types: nested schema
}
```

### `ValidationError` (class)

Thrown when `throwOnError` is `true` and validation fails.

```ts
class ValidationError extends Error {
  name: "ValidationError";
  errors: Array<{ field: string; message: string; value?: any }>;
  data: Record<string, any>;
}
```

### TypeScript Types

All types are exported from the package:

```ts
import {
  Schema, SchemaField, SchemaType, PrimitiveType,
  ValidationResult, ValidationError, ValidatedEnv,
} from "env-validator";
```

## Examples

### Custom validation with message

```ts
const config = validateEnv(process.env, {
  PORT: {
    type: "number",
    validate: (v) => v >= 1024 && v <= 65535,
    message: "PORT must be between 1024 and 65535",
  },
});
```

### Arrays (JSON-stringified)

```ts
// env: ALLOWED_HOSTS='["localhost","127.0.0.1"]'
const config = validateEnv(process.env, {
  ALLOWED_HOSTS: { type: "array" },
});
// config.ALLOWED_HOSTS → ["localhost", "127.0.0.1"]
```

### Objects (JSON-stringified)

```ts
// env: CONFIG='{"timeout":30,"retries":3}'
const config = validateEnv(process.env, {
  CONFIG: { type: "object" },
});
// config.CONFIG → { timeout: 30, retries: 3 }
```

### Optional fields

```ts
const config = validateEnv({}, {
  OPTIONAL_VAR: { type: "string", required: false },
});
// config.OPTIONAL_VAR → undefined
```

### Suppress errors (partial data)

```ts
const config = validateEnv(
  { DEBUG: "true" },
  { PORT: { type: "number", required: true }, DEBUG: { type: "boolean", default: false } },
  { throwOnError: false },
);
// config.PORT → undefined (missing)
// config.DEBUG → true
```

### Reject unknown variables

```ts
// process.env contains EXTRA_VAR not in schema
validateEnv(process.env, { PORT: { type: "number" } }, { allowUnknown: false });
// Throws ValidationError: Unknown environment variables: EXTRA_VAR
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
