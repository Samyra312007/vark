import { ValidationError as ValidationErrorType } from "./types";

export class ValidationError extends Error {
  public readonly errors: ValidationErrorType[];
  public readonly data: Record<string, any>;

  constructor(errors: ValidationErrorType[], data: Record<string, any> = {}) {
    const message = errors.map((e) => `${e.field}: ${e.message}`).join("\n");
    super(`Environment validation failed:\n${message}`);
    this.name = "ValidationError";
    this.errors = errors;
    this.data = data;
  }
}
