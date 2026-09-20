import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function logEvent(event, path = process.env.SWITCHBOARD_TELEMETRY_PATH || "telemetry/events.jsonl") {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, "utf8");
}
