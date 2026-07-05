export type PrimitiveType = "string" | "number" | "boolean" | "integer";

export type SchemaType = PrimitiveType | "array" | "object";

export interface SchemaField<T = any> {
  /** The expected type of the environment variable */
  type: SchemaType;
  /** Whether the variable is required (default: true) */
  required?: boolean;
  /** Default value if not provided */
  default?: T;
  /** Custom validation function */
  validate?: (value: T) => boolean;
  /** Custom error message */
  message?: string;
  /** For arrays: the type of items */
  items?: SchemaField;
  /** For objects: the schema of the object */
  schema?: Schema;

  // -- Transformers --
  /** Trim whitespace (string only) */
  trim?: boolean;
  /** Convert to lowercase (string only) */
  lowercase?: boolean;
  /** Convert to uppercase (string only) */
  uppercase?: boolean;
  /** Custom transformation function */
  transform?: (value: any) => any;

  // -- Pattern matching --
  /** Regex pattern (string only) */
  pattern?: RegExp;

  // -- Enum validation --
  /** Restrict to specific values */
  enum?: readonly any[];
}

export interface Schema {
  [key: string]: SchemaField;
}

export interface ValidationResult<T = any> {
  /** Whether validation passed */
  valid: boolean;
  /** The validated and transformed values */
  data: T;
  /** Validation errors */
  errors: ValidationError[];
}

export interface ValidationError {
  /** The field that failed validation */
  field: string;
  /** The error message */
  message: string;
  /** The value that was provided */
  value?: any;
}
export type ValidatedEnv<T extends Schema> = {
  [K in keyof T]: T[K]["type"] extends "object"
    ? T[K]["schema"] extends Schema
      ? ValidatedEnv<T[K]["schema"]>
      : Record<string, any>
    : T[K]["type"] extends "number"
      ? number
      : T[K]["type"] extends "boolean"
        ? boolean
        : T[K]["type"] extends "integer"
          ? number
          : T[K]["type"] extends "array"
            ? any[]
            : T[K]["type"] extends "object"
              ? Record<string, any>
              : string
};