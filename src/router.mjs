import { createTaskContract } from "./contracts.mjs";
import { RuleRouter } from "./decision/rule-router.mjs";
import { JevRouter } from "./decision/jev-router.mjs";
import { applyEscalation } from "./policy.mjs";

export class SwitchboardRouter {
  constructor({ mode = process.env.SWITCHBOARD_MODE || "balanced", budgetUsd = Number(process.env.SWITCHBOARD_MAX_COST_USD || 1), preferJev = true } = {}) {
    this.mode = mode;
    this.budgetUsd = budgetUsd;
    this.ruleRouter = new RuleRouter();
    this.jevRouter = new JevRouter();
    this.preferJev = preferJev;
  }

  async route(prompt) {
    let decision;
    if (this.preferJev && this.jevRouter.available) {
      try {
        decision = await this.jevRouter.decide(prompt);
      } catch (error) {
        decision = await this.ruleRouter.decide(prompt);
        decision.fallbackReason = `Jev failed: ${error.message}`;
      }
    } else {
      decision = await this.ruleRouter.decide(prompt);
    }

    const contract = createTaskContract({
      prompt,
      decision,
      budgetUsd: this.budgetUsd,
      mode: this.mode,
    });
    const policy = applyEscalation(contract);
    return { contract, policy };
  }
}
