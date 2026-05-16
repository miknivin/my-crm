export type AiSummary = Record<string, number | string>;

export type AiChart = {
  type: "line" | "bar" | "pie";
  categories?: string[];
  labels?: string[];
  series: Array<{ name: string; data: number[] }> | number[];
  title?: string;
};

export type AiFilterUiType = "table" | "stat_card" | "stat_table" | "chart_trend";

export type AiFilterQueryStep = {
  type: "find" | "aggregate";
  filterActions?: Array<{ method: string; args?: unknown[] }>;
  projection?: Record<string, number>;
  sort?: Record<string, number>;
  limit?: number;
  populate?: string[];
  aggregateActions?: Array<{ method: string; args?: unknown[] }>;
  ui?: { type: AiFilterUiType; title?: string };
  reasoning?: string;
};

export type AiFilterQueryResult = {
  step: AiFilterQueryStep;
  data?: Array<Record<string, unknown>>;
  summary?: AiSummary;
  samples?: Array<Record<string, unknown>>;
  chart?: AiChart;
  meta?: {
    count?: number;
    limit?: number;
  };
};

export type AiFilterQueryResponse = {
  success: boolean;
  sessionId?: string;
  querySpec?: { steps: AiFilterQueryStep[] };
  toolRequest?: Record<string, unknown>;
  results?: AiFilterQueryResult[];
  steps?: Array<AiFilterQueryResult | AiFilterQueryStep>;
  usage?: unknown;
  rawPrompt?: string;
  rawPromptInternal?: string;
  cached?: boolean;
  meta?: {
    executedBy?: string;
    isTeamMember?: boolean;
  };
};
