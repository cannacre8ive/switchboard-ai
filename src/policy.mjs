const MODES = {
  economy: { minConfidence: 0.58, maxTier: 2, verifier: false },
  balanced: { minConfidence: 0.68, maxTier: 3, verifier: true },
  premium: { minConfidence: 0.78, maxTier: 4, verifier: true },
  max: { minConfidence: 0.88, maxTier: 5, verifier: true },
};

export function getPolicy(mode = "balanced") {
  return MODES[mode] ?? MODES.balanced;
}

export function applyEscalation(contract) {
  const policy = getPolicy(contract.mode);
  let executor = contract.recommendedExecutor;
  let reason = "router recommendation accepted";

  if (contract.risk >= 0.75 && executor === "cheap-general") {
    executor = contract.needs.code ? "codex-coding" : "claude-general";
    reason = "high-risk task prevented cheap first attempt";
  }

  if (contract.confidence < policy.minConfidence) {
    executor = contract.needs.code ? "codex-coding" : "frontier-reasoner";
    reason = `routing confidence ${contract.confidence.toFixed(2)} below ${policy.minConfidence.toFixed(2)} threshold`;
  }

  if (contract.complexity >= 0.86 && !contract.needs.code) {
    executor = "frontier-reasoner";
    reason = "exceptional complexity triggered frontier escalation";
  }

  return { executor, reason, verify: policy.verifier };
}
