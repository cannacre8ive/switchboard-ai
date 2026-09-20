import { EXECUTORS } from "../contracts.mjs";

const coding = /\b(code|coding|typescript|javascript|python|repo|repository|bug|debug|test|tests|refactor|function|class|api|sdk|git|github|build|implement)\b/i;
const research = /\b(research|sources|latest|current|compare|investigate|web|search|evidence|citations?)\b/i;
const writing = /\b(write|rewrite|draft|email|cover letter|resume|résumé|article|copy|caption|proposal)\b/i;
const data = /\b(csv|spreadsheet|dataset|analy[sz]e data|metrics|kpi|sql|statistics|dashboard)\b/i;
const planning = /\b(plan|architecture|strategy|design|roadmap|system|workflow|orchestrat)\b/i;
const longContext = /\b(entire|all files|whole repo|long document|large document|many files|knowledge base)\b/i;
const risk = /\b(legal|medical|financial|security|production|delete|deploy|payment|trade|credential|secret)\b/i;

export class RuleRouter {
  async decide(prompt) {
    const scores = {
      coding: coding.test(prompt) ? 1 : 0,
      research: research.test(prompt) ? 1 : 0,
      writing: writing.test(prompt) ? 1 : 0,
      data: data.test(prompt) ? 1 : 0,
      planning: planning.test(prompt) ? 1 : 0,
    };

    const [taskType, top] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
    const complexity = Math.min(1, 0.18 + wordCount / 220 + (Object.values(scores).filter(Boolean).length - 1) * 0.12);
    const needsCode = Boolean(scores.coding);
    const needsWeb = Boolean(scores.research);
    const needsLongContext = longContext.test(prompt);
    const risky = risk.test(prompt);

    let recommendedExecutor = "cheap-general";
    if (needsCode) recommendedExecutor = "codex-coding";
    else if (scores.planning || complexity > 0.7) recommendedExecutor = "frontier-reasoner";
    else if (scores.writing || scores.research) recommendedExecutor = "claude-general";

    if (!EXECUTORS.includes(recommendedExecutor)) recommendedExecutor = "cheap-general";

    return {
      source: "rules",
      taskType: top ? taskType : "other",
      complexity,
      risk: risky ? 0.8 : 0.15,
      confidence: top ? 0.76 : 0.48,
      needsWeb,
      needsCode,
      needsLongContext,
      needsTools: needsWeb || needsCode || data.test(prompt),
      parallelizable: needsWeb && (needsCode || scores.writing || scores.planning),
      recommendedExecutor,
    };
  }
}
