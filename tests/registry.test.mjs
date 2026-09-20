import test from "node:test";
import assert from "node:assert/strict";
import { ModelRegistry } from "../src/registry/model-registry.mjs";

const registry = new ModelRegistry([
  { id:"a", provider:"x", model:"a", tier:1, capabilities:["writing"] },
  { id:"b", provider:"x", model:"b", tier:2, capabilities:["reasoning"] },
  { id:"c", provider:"x", model:"c", tier:3, capabilities:["coding","reasoning"] },
]);
test("registry returns the next higher tier",()=>{ assert.equal(registry.nextHigherTier("a"),"b"); assert.equal(registry.nextHigherTier("b"),"c"); });
test("code escalation selects a coding-capable higher tier",()=>{ assert.equal(registry.nextHigherTier("a",{needsCode:true}),"c"); });
