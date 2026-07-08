import { execFileSync, ExecSyncOptions } from "child_process";
import path from "path";
import fs from "fs";

const CLI_SCRIPT = path.resolve("bin/vark.js");

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

function runCli(args: string[]): { stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("node", [CLI_SCRIPT, ...args], execOpts);
    return { stdout: stdout.toString().trim(), stderr: "" };
  } catch (error: any) {
    return {
      ...error,
      stdout: (error.stdout || "").toString().trim(),
      stderr: (error.stderr || "").toString().trim(),
    };
  }
}

const FIXTURE_PREFIX = "cli.";

beforeEach(() => {
  removeFixture(`${FIXTURE_PREFIX}env.test`);
  removeFixture(`${FIXTURE_PREFIX}schema.json`);
  removeFixture(`${FIXTURE_PREFIX}schema.js`);
});

afterAll(() => {
  removeFixture(`${FIXTURE_PREFIX}env.test`);
  removeFixture(`${FIXTURE_PREFIX}schema.json`);
  removeFixture(`${FIXTURE_PREFIX}schema.js`);
});

describe("loadSchema", () => {
  test("loads JSON schema", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    const { loadSchema } = require("../src/cli");
    const schema = loadSchema(fixturePath(`${FIXTURE_PREFIX}schema.json`));
    expect(schema.PORT.type).toBe("number");
  });

  test("loads JS schema with module.exports", () => {
    writeFixture(
      `${FIXTURE_PREFIX}schema.js`,
      'module.exports = { PORT: { type: "number" } };',
    );
    const { loadSchema } = require("../src/cli");
    const schema = loadSchema(fixturePath(`${FIXTURE_PREFIX}schema.js`));
    expect(schema.PORT.type).toBe("number");
  });
});

describe("CLI validate command", () => {
  test("validates env and outputs JSON", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=3000");
    const { stdout } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
      "--no-throw",
    ]);
    const result = JSON.parse(stdout);
    expect(result.PORT).toBe(3000);
  });

  test("outputs errors to stderr on invalid env", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=abc");
    const { stderr } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
    ]);
    const result = JSON.parse(stderr);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("exits with code 1 on error", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=abc");
    try {
      execFileSync(
        "node",
        [
          CLI_SCRIPT,
          "validate",
          fixturePath(`${FIXTURE_PREFIX}schema.json`),
          "--env-file",
          fixturePath(`${FIXTURE_PREFIX}env.test`),
        ],
        execOpts,
      );
    } catch (error: any) {
      expect(error.status).toBe(1);
    }
  });

  test("with --no-throw outputs partial data on invalid env", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=abc");
    const { stdout } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
      "--no-throw",
    ]);
    const result = JSON.parse(stdout);
    expect(result.PORT).toBeUndefined();
  });

  test("text output format", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=3000");
    const { stdout } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
      "--no-throw",
      "--output",
      "text",
    ]);
    expect(stdout).toContain("Validation passed");
    expect(stdout).toContain("3000");
  });

  test("allows unknown keys with --allow-unknown", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=3000\nEXTRA=yes");
    const { stdout } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
      "--no-throw",
      "--allow-unknown",
    ]);
    const result = JSON.parse(stdout);
    expect(result.PORT).toBe(3000);
    expect(result.EXTRA).toBeUndefined();
  });

  test("caching option does not error", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=3000");
    const { stdout } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
      "--no-throw",
      "--cache",
      "--cache-ttl",
      "5000",
    ]);
    const result = JSON.parse(stdout);
    expect(result.PORT).toBe(3000);
  });

  test("text error output format", () => {
    writeFixture(`${FIXTURE_PREFIX}schema.json`, '{ "PORT": { "type": "number" } }');
    writeFixture(`${FIXTURE_PREFIX}env.test`, "PORT=abc");
    const { stderr } = runCli([
      "validate",
      fixturePath(`${FIXTURE_PREFIX}schema.json`),
      "--env-file",
      fixturePath(`${FIXTURE_PREFIX}env.test`),
      "--output",
      "text",
    ]);
    expect(stderr).toContain("Validation failed");
    expect(stderr).toContain("PORT");
  });
});
