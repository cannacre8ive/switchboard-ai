#!/usr/bin/env node
import { runTask } from "./runtime.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const modeFlag = args.find((x) => x.startsWith("--mode="));
const mode = modeFlag?.split("=")[1];
const prompt = args.filter((x) => !x.startsWith("--")).join(" ").trim();

if (!prompt) {
  console.error('Usage: node src/cli.mjs [--dry-run] [--mode=balanced] "your request"');
  process.exit(1);
}

try {
  const result = await runTask(prompt, { dryRun, mode });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
