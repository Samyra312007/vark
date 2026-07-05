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

  // ── Transformers ──────────────────────────────────────────────

  test("trims string values", () => {
    const result = validateEnv({ NAME: "  hello  " }, {
      NAME: { type: "string", trim: true },
    });
    expect(result.NAME).toBe("hello");
  });

  test("lowercases string values", () => {
    const result = validateEnv({ NAME: "HELLO" }, {
      NAME: { type: "string", lowercase: true },
    });
    expect(result.NAME).toBe("hello");
  });

  test("uppercases string values", () => {
    const result = validateEnv({ NAME: "hello" }, {
      NAME: { type: "string", uppercase: true },
    });
    expect(result.NAME).toBe("HELLO");
  });

  test("applies custom transform function", () => {
    const result = validateEnv({ COUNT: "5" }, {
      COUNT: { type: "number", transform: (v: any) => (v as number) * 2 },
    });
    expect(result.COUNT).toBe(10);
  });

  test("chains trim and lowercase", () => {
    const result = validateEnv({ NAME: "  Hello World  " }, {
      NAME: { type: "string", trim: true, lowercase: true },
    });
    expect(result.NAME).toBe("hello world");
  });

  // ── Pattern matching ──────────────────────────────────────────

  test("validates string matches pattern", () => {
    const result = validateEnv({ EMAIL: "user@example.com" }, {
      EMAIL: { type: "string", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    });
    expect(result.EMAIL).toBe("user@example.com");
  });

  test("throws when string does not match pattern", () => {
    expect(() => {
      validateEnv({ EMAIL: "not-an-email" }, {
        EMAIL: { type: "string", pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      });
    }).toThrow(/does not match pattern/);
  });

  test("pattern with custom message", () => {
    expect(() => {
      validateEnv({ CODE: "abc" }, {
        CODE: { type: "string", pattern: /^\d{4}$/, message: "CODE must be 4 digits" },
      });
    }).toThrow("CODE must be 4 digits");
  });

  // ── Enum validation ───────────────────────────────────────────

  test("validates string enum (pass)", () => {
    const result = validateEnv({ NODE_ENV: "production" }, {
      NODE_ENV: { type: "string", enum: ["development", "staging", "production"] },
    });
    expect(result.NODE_ENV).toBe("production");
  });

  test("throws when value not in enum", () => {
    expect(() => {
      validateEnv({ NODE_ENV: "invalid" }, {
        NODE_ENV: { type: "string", enum: ["development", "staging", "production"] },
      });
    }).toThrow(/must be one of/);
  });

  test("validates number enum (pass)", () => {
    const result = validateEnv({ PORT: "3000" }, {
      PORT: { type: "number", enum: [3000, 3001, 3002] },
    });
    expect(result.PORT).toBe(3000);
  });

  test("throws when number not in enum", () => {
    expect(() => {
      validateEnv({ PORT: "9999" }, {
        PORT: { type: "number", enum: [3000, 3001, 3002] },
      });
    }).toThrow(/must be one of/);
  });

  test("enum with custom message", () => {
    expect(() => {
      validateEnv({ LEVEL: "warn" }, {
        LEVEL: { type: "string", enum: ["debug", "info", "error"], message: "Invalid log level" },
      });
    }).toThrow("Invalid log level");
  });

  // ── Combined features ─────────────────────────────────────────

  test("transforms are applied before pattern check", () => {
    const result = validateEnv({ NAME: "  JOHN  " }, {
      NAME: { type: "string", trim: true, lowercase: true, pattern: /^[a-z]+$/ },
    });
    expect(result.NAME).toBe("john");
  });

  test("transforms are applied before enum check", () => {
    const result = validateEnv({ MODE: "  PROD  " }, {
      MODE: { type: "string", trim: true, lowercase: true, enum: ["dev", "staging", "prod"] },
    });
    expect(result.MODE).toBe("prod");
  });

  test("schema builder accepts transformer options", () => {
    const result = validateEnv({ NAME: "  Alice  " }, {
      NAME: schema().string({ trim: true }),
    });
    expect(result.NAME).toBe("Alice");
  });

  test("schema builder accepts pattern", () => {
    const result = validateEnv({ CODE: "ABC-123" }, {
      CODE: schema().string({ pattern: /^[A-Z]{3}-\d{3}$/ }),
    });
    expect(result.CODE).toBe("ABC-123");
  });

  test("schema builder accepts enum", () => {
    const result = validateEnv({ COLOR: "red" }, {
      COLOR: schema().string({ enum: ["red", "green", "blue"] }),
    });
    expect(result.COLOR).toBe("red");
  });
});
