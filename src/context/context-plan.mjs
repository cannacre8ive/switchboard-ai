const DEFAULT_BUDGETS={
  economy:Number(process.env.SWITCHBOARD_CONTEXT_BUDGET_ECONOMY||8000),
  balanced:Number(process.env.SWITCHBOARD_CONTEXT_BUDGET_BALANCED||24000),
  premium:Number(process.env.SWITCHBOARD_CONTEXT_BUDGET_PREMIUM||48000),
  max:Number(process.env.SWITCHBOARD_CONTEXT_BUDGET_MAX||96000),
};
export function buildContextPlan(contract,{budgets=DEFAULT_BUDGETS}={}){
  const base=budgets[contract.mode]??budgets.balanced;
  const complexityMultiplier=contract.complexity>=0.8?1.35:contract.complexity<=0.3?0.7:1;
  const longContextMultiplier=contract.needs?.longContext?1.5:1;
  const maxTokens=Math.round(base*complexityMultiplier*longContextMultiplier);
  const sources=["request"];
  if(contract.taskType==="retrieval"||contract.needs?.longContext) sources.push("retrieved-files");
  if(contract.needs?.web) sources.push("web-evidence");
  if(contract.needs?.code) sources.push("repository-context");
  return {strategy:contract.needs?.longContext?"retrieve-and-rerank":"direct-plus-targeted-retrieval",maxContextTokens:maxTokens,retrievalTopK:contract.needs?.longContext?12:contract.needs?.tools?6:3,sources:[...new Set(sources)],principle:"Only pass context that materially helps the selected executor complete this task."};
}
