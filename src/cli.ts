import { Command } from "commander";
import { loadDotenv } from "./dotenv";
import { validateEnv } from "./index";
import { Schema } from "./types";
import path from "path";

export function loadSchema(schemaPath: string): Schema {
  const resolvedPath = path.resolve(schemaPath);
  const schema = require(resolvedPath);
  return schema.default || schema;
}

export async function run(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("vark")
    .description("Environment variable validation CLI")
    .version("1.0.0");

  program
    .command("validate <schema-file>")
    .description(
      "Validate environment variables against a schema file (.js or .json)",
    )
    .option("-e, --env-file <path>", "Path to .env file", ".env")
    .option("--no-throw", "Don't throw on validation errors")
    .option("-u, --allow-unknown", "Allow unknown environment variables")
    .option("-c, --cache", "Enable caching")
    .option("--cache-ttl <ms>", "Cache TTL in milliseconds", parseInt)
    .option("-o, --output <format>", "Output format (json | text)", "json")
    .action(async (schemaFile, options) => {
      try {
        const schema = loadSchema(schemaFile);
        const env = loadDotenv({ path: options.envFile });

        const result = validateEnv(env, schema, {
          throwOnError: options.throw !== false,
          allowUnknown: options.allowUnknown || false,
          cache: options.cache
            ? { enabled: true, ttl: options.cacheTtl }
            : undefined,
        });

        const output = JSON.stringify(result, null, 2);
        if (options.output === "text") {
          console.log("Validation passed:\n" + output);
        } else {
          console.log(output);
        }
      } catch (error: any) {
        const isText = options.output === "text";
        if (error.errors) {
          if (isText) {
            console.error("Validation failed:");
            for (const err of error.errors) {
              console.error(`  - ${err.field}: ${err.message}`);
            }
          } else {
            console.error(
              JSON.stringify({ valid: false, errors: error.errors }, null, 2),
            );
          }
        } else {
          if (isText) {
            console.error("Error: " + error.message);
          } else {
            console.error(
              JSON.stringify(
                {
                  valid: false,
                  errors: [{ field: "unknown", message: error.message }],
                },
                null,
                2,
              ),
            );
          }
        }
        process.exit(1);
      }
    });

  await program.parseAsync(argv);
}
