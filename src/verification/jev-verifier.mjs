export class JevVerifier {
  constructor({ apiKey = process.env.TYPESAFE_API_KEY, model = process.env.TYPESAFE_MODEL || "jev-latest" } = {}) {
    this.apiKey = apiKey;
    this.model = model;
  }
  get available() { return Boolean(this.apiKey); }

  async verify({ prompt, output, taskType, risk = 0.2 }) {
    if (!this.available) throw new Error("TYPESAFE_API_KEY is not configured");
    const { TypeSafeClient, noul, score } = await import("@typesafe-ai/sdk");
    const client = new TypeSafeClient({ apiKey: this.apiKey });
    const response = await client.systemOne({
      model: this.model,
      state: { user_request: prompt, candidate_output: output, task_type: taskType },
      questions: {
        fulfillsRequest: noul("Does the candidate output actually fulfill the user's stated request rather than merely discussing it?"),
        containsUnsupportedClaims: noul("Does the candidate output appear to make important claims that are unsupported by the provided state or presented with unjustified certainty?"),
        completeness: score("How complete is the candidate output relative to the user's request?", ["Misses the task","Major requirements missing","Partially complete","Mostly complete","Fully complete"]),
        correctness: score("How likely is the candidate output to be correct and internally consistent based on the provided state?", ["Clearly incorrect","Substantial problems","Mixed/uncertain","Mostly correct","Strongly correct"]),
      },
    });
    return { ...interpretJevVerification(response.answers, { risk }), usage: response.usage ?? null, model: response.model ?? this.model, raw: response };
  }
}

export function interpretJevVerification(answers, { risk = 0.2 } = {}) {
  const fulfills = Number(answers?.fulfillsRequest?.noul ?? 0.5);
  const unsupported = Number(answers?.containsUnsupportedClaims?.noul ?? 0.5);
  const completeness = normalizeFiveLevelScore(answers?.completeness?.score);
  const correctness = normalizeFiveLevelScore(answers?.correctness?.score);
  const passThreshold = risk >= 0.75 ? 0.86 : risk >= 0.45 ? 0.78 : 0.7;
  const composite = Math.min(fulfills, completeness, correctness, 1 - unsupported * 0.6);
  const pass = composite >= passThreshold;
  return { source:"jev", pass, confidence:composite, fulfillsRequest:fulfills, unsupportedClaims:unsupported, completeness, correctness, shouldEscalate:!pass, threshold:passThreshold };
}

function normalizeFiveLevelScore(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0.5;
  return raw <= 1 ? Math.max(0, raw) : Math.min(1, Math.max(0, raw / 4));
}
