# Contributing

## Project overview

`@onelifepolymath/vark` is a TypeScript library that validates `process.env` strings against a declarative schema. The core flow is: parse raw string env → validate each field → apply transformers → return typed results.

### Architecture

```
src/
  types.ts           — Schema, SchemaField, ValidatedEnv, etc.
  transformers.ts    — trim, lowercase, uppercase, custom transform
  validators.ts      — parseValue, validateField, validateAll, validateObject
  async-validators.ts — validateFieldAsync, validateAllAsync
  errors.ts          — ValidationError class
  cache.ts           — ValidationCache, buildCacheKey, invalidateCache
  dotenv.ts          — loadDotenv() helper
  cli.ts             — commander-based validate command
  index.ts           — public API (validateEnv, validateEnvAsync, schema)
bin/
  vark.js            — CLI entry point
tests/
  index.test.ts      — unit tests for all features
  cli.test.ts        — CLI integration tests
```

## Setup

```bash
git clone <repo-url>
cd vark
npm install
```

## Development

### Build

```bash
npm run build
```

Compiles `src/**/*.ts` to `dist/` via `tsc`.

### Test

```bash
npm test
```

Runs Jest with coverage. Tests are co-located under `tests/`.

### Watch mode

```bash
npm run test:watch
```

## Project conventions

### Code style

- **No comments** in source code unless the logic is non-obvious
- **No emoji** in code or commits
- Follow existing patterns — check neighboring files before writing new code
- Prefer editing existing files over creating new ones unless a new concern is genuinely separate

### TypeScript

- `strict: true` in tsconfig
- Target ES2020, CommonJS modules
- All public APIs must have explicit return types
- Use `@types/node` for Node.js built-ins (fs, path)

### Testing

- Jest with ts-jest, Node test environment
- Every feature needs at least one test
- New schema field options need tests for: valid value, invalid value, custom message, interaction with transformers
- CLI tests use `execSync` to run the binary as a subprocess

### Adding a new schema field option

1. Add the type to `SchemaField` in `src/types.ts`
2. Implement the logic in `src/validators.ts` (inside `validateField`)
3. If it supports custom transforms, wire it in `src/transformers.ts`
4. Add the option to the relevant schema builder method in `src/index.ts`
5. Add tests in `tests/index.test.ts`

### Adding a new feature module

1. Create `src/<feature>.ts`
2. Export the public API from `src/index.ts`
3. Add tests
4. Update `README.md` with documentation and examples

### Commit messages

Follow conventional commits:

```
feat: add brief description
fix: correct brief description
docs: update README
test: add tests for feature
refactor: restructure without behavior change
```

## Pull request process

1. Ensure all tests pass (`npm test`)
2. Ensure TypeScript compiles cleanly (`npm run build`)
3. Update `README.md` if the feature changes the public API
4. Open a PR against `main` with a description of the change

## Release process (maintainers)

1. Update version in `package.json`
2. Run `npm test && npm run build`
3. Publish: `npm publish`
