import { SwitchboardRouter } from "../src/router.mjs";

const tasks = [
  "Rewrite this short customer email to sound friendlier.",
  "Debug this TypeScript repository and fix the failing tests.",
  "Research the latest API pricing and compare current options with sources.",
  "Design a production architecture for an adaptive multi-agent orchestration runtime.",
  "Extract the invoice number and total from this text.",
  "Analyze this CSV and identify which segment drove the conversion decline.",
];

const router = new SwitchboardRouter({ mode: process.env.SWITCHBOARD_MODE || "balanced" });
console.log("task\tsource\ttype\tconfidence\tcomplexity\texecutor");
for (const task of tasks) {
  const { contract, policy } = await router.route(task);
  console.log([
    JSON.stringify(task),
    contract.rawDecision?.source ?? (process.env.TYPESAFE_API_KEY ? "jev" : "rules"),
    contract.taskType,
    contract.confidence.toFixed(2),
    contract.complexity.toFixed(2),
    policy.executor,
  ].join("\t"));
}
