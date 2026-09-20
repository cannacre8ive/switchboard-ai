#!/usr/bin/env node
import { runTask } from "./runtime.mjs";
import { ModelRegistry, defaultModelRegistry } from "./registry/model-registry.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const preferJev = !args.includes("--no-jev");
const mode = valueOf("--mode") || process.env.SWITCHBOARD_MODE;
const registryPath = valueOf("--registry");
const maxCostUsd = numericValueOf("--max-cost");
const maxAttempts = numericValueOf("--max-attempts");
const prompt = args.filter((arg) => !arg.startsWith("--")).join(" ").trim();

if (!prompt) {
  console.error('Usage: node src/cli.mjs [--dry-run] [--no-jev] [--mode=balanced] [--registry=config/models.json] [--max-cost=1] [--max-attempts=2] "your request"');
  process.exit(1);
}

try {
  const registry = registryPath ? await ModelRegistry.fromFile(registryPath) : defaultModelRegistry;
  const result = await runTask(prompt, { dryRun, mode, preferJev, registry, maxCostUsd, maxAttempts });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

function valueOf(name) {
  return args.find((arg) => arg.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

function numericValueOf(name) {
  const raw = valueOf(name);
  if (raw == null) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
}
