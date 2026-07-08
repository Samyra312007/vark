import { execSync, ExecSyncOptions } from "child_process";
import path from "path";
import fs from "fs";

const CLI = `node ${path.resolve("bin/vark.js")}`;

function fixturePath(name: string): string {
  return path.join(__dirname, name);
}

function writeFixture(name: string, content: string): string {
  const p = fixturePath(name);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

function removeFixture(name: string): void {
  try {
    fs.unlinkSync(fixturePath(name));
  } catch {}
}

const execOpts: ExecSyncOptions = {
  timeout: 10000,
  cwd: __dirname,
};

beforeEach(() => {
  removeFixture(".env.test");
  removeFixture("schema.json");
  removeFixture("schema.js");
});

afterAll(() => {
  removeFixture(".env.test");
  removeFixture("schema.json");
  removeFixture("schema.js");
});

describe("loadSchema", () => {
  test("loads JSON schema", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    const { loadSchema } = require("../src/cli");
    const schema = loadSchema(fixturePath("schema.json"));
    expect(schema.PORT.type).toBe("number");
  });

  test("loads JS schema with module.exports", () => {
    writeFixture(
      "schema.js",
      'module.exports = { PORT: { type: "number" } };',
    );
    const { loadSchema } = require("../src/cli");
    const schema = loadSchema(fixturePath("schema.js"));
    expect(schema.PORT.type).toBe("number");
  });
});

describe("CLI validate command", () => {
  test("validates env and outputs JSON", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=3000");
    const stdout = execSync(
      `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}" --no-throw`,
      execOpts,
    )
      .toString()
      .trim();
    const result = JSON.parse(stdout);
    expect(result.PORT).toBe(3000);
  });

  test("outputs errors to stderr on invalid env", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=abc");
    try {
      execSync(
        `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}"`,
        execOpts,
      );
    } catch (error: any) {
      const stderr = error.stderr.toString().trim();
      const result = JSON.parse(stderr);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test("exits with code 1 on error", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=abc");
    try {
      execSync(
        `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}"`,
        execOpts,
      );
    } catch (error: any) {
      expect(error.status).toBe(1);
    }
  });

  test("with --no-throw outputs partial data on invalid env", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=abc");
    const stdout = execSync(
      `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}" --no-throw`,
      execOpts,
    )
      .toString()
      .trim();
    const result = JSON.parse(stdout);
    expect(result.PORT).toBeUndefined();
  });

  test("text output format", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=3000");
    const stdout = execSync(
      `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}" --no-throw --output text`,
      execOpts,
    )
      .toString()
      .trim();
    expect(stdout).toContain("Validation passed");
    expect(stdout).toContain("3000");
  });

  test("allows unknown keys with --allow-unknown", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=3000\nEXTRA=yes");
    const stdout = execSync(
      `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}" --no-throw --allow-unknown`,
      execOpts,
    )
      .toString()
      .trim();
    const result = JSON.parse(stdout);
    expect(result.PORT).toBe(3000);
    // Unknown keys are silently ignored, not part of output
    expect(result.EXTRA).toBeUndefined();
  });

  test("caching option does not error", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=3000");
    const stdout = execSync(
      `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}" --no-throw --cache --cache-ttl 5000`,
      execOpts,
    )
      .toString()
      .trim();
    const result = JSON.parse(stdout);
    expect(result.PORT).toBe(3000);
  });

  test("text error output format", () => {
    writeFixture("schema.json", '{ "PORT": { "type": "number" } }');
    writeFixture(".env.test", "PORT=abc");
    try {
      execSync(
        `${CLI} validate "${fixturePath("schema.json")}" --env-file "${fixturePath(".env.test")}" --output text`,
        execOpts,
      );
    } catch (error: any) {
      const stderr = error.stderr.toString().trim();
      expect(stderr).toContain("Validation failed");
      expect(stderr).toContain("PORT");
    }
  });
});
