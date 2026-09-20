import { EXECUTORS } from "../contracts.mjs";

const codingStrong = /\b(code|coding|typescript|javascript|python|repo|repository|bug|debug|tests?|refactor|function|class|middleware|vulnerability|patch|compile|lint)\b/i;
const codingWeak = /\b(api|sdk|git|github|build|implement)\b/i;
const research = /\b(research|sources|latest|current|compare|investigate|web|search|evidence|citations?|pricing|docs?|documentation)\b/i;
const writing = /\b(write|rewrite|draft|email|cover letter|resume|résumé|article|copy|caption|proposal|announcement|polish)\b/i;
const data = /\b(csv|spreadsheet|dataset|analy[sz]e data|metrics|kpi|sql|statistics|dashboard|conversion)\b/i;
const planning = /\b(plan|architecture|strategy|design|roadmap|system|workflow|orchestrat)\b/i;
const retrieval = /\b(find|locate|retrieve|look up)\b.*\b(existing|files?|context|notes?|documents?|knowledge base|project)\b/i;
const automation = /\b(browser|tools?|pull request|external system|operate|automate|automation)\b/i;
const extraction = /\b(extract|parse|identify)\b.*\b(invoice|number|total|field|value|date|name|id)\b/i;
const longContext = /\b(entire|all files|whole repo|long document|large document|many files|knowledge base)\b/i;
const risk = /\b(legal|medical|financial|security|production|delete|deploy|payment|trade|credential|secret|vulnerability|authentication)\b/i;

export class RuleRouter {
  async decide(prompt) {
    const signals = {
      automation: automation.test(prompt),
      codingStrong: codingStrong.test(prompt),
      codingWeak: codingWeak.test(prompt),
      research: research.test(prompt),
      writing: writing.test(prompt),
      data: data.test(prompt),
      planning: planning.test(prompt),
      retrieval: retrieval.test(prompt),
      extraction: extraction.test(prompt),
    };

    let taskType = "other";
    if (signals.automation && /\b(browser|tools?|pull request|operate|automate|automation)\b/i.test(prompt)) taskType = "automation";
    else if (signals.codingStrong) taskType = "coding";
    else if (signals.retrieval) taskType = "retrieval";
    else if (signals.research) taskType = "research";
    else if (signals.data) taskType = "data";
    else if (signals.writing) taskType = "writing";
    else if (signals.planning) taskType = "planning";
    else if (signals.codingWeak) taskType = "coding";

    const signalCount = Object.values(signals).filter(Boolean).length;
    const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
    const complexity = Math.min(1, 0.16 + wordCount / 220 + Math.max(0, signalCount - 1) * 0.08);
    const needsCode = taskType === "coding" || (taskType === "automation" && (signals.codingStrong || signals.codingWeak));
    const needsWeb = signals.research;
    const needsLongContext = longContext.test(prompt);
    const risky = risk.test(prompt);

    let recommendedExecutor = "cheap-general";
    if (needsCode) recommendedExecutor = "codex-coding";
    else if (taskType === "planning" || complexity > 0.72) recommendedExecutor = "frontier-reasoner";
    else if (taskType === "writing" || taskType === "research") recommendedExecutor = "claude-general";
    else if (taskType === "automation") recommendedExecutor = "claude-general";

    if (!EXECUTORS.includes(recommendedExecutor)) recommendedExecutor = "cheap-general";

    const recognized = taskType !== "other" || signals.extraction;
    return {
      source: "rules",
      taskType,
      complexity,
      risk: risky ? 0.8 : 0.15,
      confidence: recognized ? 0.76 : 0.55,
      needsWeb,
      needsCode,
      needsLongContext,
      needsTools: taskType === "automation" || needsWeb || needsCode || taskType === "data" || taskType === "retrieval",
      parallelizable: taskType === "automation" || (needsWeb && (needsCode || taskType === "writing" || taskType === "planning")),
      recommendedExecutor,
    };
  }
}
