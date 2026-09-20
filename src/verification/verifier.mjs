import { JevVerifier } from "./jev-verifier.mjs";
import { RuleVerifier } from "./rule-verifier.mjs";

export class SwitchboardVerifier {
  constructor({ preferJev = true } = {}) {
    this.preferJev = preferJev;
    this.jev = new JevVerifier();
    this.rules = new RuleVerifier();
  }
  async verify(input) {
    if (this.preferJev && this.jev.available) {
      try { return await this.jev.verify(input); }
      catch (error) {
        const fallback = await this.rules.verify(input);
        return { ...fallback, fallbackReason: `Jev verification failed: ${error.message}` };
      }
    }
    return this.rules.verify(input);
  }
}
