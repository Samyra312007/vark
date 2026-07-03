import { validateEnv, schema, ValidationError } from "../src/index";

describe("Env Validator", () => {
  const env = {
    PORT: "3000",
    DATABASE_URL: "postgresql://localhost:5432/mydb",
    DEBUG: "true",
    NODE_ENV: "development",
  };

  test("validates simple schema", () => {
    const result = validateEnv(env, {
      PORT: { type: "number", required: true },
      NODE_ENV: { type: "string", required: true },
      DEBUG: { type: "boolean", default: false },
    }, { allowUnknown: true });

    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe("development");
    expect(result.DEBUG).toBe(true);
  });

  test("throws error for missing required field", () => {
    expect(() => {
      validateEnv(
        {},
        {
          PORT: { type: "number", required: true },
        },
      );
    }).toThrow(ValidationError);
  });

  test("uses default values", () => {
    const result = validateEnv(
      {},
      {
        PORT: { type: "number", default: 8080 },
      },
    );

    expect(result.PORT).toBe(8080);
  });

  test("validates custom validation", () => {
    const result = validateEnv(
      { PORT: "3000" },
      {
        PORT: {
          type: "number",
          validate: (val: number) => val > 1000 && val < 10000,
        },
      },
    );

    expect(result.PORT).toBe(3000);
  });

  test("fails custom validation", () => {
    expect(() => {
      validateEnv(
        { PORT: "999" },
        {
          PORT: {
            type: "number",
            validate: (val: number) => val > 1000 && val < 10000,
            message: "PORT must be between 1000 and 9999",
          },
        },
      );
    }).toThrow("PORT must be between 1000 and 9999");
  });

  test("validates integer type", () => {
    const result = validateEnv({ PORT: "3000" }, { PORT: { type: "integer" } });
    expect(result.PORT).toBe(3000);

    expect(() => {
      validateEnv({ PORT: "3000.5" }, { PORT: { type: "integer" } });
    }).toThrow();
  });

  test("validates array type", () => {
    const result = validateEnv(
      { ALLOWED_HOSTS: '["localhost","127.0.0.1"]' },
      { ALLOWED_HOSTS: { type: "array" } },
    );
    expect(result.ALLOWED_HOSTS).toEqual(["localhost", "127.0.0.1"]);
  });

  test("validates object type", () => {
    const result = validateEnv(
      { CONFIG: '{"timeout": 30, "retries": 3}' },
      { CONFIG: { type: "object" } },
    );
    expect(result.CONFIG).toEqual({ timeout: 30, retries: 3 });
  });

  test("handles optional fields", () => {
    const result = validateEnv(
      {},
      {
        OPTIONAL_VAR: { type: "string", required: false },
      },
    );
    expect(result.OPTIONAL_VAR).toBeUndefined();
  });

  test("returns data even on validation errors when throwOnError is false", () => {
    const result = validateEnv(
      {},
      {
        PORT: { type: "number", required: true },
        DEBUG: { type: "boolean", default: false },
      },
      { throwOnError: false },
    );
    expect(result.PORT).toBeUndefined();
    expect(result.DEBUG).toBe(false);
  });
});
