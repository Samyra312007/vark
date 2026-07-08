import { SchemaField, Schema, PrimitiveType } from './types';
import { parseValue } from './validators';
import { applyTransformers } from './transformers';

export async function validateFieldAsync(
    key: string,
    rawValue: any,
    fieldSchema: SchemaField,
): Promise<{ value: any; error?: string }> {
    const { type, required = true, default: defaultValue, validate, message, pattern, enum: enumValues } = fieldSchema;
    let value: any = rawValue;

    if (value === undefined || value === null) {
        if (defaultValue !== undefined) {
            return { value: defaultValue };
        } else if (!required) {
            return { value: undefined };
        } else {
            return {
                value: undefined,
                error: message || `Environment variable "${key}" is required but not set`
            };
        }
    }

    if (type === 'array') {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(parsed)) {
                throw new Error(`Expected an array, got ${typeof parsed}`);
            }

            if (fieldSchema.items) {
                const itemErrors: string[] = [];
                for (let i = 0; i < parsed.length; i++) {
                    try {
                        const itemValue = await validateFieldAsync(
                            `${key}[${i}]`,
                            String(parsed[i]),
                            fieldSchema.items!
                        );
                        if (itemValue.error) {
                            itemErrors.push(itemValue.error);
                        }
                    } catch (err: any) {
                        itemErrors.push(err.message);
                    }
                }
                if (itemErrors.length > 0) {
                    return { value: parsed, error: itemErrors.join('; ') };
                }
            }
            value = applyTransformers(parsed, fieldSchema);
            if (enumValues && !enumValues.includes(value)) {
                return {
                    value,
                    error: message || `Environment variable "${key}" must be one of: ${enumValues.join(", ")}`
                };
            }
        } catch (err: any) {
            return {
                value: undefined,
                error: message || `Environment variable "${key}" must be a valid JSON array: ${err.message}`
            };
        }
        return { value };
    }

    if (type === 'object') {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error(`Expected an object, got ${typeof parsed}`);
            }
            value = applyTransformers(parsed, fieldSchema);
            if (enumValues && !enumValues.includes(value)) {
                return {
                    value,
                    error: message || `Environment variable "${key}" must be one of: ${enumValues.join(", ")}`
                };
            }

            if (fieldSchema.schema) {
                const nestedResult = await validateAllAsync(value, fieldSchema.schema);
                if (nestedResult.errors.length > 0) {
                    const errorStr = nestedResult.errors
                        .map(e => e.message)
                        .join("; ");
                    return {
                        value: nestedResult.data,
                        error: message || errorStr
                    };
                }
                return { value: nestedResult.data };
            }
        } catch (err: any) {
            return {
                value: undefined,
                error: message || `Environment variable "${key}" must be a valid JSON object: ${err.message}`
            };
        }
        return { value };
    }

    try {
        const parsedValue = parseValue(value, type as PrimitiveType);
        const transformedValue = applyTransformers(parsedValue, fieldSchema);

        if (pattern && typeof transformedValue === "string" && !pattern.test(transformedValue)) {
            return {
                value: transformedValue,
                error: message || `Environment variable "${key}" does not match pattern /${pattern.source}/`
            };
        }

        if (enumValues && !enumValues.includes(transformedValue)) {
            return {
                value: transformedValue,
                error: message || `Environment variable "${key}" must be one of: ${enumValues.join(", ")}`
            };
        }

        if (validate) {
            const result = await validate(transformedValue);
            if (!result) {
                return {
                    value: transformedValue,
                    error: message || `Environment variable "${key}" failed custom validation`
                };
            }
        }
        return { value: transformedValue };
    } catch (err: any) {
        return {
            value: undefined,
            error: message || err.message
        };
    }
}

export async function validateAllAsync(
    env: Record<string, any>,
    schema: Record<string, SchemaField>
): Promise<{ data: Record<string, any>; errors: Array<{field: string; message: string; value?: any}> }> {
    const data: Record<string, any> = {};
    const errors: Array<{ field: string; message: string; value?: any }> = [];

    for (const [key, fieldSchema] of Object.entries(schema)) {
        const rawValue = env[key];
        const result = await validateFieldAsync(key, rawValue, fieldSchema);

        if (result.error) {
            errors.push({
                field: key,
                message: result.error,
                value: rawValue
            });
        } else {
            data[key] = result.value;
        }
    }
    return { data, errors };
}
