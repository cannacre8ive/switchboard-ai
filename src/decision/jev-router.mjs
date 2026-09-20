/**
 * Jev decision adapter.
 * The SDK is loaded dynamically so the repository works in offline/rules mode
 * before dependencies or a TYPESAFE_API_KEY are configured.
 */
export class JevRouter {
  constructor({ apiKey = process.env.TYPESAFE_API_KEY, model = process.env.TYPESAFE_MODEL || "jev-latest" } = {}) {
    this.apiKey = apiKey;
    this.model = model;
  }

  get available() {
    return Boolean(this.apiKey);
  }

  async decide(prompt) {
    if (!this.available) throw new Error("TYPESAFE_API_KEY is not configured");

    const { TypeSafeClient, choice, noul, score } = await import("@typesafe-ai/sdk");
    const client = new TypeSafeClient({ apiKey: this.apiKey });

    const response = await client.systemOne({
      model: this.model,
      state: { user_request: prompt },
      questions: {
        taskType: choice("What is the primary kind of work required by this request?", {
          coding: "Implement, debug, modify, or reason about software.",
          research: "Find and synthesize external information or evidence.",
          writing: "Create or substantially revise prose for a human audience.",
          data: "Analyze structured data, metrics, tables, SQL, or statistics.",
          automation: "Operate tools or execute a multi-step workflow.",
          planning: "Design a system, strategy, architecture, or roadmap.",
          retrieval: "Find relevant information from existing files or context.",
          other: "None of the above is clearly primary.",
        }),
        executor: choice("Which executor is the cheapest plausible first attempt while preserving a strong chance of success?", {
          "cheap-general": "Low-cost general model for straightforward language tasks.",
          "claude-general": "Strong general model for writing, synthesis, planning, and long-context work.",
          "codex-coding": "Coding-specialized executor for repository work, debugging, implementation, or tests.",
          "frontier-reasoner": "Highest-cost path reserved for unusually difficult reasoning or planning.",
        }),
        complexity: score("How difficult is this request to complete correctly?", [
          "Trivial/routine",
          "Straightforward",
          "Moderately complex",
          "Complex",
          "Exceptionally difficult",
        ]),
        risk: score("How costly would an incorrect result be?", [
          "Low consequence",
          "Minor consequence",
          "Meaningful consequence",
          "High consequence",
          "Critical consequence",
        ]),
        needsWeb: noul("Does successful completion require current or external web information?"),
        needsCode: noul("Does successful completion require writing, editing, running, or deeply analyzing code?"),
        needsLongContext: noul("Does this task require substantial long-context input such as many files or a large repository?"),
        needsTools: noul("Does successful completion require using software tools, APIs, files, browsers, terminals, or external systems?"),
        parallelizable: noul("Can meaningful independent subtasks safely run in parallel?"),
        needsDecomposition: noul("Would this objective materially benefit from being decomposed into two or more independently routed subtasks rather than handled as one model call?"),
        toolGitHub: noul("Would access to a GitHub repository materially help complete this request?"),
        toolFiles: noul("Would reading or writing files materially help complete this request?"),
        toolBrowser: noul("Would an interactive browser materially help complete this request?"),
        toolPython: noul("Would Python or deterministic computation materially help complete this request?"),
        toolDrive: noul("Would access to cloud drive/documents materially help complete this request?"),
        toolEmail: noul("Would access to email materially help complete this request?"),
        mutatesExternalState: noul("Does completing the request require changing external state, such as sending, creating, editing, deleting, deploying, purchasing, or submitting something?"),
      },
    });

    const a = response.answers;
    const probabilityOf = (answer, selected) => {
      if (!answer) return 0.5;
      if (typeof answer.probability === "number") return answer.probability;
      if (answer.probabilities && selected in answer.probabilities) return answer.probabilities[selected];
      return 0.5;
    };
    const yesProbability = (answer) => {
      if (!answer) return 0.5;
      if (typeof answer.noul === "number") return answer.noul;
      if (typeof answer.probability === "number") return answer.probability;
      return 0.5;
    };
    const score01 = (answer) => {
      if (!answer) return 0.5;
      const raw = Number(answer.score);
      if (!Number.isFinite(raw)) return 0.5;
      return raw <= 1 ? Math.max(0, raw) : Math.min(1, Math.max(0, raw / 4));
    };

    const taskType = a.taskType?.choice ?? "other";
    const recommendedExecutor = a.executor?.choice ?? "cheap-general";
    const confidence = Math.min(
      probabilityOf(a.taskType, taskType),
      probabilityOf(a.executor, recommendedExecutor),
    );

    const toolHints = [];
    if (yesProbability(a.needsWeb) >= 0.5) toolHints.push("web");
    if (yesProbability(a.toolGitHub) >= 0.5) toolHints.push("github");
    if (yesProbability(a.toolFiles) >= 0.5) toolHints.push("files");
    if (yesProbability(a.toolBrowser) >= 0.5) toolHints.push("browser");
    if (yesProbability(a.toolPython) >= 0.5) toolHints.push("python");
    if (yesProbability(a.toolDrive) >= 0.5) toolHints.push("drive");
    if (yesProbability(a.toolEmail) >= 0.5) toolHints.push("email");

    return {
      source: "jev",
      taskType,
      complexity: score01(a.complexity),
      risk: score01(a.risk),
      confidence,
      needsWeb: yesProbability(a.needsWeb) >= 0.5,
      needsCode: yesProbability(a.needsCode) >= 0.5,
      needsLongContext: yesProbability(a.needsLongContext) >= 0.5,
      needsTools: yesProbability(a.needsTools) >= 0.5,
      parallelizable: yesProbability(a.parallelizable) >= 0.5,
      needsDecomposition: yesProbability(a.needsDecomposition) >= 0.5,
      toolHints,
      mutatesExternalState: yesProbability(a.mutatesExternalState) >= 0.5,
      recommendedExecutor,
      raw: response,
    };
  }
}
