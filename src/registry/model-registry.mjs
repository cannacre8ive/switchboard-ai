import { readFile } from "node:fs/promises";

const DEFAULT_ENTRIES = [
  { id: "cheap-general", provider: "openai", envModel: "OPENAI_MODEL", tier: 1, capabilities: ["writing", "classification", "summarization", "extraction"] },
  { id: "claude-general", provider: "anthropic", envModel: "ANTHROPIC_MODEL", tier: 3, capabilities: ["writing", "reasoning", "planning", "long-context", "research-synthesis"] },
  { id: "codex-coding", provider: "openai", envModel: "CODEX_MODEL", tier: 3, capabilities: ["coding", "debugging", "repo-navigation", "tests"] },
  { id: "frontier-reasoner", provider: "openai", envModel: "FRONTIER_MODEL", fallbackEnvModel: "OPENAI_MODEL", tier: 4, capabilities: ["reasoning", "planning", "coding", "research-synthesis", "long-context"] },
];

function normalizeEntry(entry) {
  return { inputUsdPerMillion: null, outputUsdPerMillion: null, enabled: true, ...entry, capabilities: [...(entry.capabilities || [])] };
}

export class ModelRegistry {
  constructor(entries = DEFAULT_ENTRIES) {
    this.entries = new Map(entries.map((entry) => [entry.id, normalizeEntry(entry)]));
  }

  static async fromFile(path) {
    const raw = JSON.parse(await readFile(path, "utf8"));
    if (!Array.isArray(raw)) throw new Error("Model registry config must be an array");
    return new ModelRegistry(raw);
  }

  get(id) {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown executor/model id: ${id}`);
    return { ...entry, model: this.resolveModel(entry) };
  }

  resolveModel(entryOrId) {
    const entry = typeof entryOrId === "string" ? this.entries.get(entryOrId) : entryOrId;
    if (!entry) return null;
    if (entry.model && entry.model !== "SET_ME") return entry.model;
    if (entry.envModel && process.env[entry.envModel]) return process.env[entry.envModel];
    if (entry.fallbackEnvModel && process.env[entry.fallbackEnvModel]) return process.env[entry.fallbackEnvModel];
    return null;
  }

  enabled() {
    return [...this.entries.values()].filter((entry) => entry.enabled !== false).map((entry) => ({ ...entry, model: this.resolveModel(entry) }));
  }

  nextHigherTier(id, { needsCode = false } = {}) {
    const current = this.get(id);
    const candidates = this.enabled()
      .filter((entry) => entry.tier > current.tier)
      .filter((entry) => !needsCode || entry.capabilities.includes("coding"))
      .sort((a, b) => a.tier - b.tier);
    return candidates[0]?.id ?? null;
  }
}

export const defaultModelRegistry = new ModelRegistry();
