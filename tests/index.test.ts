import { validateEnv, validateEnvAsync, schema, ValidationError, invalidateCache } from "../src/index";

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

  // ── Nested object validation ──────────────────────────────────

  test("validates nested object schema", () => {
    const result = validateEnv({
      DATABASE: '{"HOST":"localhost","PORT":5432,"SSL":true}',
    }, {
      DATABASE: {
        type: "object",
        schema: {
          HOST: { type: "string", required: true },
          PORT: { type: "number", default: 5432 },
          SSL: { type: "boolean", default: false },
        },
      },
    });
    expect(result.DATABASE.HOST).toBe("localhost");
    expect(result.DATABASE.PORT).toBe(5432);
    expect(result.DATABASE.SSL).toBe(true);
  });

  test("throws when nested required field is missing", () => {
    expect(() => {
      validateEnv({
        DATABASE: '{"PORT":5432}',
      }, {
        DATABASE: {
          type: "object",
          schema: {
            HOST: { type: "string", required: true },
            PORT: { type: "number" },
          },
        },
      });
    }).toThrow(/HOST.*required/);
  });

  test("uses nested default values", () => {
    const result = validateEnv({
      DATABASE: '{"HOST":"localhost"}',
    }, {
      DATABASE: {
        type: "object",
        schema: {
          HOST: { type: "string" },
          PORT: { type: "number", default: 5432 },
          SSL: { type: "boolean", default: false },
        },
      },
    });
    expect(result.DATABASE.HOST).toBe("localhost");
    expect(result.DATABASE.PORT).toBe(5432);
    expect(result.DATABASE.SSL).toBe(false);
  });

  test("validates deeply nested objects (3 levels)", () => {
    const result = validateEnv({
      APP: '{"NAME":"MyApp","FEATURES":{"DARK_MODE":true,"BETA":false}}',
    }, {
      APP: {
        type: "object",
        schema: {
          NAME: { type: "string", required: true },
          FEATURES: {
            type: "object",
            schema: {
              DARK_MODE: { type: "boolean", default: false },
              BETA: { type: "boolean", default: false },
            },
          },
        },
      },
    });
    expect(result.APP.NAME).toBe("MyApp");
    expect(result.APP.FEATURES.DARK_MODE).toBe(true);
    expect(result.APP.FEATURES.BETA).toBe(false);
  });

  test("nested error messages include deepest field name", () => {
    expect(() => {
      validateEnv({
        APP: '{"NAME":"MyApp","FEATURES":{}}',
      }, {
        APP: {
          type: "object",
          schema: {
            NAME: { type: "string" },
            FEATURES: {
              type: "object",
              schema: {
                DARK_MODE: { type: "boolean", required: true },
              },
            },
          },
        },
      });
    }).toThrow(/DARK_MODE.*required/);
  });

  test("nested object with parent transformers", () => {
    const result = validateEnv({
      CONFIG: '{"NAME":"  Test  ","MODE":"  PROD  "}',
    }, {
      CONFIG: {
        type: "object",
        schema: {
          NAME: { type: "string", trim: true },
          MODE: { type: "string", trim: true, lowercase: true },
        },
      },
    });
    expect(result.CONFIG.NAME).toBe("Test");
    expect(result.CONFIG.MODE).toBe("prod");
  });

  test("nested object with parent enum", () => {
    expect(() => {
      validateEnv({
        DB: '{"HOST":"localhost"}',
      }, {
        DB: {
          type: "object",
          enum: [{}],
          schema: {
            HOST: { type: "string" },
          },
        },
      });
    }).toThrow(/must be one of/);
  });

  test("nested object with integer and boolean fields", () => {
    const result = validateEnv({
      CACHE: '{"ENABLED":"true","TTL":"300","NAME":"session"}',
    }, {
      CACHE: {
        type: "object",
        schema: {
          ENABLED: { type: "boolean", default: false },
          TTL: { type: "integer", required: true },
          NAME: { type: "string" },
        },
      },
    });
    expect(result.CACHE.ENABLED).toBe(true);
    expect(result.CACHE.TTL).toBe(300);
    expect(result.CACHE.NAME).toBe("session");
  });

  test("nested object with schema builder", () => {
    const result = validateEnv({
      SERVER: '{"HOST":"0.0.0.0","PORT":"8080"}',
    }, {
      SERVER: schema().object({
        schema: {
          HOST: schema().string({ default: "localhost" }),
          PORT: schema().number({ required: true }),
        },
      }),
    });
    expect(result.SERVER.HOST).toBe("0.0.0.0");
    expect(result.SERVER.PORT).toBe(8080);
  });

  // ── Async validation ──────────────────────────────────────────

  test("validateEnvAsync passes with async validator", async () => {
    const result = await validateEnvAsync({ PORT: "3000" }, {
      PORT: { type: "number", validate: async (v) => v > 1000 },
    });
    expect(result.PORT).toBe(3000);
  });

  test("validateEnvAsync fails with async validator", async () => {
    await expect(
      validateEnvAsync({ PORT: "500" }, {
        PORT: { type: "number", validate: async (v) => v > 1000 },
      }),
    ).rejects.toThrow(ValidationError);
  });

  test("validateEnvAsync with custom message", async () => {
    await expect(
      validateEnvAsync({ PORT: "500" }, {
        PORT: {
          type: "number",
          validate: async (v) => v > 1000,
          message: "PORT must be greater than 1000",
        },
      }),
    ).rejects.toThrow("PORT must be greater than 1000");
  });

  test("validateEnvAsync mixed sync and async validators", async () => {
    const result = await validateEnvAsync(
      { PORT: "3000", DEBUG: "true" },
      {
        PORT: { type: "number", validate: async (v) => v > 1000 },
        DEBUG: { type: "boolean", default: false },
      },
    );
    expect(result.PORT).toBe(3000);
    expect(result.DEBUG).toBe(true);
  });

  test("sync validateEnv rejects async validators with helpful error", () => {
    expect(() => {
      validateEnv({ PORT: "3000" }, {
        PORT: { type: "number", validate: async (v) => v > 1000 },
      });
    }).toThrow(/Use validateEnvAsync/);
  });

  test("validateEnvAsync with throwOnError false returns partial data", async () => {
    const result = await validateEnvAsync(
      {},
      {
        PORT: { type: "number", required: true },
        DEBUG: { type: "boolean", default: false, validate: async (v) => v === false },
      },
      { throwOnError: false },
    );
    expect(result.PORT).toBeUndefined();
    expect(result.DEBUG).toBe(false);
  });

  test("validateEnvAsync with schema builder", async () => {
    const result = await validateEnvAsync({ MODE: "prod" }, {
      MODE: schema().string({
        enum: ["dev", "staging", "prod"],
        validate: async (v) => v.length > 0,
      }),
    });
    expect(result.MODE).toBe("prod");
  });

  test("validateEnvAsync applies transformers before async validate", async () => {
    const result = await validateEnvAsync({ NAME: "  Hello  " }, {
      NAME: schema().string({
        trim: true,
        validate: async (v) => v === "Hello",
      }),
    });
    expect(result.NAME).toBe("Hello");
  });

  test("validateEnvAsync rejects unknown keys", async () => {
    await expect(
      validateEnvAsync({ PORT: "3000", EXTRA: "x" }, {
        PORT: { type: "number" },
      }, { allowUnknown: false }),
    ).rejects.toThrow(/Unknown environment variables/);
  });

  describe("Caching", () => {
    beforeEach(() => {
      invalidateCache();
    });

    test("cache hit returns same data without re-validation", () => {
      const schema = { PORT: { type: "number" as const } };
      const env = { PORT: "3000" };

      const result1 = validateEnv(env, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });

      const result2 = validateEnv(env, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });

      expect(result1.PORT).toBe(3000);
      expect(result2.PORT).toBe(3000);
    });

    test("cache miss on different env values", () => {
      const schema = { PORT: { type: "number" as const } };

      const result1 = validateEnv({ PORT: "3000" }, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });
      const result2 = validateEnv({ PORT: "4000" }, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });

      expect(result1.PORT).toBe(3000);
      expect(result2.PORT).toBe(4000);
    });

    test("cache miss on different schema", () => {
      const env = { PORT: "3000" };

      const result1 = validateEnv(env, { PORT: { type: "number" as const } }, {
        throwOnError: false,
        cache: { enabled: true },
      });
      const result2 = validateEnv(env, { PORT: { type: "string" as const } }, {
        throwOnError: false,
        cache: { enabled: true },
      });

      expect(result1.PORT).toBe(3000);
      expect(result2.PORT).toBe("3000");
    });

    test("cache does not store invalid results", () => {
      const schema = { PORT: { type: "number" as const } };

      validateEnv({ PORT: "abc" }, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });

      const result = validateEnv({ PORT: "abc" }, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });
      expect(result.PORT).toBeUndefined();
    });

    test("cache with TTL expiration", async () => {
      const schema = { PORT: { type: "number" as const } };
      const env = { PORT: "3000" };

      const result1 = validateEnv(env, schema, {
        throwOnError: false,
        cache: { enabled: true, ttl: 1 },
      });
      expect(result1.PORT).toBe(3000);

      await new Promise((r) => setTimeout(r, 2));

      const result2 = validateEnv(env, schema, {
        throwOnError: false,
        cache: { enabled: true, ttl: 1 },
      });
      expect(result2.PORT).toBe(3000);
    });

    test("cache with async validation", async () => {
      const schema = { PORT: { type: "number" as const } };
      const env = { PORT: "3000" };

      const result1 = await validateEnvAsync(env, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });
      expect(result1.PORT).toBe(3000);

      const result2 = await validateEnvAsync(env, schema, {
        throwOnError: false,
        cache: { enabled: true },
      });
      expect(result2.PORT).toBe(3000);
    });

    test("cache disabled does not cache", () => {
      const schema = { PORT: { type: "number" as const } };
      const env = { PORT: "3000" };

      const result1 = validateEnv(env, schema, {
        throwOnError: false,
        cache: { enabled: false },
      });

      expect(result1.PORT).toBe(3000);
    });
  });
});
