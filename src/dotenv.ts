import fs from "fs";

export interface LoadDotenvOptions {
  path?: string;
  encoding?: BufferEncoding;
}

function simpleParse(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

let dotenvAvailable: boolean | undefined;

interface DotenvModule {
  parse(src: string): Record<string, string>;
}

function tryLoadDotenv(): DotenvModule | null {
  if (dotenvAvailable === false) return null;
  if (dotenvAvailable === true) return require("dotenv") as DotenvModule;
  try {
    const dotenv = require("dotenv") as DotenvModule;
    dotenvAvailable = true;
    return dotenv;
  } catch {
    dotenvAvailable = false;
    return null;
  }
}

export function loadDotenv(options: LoadDotenvOptions = {}): Record<string, string> {
  const { path = ".env", encoding = "utf8" } = options;

  let content: string;
  try {
    content = fs.readFileSync(path, encoding);
  } catch (e: any) {
    if (e.code === "ENOENT") return {};
    throw e;
  }

  const dotenv = tryLoadDotenv();
  if (dotenv) {
    return dotenv.parse(content);
  }

  return simpleParse(content);
}
