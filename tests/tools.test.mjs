import test from "node:test";
import assert from "node:assert/strict";
import { buildToolPlan } from "../src/tools/tool-registry.mjs";
const contract={taskType:"automation",needs:{web:false,code:true,longContext:false,tools:true},toolHints:["github","browser"],mutatesExternalState:true};
test("write-capable tools are blocked without explicit permission",()=>{const plan=buildToolPlan(contract,{allowWrites:false});assert.equal(plan.requiresWriteApproval,true);assert.ok(plan.allowed.some((tool)=>tool.id==="github.read"));assert.ok(plan.blocked.some((tool)=>tool.id==="github.write"));assert.ok(plan.blocked.some((tool)=>tool.id==="browser.act"));});
test("write-capable tools are allowed when permission is explicit",()=>{const plan=buildToolPlan(contract,{allowWrites:true});assert.equal(plan.requiresWriteApproval,false);assert.ok(plan.allowed.some((tool)=>tool.id==="github.write"));});
