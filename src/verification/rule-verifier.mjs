export class RuleVerifier {
  async verify({ prompt, output, execution }) {
    const text = String(output || "").trim();
    const hasOutput = text.length > 0;
    const obviousError = /^(error|exception|failed)\b/i.test(text) || execution?.error;
    return {
      source:"rules",
      pass: hasOutput && !obviousError,
      confidence: hasOutput && !obviousError ? 0.55 : 0.9,
      completeness: hasOutput ? 0.55 : 0,
      correctness: obviousError ? 0.1 : 0.5,
      shouldEscalate: !hasOutput || Boolean(obviousError),
      reason: !hasOutput ? "empty output" : obviousError ? "execution/error signal detected" : "basic structural checks passed",
      promptLength: String(prompt || "").length,
    };
  }
}
