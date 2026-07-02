import { Schema, ValidationResult, ValidatedEnv } from "./types";
import { validateAll } from "./validators";
import { ValidationError as CustomValidationError } from "./errors";

/**
 * Validate environment variables against a schema
 * @param env - Environment variables object (e.g., process.env)
 * @param schema - Schema definition
 * @param options - Options for validation
 * @returns Validated and typed environment variables
 */
export function validateEnv<T extends Schema>(
  env: Record<string, string | undefined>,
  schema: T,
  options: {
    throwOnError?: boolean;
    allowUnknown?: boolean;
  } = { throwOnError: true, allowUnknown: false },
): ValidatedEnv<T> {
  const { throwOnError = true, allowUnknown = false } = options;

  // Filter environment variables if allowUnknown is false
  let envToValidate = env;
  if (!allowUnknown) {
    const allowedKeys = Object.keys(schema);
    envToValidate = {};
    for (const key of allowedKeys) {
      if (key in env) {
        envToValidate[key] = env[key];
      }
    }
  }

  // Validate
  const { data, errors } = validateAll(envToValidate, schema);

  // Check for unknown keys
  if (!allowUnknown) {
    const unknownKeys = Object.keys(env).filter((key) => !(key in schema));
    if (unknownKeys.length > 0) {
      errors.push({
        field: "unknown_keys",
        message: `Unknown environment variables: ${unknownKeys.join(", ")}`,
        value: unknownKeys,
      });
    }
  }

  // Handle errors
  if (errors.length > 0) {
    if (throwOnError) {
      throw new CustomValidationError(errors, data);
    }
    return data as ValidatedEnv<T>;
  }

  return data as ValidatedEnv<T>;
}

/**
 * Create a schema builder for easier schema creation
 */
export function schema() {
  return {
    string: (options: {
      required?: boolean;
      default?: string;
      validate?: (value: string) => boolean;
      message?: string;
    }) => ({
      type: "string" as const,
      ...options,
    }),
    number: (options: {
      required?: boolean;
      default?: number;
      validate?: (value: number) => boolean;
      message?: string;
    }) => ({
      type: "number" as const,
      ...options,
    }),
    integer: (options: {
      required?: boolean;
      default?: number;
      validate?: (value: number) => boolean;
      message?: string;
    }) => ({
      type: "integer" as const,
      ...options,
    }),
    boolean: (options: {
      required?: boolean;
      default?: boolean;
      validate?: (value: boolean) => boolean;
      message?: string;
    }) => ({
      type: "boolean" as const,
      ...options,
    }),
    array: (options: {
      required?: boolean;
      default?: any[];
      items?: any;
      validate?: (value: any[]) => boolean;
      message?: string;
    }) => ({
      type: "array" as const,
      ...options,
    }),
    object: (options: {
      required?: boolean;
      default?: Record<string, any>;
      validate?: (value: Record<string, any>) => boolean;
      message?: string;
    }) => ({
      type: "object" as const,
      ...options,
    }),
  };
}

// Export types
export * from "./types";
export { CustomValidationError as ValidationError };
