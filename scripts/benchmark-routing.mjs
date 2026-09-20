import { readFile } from "node:fs/promises";
import { SwitchboardRouter } from "../src/router.mjs";
import { estimateJevRoutingCostUsd, jevUsageCostUsd } from "../src/cost.mjs";

const corpusPath=process.argv.find((arg)=>arg.startsWith("--corpus="))?.split("=")[1]||"benchmarks/routing-corpus.json";
const corpus=JSON.parse(await readFile(corpusPath,"utf8"));
const strategies=[{name:"rules",preferJev:false},...(process.env.TYPESAFE_API_KEY?[{name:"jev",preferJev:true}]:[])];
const summaries=[];

for(const strategy of strategies){
  const router=new SwitchboardRouter({preferJev:strategy.preferJev,mode:"balanced"});
  const rows=[];
  for(const task of corpus){
    const started=performance.now();
    const {contract,policy}=await router.route(task.prompt);
    const latencyMs=performance.now()-started;
    const taskTypeCorrect=contract.taskType===task.expectedTaskType;
    const executorAccepted=task.acceptedExecutors.includes(policy.executor);
    const actualJevUsage=contract.rawDecision?.usage;
    const routingCostUsd=contract.decisionSource==="jev"?(actualJevUsage?jevUsageCostUsd(actualJevUsage):estimateJevRoutingCostUsd(task.prompt).estimatedCostUsd):0;
    rows.push({id:task.id,taskTypeCorrect,executorAccepted,correct:taskTypeCorrect&&executorAccepted,selectedTaskType:contract.taskType,executor:policy.executor,confidence:contract.confidence,latencyMs,routingCostUsd});
  }
  const correct=rows.filter((row)=>row.correct).length;
  summaries.push({strategy:strategy.name,tasks:rows.length,correct,accuracy:correct/rows.length,meanLatencyMs:rows.reduce((s,r)=>s+r.latencyMs,0)/rows.length,totalRoutingCostUsd:rows.reduce((s,r)=>s+r.routingCostUsd,0),rows});
}

for(const summary of summaries){
  console.log(`\n${summary.strategy.toUpperCase()} — ${(summary.accuracy*100).toFixed(1)}% route accuracy, ${summary.meanLatencyMs.toFixed(1)} ms mean, $${summary.totalRoutingCostUsd.toFixed(6)} routing cost`);
  console.log("id\tok\ttype\texecutor\tconfidence");
  for(const row of summary.rows) console.log(`${row.id}\t${row.correct?"yes":"no"}\t${row.selectedTaskType}\t${row.executor}\t${row.confidence.toFixed(2)}`);
}
if(!process.env.TYPESAFE_API_KEY) console.log("\nJev benchmark skipped: TYPESAFE_API_KEY is not configured.");
