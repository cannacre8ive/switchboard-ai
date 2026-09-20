import test from "node:test";
import assert from "node:assert/strict";
import { runTask } from "../src/runtime.mjs";
import { ModelRegistry } from "../src/registry/model-registry.mjs";

const registry = new ModelRegistry([
  { id:"cheap-general", provider:"openai", model:"cheap", tier:1, capabilities:["writing"], inputUsdPerMillion:1, outputUsdPerMillion:2 },
  { id:"claude-general", provider:"anthropic", model:"claude", tier:2, capabilities:["writing","reasoning"], inputUsdPerMillion:2, outputUsdPerMillion:4 },
  { id:"codex-coding", provider:"openai", model:"codex", tier:2, capabilities:["coding"], inputUsdPerMillion:2, outputUsdPerMillion:4 },
  { id:"frontier-reasoner", provider:"openai", model:"frontier", tier:3, capabilities:["coding","reasoning"], inputUsdPerMillion:5, outputUsdPerMillion:10 },
]);

function fakeExecute(executorId) {
  return Promise.resolve({
    provider:registry.get(executorId).provider,
    model:registry.get(executorId).model,
    text:`answer from ${executorId}`,
    usage:{input_tokens:1000,output_tokens:500},
  });
}

test("runtime accepts first attempt when verifier passes",async()=>{
  const verifier={verify:async()=>({source:"rules",pass:true,confidence:0.9})};
  const result=await runTask("Write a short product description",{preferJev:false,registry,execute:fakeExecute,verifier,maxAttempts:2});
  assert.equal(result.outcome.accepted,true);
  assert.equal(result.attempts.length,1);
});

test("runtime escalates after failed verification",async()=>{
  let calls=0;
  const verifier={verify:async()=>{calls+=1;return{source:"rules",pass:calls>1,confidence:calls>1?0.9:0.3};}};
  const result=await runTask("Write and polish a product launch announcement",{preferJev:false,registry,execute:fakeExecute,verifier,maxAttempts:2});
  assert.equal(result.outcome.accepted,true);
  assert.equal(result.attempts.length,2);
  assert.notEqual(result.attempts[0].executor,result.attempts[1].executor);
});

test("runtime records normalized execution cost when pricing is known",async()=>{
  const verifier={verify:async()=>({source:"rules",pass:true,confidence:0.9})};
  const result=await runTask("Write a short product description",{preferJev:false,registry,execute:fakeExecute,verifier});
  assert.equal(result.attempts[0].economics.pricingKnown,true);
  assert.ok(result.attempts[0].economics.totalCostUsd>0);
});
