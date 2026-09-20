import "server-only";

export type AIRequest = {
  feature: "lead_summary" | "conversation_summary" | "suggested_reply" | "lead_scoring";
  input: Record<string, unknown>;
};

export type AIResponse = {
  provider: string;
  output: string;
  /** Every AI response must be clearly distinguishable from human-entered content in the UI. */
  isAiGenerated: true;
};

/**
 * AI provider abstraction (Section 57). CRM code never calls a specific
 * model API directly - only this interface. Swapping AI_PROVIDER swaps the
 * implementation without touching call sites. Only the mock provider is
 * wired up without real credentials.
 */
export interface AIProvider {
  readonly name: string;
  complete(req: AIRequest): Promise<AIResponse>;
}

class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async complete(req: AIRequest): Promise<AIResponse> {
    let output: string;
    switch (req.feature) {
      case "lead_summary": {
        const { name, status, priority, source, activityCount } = req.input as Record<string, unknown>;
        output = `${name} is a ${String(priority).toLowerCase()}-priority lead from ${source}, currently ${String(status).toLowerCase().replace("_", " ")}. ${activityCount} activities logged so far. Recommend a follow-up call to confirm requirements and timeline.`;
        break;
      }
      case "conversation_summary":
        output = "Customer inquired about pricing and availability; no objections raised. Suggested next step: send a proposal.";
        break;
      case "suggested_reply":
        output = "Thanks for reaching out! I'd be happy to help — could you share a bit more about what you're looking for so I can point you to the right option?";
        break;
      case "lead_scoring":
        output = "72/100 — active engagement and a matching budget signal, but no confirmed timeline yet.";
        break;
      default:
        output = "No summary available.";
    }
    return { provider: this.name, output, isAiGenerated: true };
  }
}

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (provider) return provider;
  // Only "mock" is implemented; AI_PROVIDER is the seam for a real
  // Anthropic/OpenAI-backed implementation once API credentials exist.
  provider = new MockAIProvider();
  return provider;
}
