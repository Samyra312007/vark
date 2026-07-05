import { SchemaField } from "./types";

export function applyTransformers(value: any, field: SchemaField): any {
  if (field.trim && typeof value === "string") {
    value = value.trim();
  }
  if (field.lowercase && typeof value === "string") {
    value = value.toLowerCase();
  }
  if (field.uppercase && typeof value === "string") {
    value = value.toUpperCase();
  }
  if (field.transform) {
    value = field.transform(value);
  }
  return value;
}
