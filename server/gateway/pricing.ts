/** Token pricing per 1M tokens (input/output) in USD */
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o":              { input: 2.50,   output: 10.00  },
  "gpt-4o-mini":         { input: 0.15,   output: 0.60   },
  "gpt-4-turbo":         { input: 10.00,  output: 30.00  },
  "gpt-4":               { input: 30.00,  output: 60.00  },
  "gpt-3.5-turbo":       { input: 0.50,   output: 1.50   },
  "claude-3-5-sonnet":   { input: 3.00,   output: 15.00  },
  "claude-3-opus":       { input: 15.00,  output: 75.00  },
  "claude-3-haiku":      { input: 0.25,   output: 1.25   },
  "llama-3-70b":         { input: 0.59,   output: 0.79   },
  "llama-3-8b":          { input: 0.05,   output: 0.08   },
  "mixtral-8x7b":        { input: 0.24,   output: 0.24   },
  "mistral-large":       { input: 2.00,   output: 6.00   },
  "mistral-7b":          { input: 0.25,   output: 0.25   },
  "gemini-1.5-pro":      { input: 1.25,   output: 5.00   },
  "gemini-1.5-flash":    { input: 0.075,  output: 0.30   },
};

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
}
