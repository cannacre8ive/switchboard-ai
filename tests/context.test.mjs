import test from "node:test";
import assert from "node:assert/strict";
import { buildContextPlan } from "../src/context/context-plan.mjs";
test("long-context work receives retrieval strategy and larger budget",()=>{const short=buildContextPlan({mode:"balanced",complexity:0.4,taskType:"writing",needs:{longContext:false,web:false,code:false,tools:false}});const long=buildContextPlan({mode:"balanced",complexity:0.8,taskType:"retrieval",needs:{longContext:true,web:false,code:false,tools:true}});assert.equal(long.strategy,"retrieve-and-rerank");assert.ok(long.maxContextTokens>short.maxContextTokens);assert.ok(long.sources.includes("retrieved-files"));});
