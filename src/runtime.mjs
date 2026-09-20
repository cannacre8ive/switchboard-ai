import { SwitchboardRouter } from "./router.mjs";
import { executeById } from "./executors/http-executors.mjs";
import { logEvent } from "./telemetry/logger.mjs";
import { estimateJevRoutingCostUsd, jevUsageCostUsd } from "./cost.mjs";
import { calculateUsageCost } from "./economics/usage-cost.mjs";
import { defaultModelRegistry } from "./registry/model-registry.mjs";
import { SwitchboardVerifier } from "./verification/verifier.mjs";

export async function runTask(prompt,{dryRun=false,mode,maxCostUsd,preferJev=true,maxAttempts=2,registry=defaultModelRegistry,execute=executeById,verifier=new SwitchboardVerifier({preferJev})}={}) {
  const budgetUsd=maxCostUsd??Number(process.env.SWITCHBOARD_MAX_COST_USD||1);
  const router=new SwitchboardRouter({mode:mode||process.env.SWITCHBOARD_MODE||"balanced",budgetUsd,preferJev});
  const started=performance.now();
  const routed=await router.route(prompt);
  const routingEconomics=routed.contract.decisionSource==="jev"?estimateJevRoutingCostUsd(prompt):{estimatedInputTokens:0,estimatedCostUsd:0,usdPerMillion:0};
  await logEvent({type:"route",...routed,routingEconomics});
  if(dryRun) return {...routed,routingEconomics,attempts:[],execution:{dryRun:true}};

  let executorId=routed.policy.executor;
  const attempts=[];
  let totalKnownCostUsd=routingEconomics.estimatedCostUsd||0;
  let finalExecution=null;
  let finalVerification=null;

  for(let attemptNumber=1;attemptNumber<=Math.max(1,maxAttempts);attemptNumber+=1){
    const entry=registry.get(executorId);
    const executionStarted=performance.now();
    const execution=await execute(executorId,prompt,{registry});
    const elapsedMs=Math.round(performance.now()-executionStarted);
    const executionEconomics=calculateUsageCost({provider:execution.provider,usage:execution.usage,pricing:entry});
    if(executionEconomics.totalCostUsd!=null) totalKnownCostUsd+=executionEconomics.totalCostUsd;

    let verification=null;
    let verificationCostUsd=0;
    if(routed.policy.verify){
      verification=await verifier.verify({prompt,output:execution.text,execution,taskType:routed.contract.taskType,risk:routed.contract.risk});
      if(verification.source==="jev"){ verificationCostUsd=jevUsageCostUsd(verification.usage); totalKnownCostUsd+=verificationCostUsd; }
    }

    const attempt={attemptNumber,executor:executorId,provider:execution.provider,model:execution.model,elapsedMs,usage:execution.usage??null,economics:executionEconomics,verification,verificationCostUsd};
    attempts.push(attempt);
    await logEvent({type:"attempt",taskId:routed.contract.id,...attempt});
    finalExecution=execution;
    finalVerification=verification;

    const accepted=!routed.policy.verify||verification?.pass===true;
    if(accepted) break;
    if(totalKnownCostUsd>=budgetUsd) break;
    const next=registry.nextHigherTier(executorId,{needsCode:routed.contract.needs.code});
    if(!next||next===executorId) break;
    executorId=next;
  }

  const success=!routed.policy.verify||finalVerification?.pass===true;
  const result={...routed,routingEconomics,attempts,execution:finalExecution,verification:finalVerification,outcome:{accepted:success,attempts:attempts.length,totalKnownCostUsd,budgetUsd,budgetExceeded:totalKnownCostUsd>budgetUsd},totalElapsedMs:Math.round(performance.now()-started)};
  await logEvent({type:"result",taskId:routed.contract.id,outcome:result.outcome});
  return result;
}
