import { SchemaField, PrimitiveType } from './types';

/**
 * Parse a string value to the appropriate type
 */
export function parseValue(value: string | undefined, type: PrimitiveType): any {
    if(value === undefined || value === null){
        return undefined;
    }

    switch (type) {
        case 'string':
            return value;
        case  'number':
            const num = Number(value);
            if(isNaN(num)){
                throw new Error(`Expected a number, got "${value}"`);
            }
            return num;
        case 'integer':
            const int = parseInt(value, 10);
            if(isNaN(int) || int.toString() !== value){
                throw new Error(`Expected an integer, got "${value}"`);
            }
            return int;
        case 'boolean':
            if (value.toLowerCase() === 'true' || value === '1') return true;
            if(value.toLowerCase() === 'false' || value === '0') return false;
            throw new Error(`Expected a token (true/false/1/0), got "${value}"`);
        default:
            return value;
    }
}

/**
 * Validate a single field against its schema
 */
export function validateField(
    key: string,
    rawValue: string | undefined,
    fieldSchema: SchemaField,
) : { value: any; error?: string } { 
    const { type, required = true, default: defaultValue, validate, message } = fieldSchema;

    //check if value is provided
    let value = rawValue;

    //Handle missing values
    if (value === undefined || value === null) {
        if (defaultValue !== undefined){
            //use default value
            value = defaultValue;
        } else if (!required) {
            //not required and no default, skip validation
            return {value: undefined};
        } else {
            //Required but missing
            return {
                value: undefined,
                error: message || `Environment variable "${key}" is required but not set`
            };
        }
    }

    //handle array type
    if(type === 'array'){
        try{
            //try to parse as JSON array
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if(!Array.isArray(parsed)) {
                throw new Error(`Expected an array, got ${typeof parsed}`);
            }

            //validate array items if items schema is provided
            if(fieldSchema.items){
                const itemErrors: string[] = [];
                parsed.forEach((item, index) => {
                    try {
                        // For simplicity, validate each item
                        const itemValue = validateField(
                            `${key}[${index}]`,
                            String(item),
                            fieldSchema.items!
                        );
                        if(itemValue.error){
                            itemErrors.push(itemValue.error);
                        }
                    } catch (err: any){
                        itemErrors.push(err.message);
                    }
                });
                if(itemErrors.length > 0){
                    return {value: parsed, error: itemErrors.join('; ')};
                }
            }
            value = parsed;
        } catch (err: any){
            return {
                value: undefined,
                error: message || `Environment variable "${key}" must be a valid JSON array: ${err.message}`
            };
        }
        return { value };
    }

    // Handle object type
    if(type === 'object'){
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if(typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error(`Expected an object, got ${typeof parsed}`);
            }
            value = parsed;
        } catch (err: any) {
            return {
                value: undefined,
                error: message || `Environment variable "{key}" must be a valid JSON object: ${err.message}`
            };
        }
        return { value };
    }

    // Handle primitive types
    try {
        const parsedValue = parseValue(value as string, type as PrimitiveType);

        //Run custom validation if provided
        if(validate && !validate(parsedValue)) {
            return {
                value: parsedValue,
                error: message || `Environment variable "${key}" failed custom vaildation`
            };
        }
        return { value: parsedValue };
    } catch (err: any) {
        return {
            value: undefined;
            error: message || err.message
        };
    }
}

/**
 * Validate multiple fields against a schema
 */
export function validateAll(
    env: Record<string, string | undefined>,
    schema: Record<string, SchemaField>
) : { data: Record<string, any>; errors: Array<{field: string; message: string; value:? any}> } {
    const data: Record<string, any> = {};
    const errors: Array<{ field: string; message: string; value:? any }> = [];

    for(const [key, fieldSchema] of Object.entries(schema)) {
        const rawValue = env[key];
        const result = validateField(key, rawValue, fieldSchema);

        if(result.error){
            errors.push({
                field: key,
                message: result.error,
                value: rawValue
            });
        } else {
            data[key] = result.value;
        }
    }
    return {data, errors};
}