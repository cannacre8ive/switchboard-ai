const DEFAULT_TOOLS = [
  { id:"web.search", family:"web", mode:"read", risk:"low" },
  { id:"github.read", family:"github", mode:"read", risk:"low" },
  { id:"github.write", family:"github", mode:"write", risk:"high" },
  { id:"files.read", family:"files", mode:"read", risk:"low" },
  { id:"files.write", family:"files", mode:"write", risk:"medium" },
  { id:"browser.read", family:"browser", mode:"read", risk:"medium" },
  { id:"browser.act", family:"browser", mode:"write", risk:"high" },
  { id:"python.exec", family:"python", mode:"execute", risk:"medium" },
  { id:"drive.read", family:"drive", mode:"read", risk:"medium" },
  { id:"drive.write", family:"drive", mode:"write", risk:"high" },
  { id:"email.read", family:"email", mode:"read", risk:"medium" },
  { id:"email.send", family:"email", mode:"write", risk:"critical" },
];

export class ToolRegistry {
  constructor(entries=DEFAULT_TOOLS){ this.entries=new Map(entries.map((entry)=>[entry.id,{enabled:true,...entry}])); }
  get(id){ const tool=this.entries.get(id); if(!tool) throw new Error(`Unknown tool capability: ${id}`); return {...tool}; }
  forFamily(family){ return [...this.entries.values()].filter((tool)=>tool.enabled!==false&&tool.family===family); }
  plan({families=[],mutatesExternalState=false,allowWrites=false}={}){
    const requested=[],allowed=[],blocked=[];
    for(const family of [...new Set(families)]){
      const candidates=this.forFamily(family);
      const readLike=candidates.filter((tool)=>tool.mode!=="write");
      const writes=candidates.filter((tool)=>tool.mode==="write");
      requested.push(...readLike); allowed.push(...readLike);
      if(mutatesExternalState){
        requested.push(...writes);
        if(allowWrites) allowed.push(...writes);
        else blocked.push(...writes.map((tool)=>({...tool,reason:"external mutation requires explicit write permission"})));
      }
    }
    return {families:[...new Set(families)],mutatesExternalState:Boolean(mutatesExternalState),writePermission:Boolean(allowWrites),requested:uniqueById(requested),allowed:uniqueById(allowed),blocked:uniqueById(blocked),requiresWriteApproval:blocked.length>0};
  }
}
function uniqueById(items){ return [...new Map(items.map((item)=>[item.id,item])).values()]; }
export const defaultToolRegistry=new ToolRegistry();
export function buildToolPlan(contract,{allowWrites=false,registry=defaultToolRegistry}={}){
  const families=contract.toolHints?.length?contract.toolHints:inferFamilies(contract);
  return registry.plan({families,mutatesExternalState:contract.mutatesExternalState,allowWrites});
}
function inferFamilies(contract){
  const families=[];
  if(contract.needs?.web) families.push("web");
  if(contract.needs?.code) families.push("github","files","python");
  if(contract.taskType==="data") families.push("files","python");
  if(contract.taskType==="retrieval") families.push("files");
  if(contract.taskType==="automation") families.push("browser");
  return [...new Set(families)];
}
