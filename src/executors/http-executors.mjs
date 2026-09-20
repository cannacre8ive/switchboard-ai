import { defaultModelRegistry } from "../registry/model-registry.mjs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for live execution`);
  return value;
}

export async function executeAnthropic(prompt, { model } = {}) {
  const key = requireEnv("ANTHROPIC_API_KEY");
  if (!model) throw new Error("A configured Anthropic model is required");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { provider:"anthropic", model, text:(json.content||[]).filter((x)=>x.type==="text").map((x)=>x.text).join("\n"), usage:json.usage??null, raw:json };
}

export async function executeOpenAI(prompt, { model } = {}) {
  const key = requireEnv("OPENAI_API_KEY");
  if (!model) throw new Error("A configured OpenAI model is required");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method:"POST",
    headers:{ "content-type":"application/json", authorization:`Bearer ${key}` },
    body:JSON.stringify({model,input:prompt}),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json=await res.json();
  const outputText=json.output_text??(json.output||[]).flatMap((item)=>item.content||[]).filter((item)=>item.type==="output_text").map((item)=>item.text).join("\n");
  return {provider:"openai",model,text:outputText,usage:json.usage??null,raw:json};
}

export async function executeById(executorId,prompt,{registry=defaultModelRegistry}={}) {
  const entry=registry.get(executorId);
  if(!entry.model) throw new Error(`No model configured for ${executorId}. Set ${entry.envModel||"its model setting"}.`);
  if(entry.provider==="anthropic") return executeAnthropic(prompt,{model:entry.model});
  if(entry.provider==="openai") return executeOpenAI(prompt,{model:entry.model});
  throw new Error(`Unsupported provider for ${executorId}: ${entry.provider}`);
}
