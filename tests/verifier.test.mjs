import test from "node:test";
import assert from "node:assert/strict";
import { interpretJevVerification } from "../src/verification/jev-verifier.mjs";

const strong={ fulfillsRequest:{noul:0.95}, containsUnsupportedClaims:{noul:0.05}, completeness:{score:3.8}, correctness:{score:3.7} };
test("strong low-risk answer passes Jev verification policy",()=>{ const r=interpretJevVerification(strong,{risk:0.2}); assert.equal(r.pass,true); assert.ok(r.confidence>=r.threshold); });
test("higher-risk answer uses a stricter acceptance threshold",()=>{ const m={fulfillsRequest:{noul:0.84},containsUnsupportedClaims:{noul:0.05},completeness:{score:3.5},correctness:{score:3.4}}; const low=interpretJevVerification(m,{risk:0.2}); const high=interpretJevVerification(m,{risk:0.8}); assert.equal(low.pass,true); assert.equal(high.pass,false); assert.ok(high.threshold>low.threshold); });
