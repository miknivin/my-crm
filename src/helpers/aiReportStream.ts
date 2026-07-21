import type { AiFilterQueryStep, AiPlanOutcome } from "@/app/types/ai-report";

export type AiPlanStepView = {
  id: string;
  tool: string;
  purpose: string;
  ui?: { type: string; title?: string | null };
};

export type AiStreamHandlers = {
  onSession?: (data: { sessionId: string }) => void;
  onPlan?: (data: { outcome: AiPlanOutcome; steps: AiPlanStepView[] }) => void;
  onStepStart?: (data: { id: string }) => void;
  onStepResult?: (data: {
    id: string;
    step: AiFilterQueryStep;
    data: Array<Record<string, unknown>>;
    meta: { count: number };
  }) => void;
  onStepError?: (data: { id: string; message: string }) => void;
  onTextDelta?: (data: { delta: string }) => void;
  onDone?: (data: { sessionId: string }) => void;
  onError?: (data: { message: string }) => void;
};

/**
 * POST the query to /api/ai-filter/run and consume its SSE stream,
 * dispatching each event to the matching handler. RTK Query can't consume
 * streams, which is why this is a hand-rolled fetch reader; session/history
 * endpoints stay on RTK Query.
 */
export async function runAiQueryStream(
  body: { query: string; queryDisplay?: string; sessionId?: string },
  handlers: AiStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch("/api/ai-filter/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok || !contentType.includes("text/event-stream")) {
    let message = "AI request failed";
    try {
      const parsed = await res.json();
      message = parsed.message || parsed.error || message;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(message);
  }

  if (!res.body) throw new Error("Streaming not supported by this browser");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (event: string, payload: unknown) => {
    switch (event) {
      case "session":
        handlers.onSession?.(payload as { sessionId: string });
        break;
      case "plan":
        handlers.onPlan?.(payload as { outcome: AiPlanOutcome; steps: AiPlanStepView[] });
        break;
      case "step_start":
        handlers.onStepStart?.(payload as { id: string });
        break;
      case "step_result":
        handlers.onStepResult?.(
          payload as {
            id: string;
            step: AiFilterQueryStep;
            data: Array<Record<string, unknown>>;
            meta: { count: number };
          }
        );
        break;
      case "step_error":
        handlers.onStepError?.(payload as { id: string; message: string });
        break;
      case "text_delta":
        handlers.onTextDelta?.(payload as { delta: string });
        break;
      case "done":
        handlers.onDone?.(payload as { sessionId: string });
        break;
      case "error":
        handlers.onError?.(payload as { message: string });
        break;
    }
  };

  const processFrame = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length === 0) return;

    try {
      dispatch(event, JSON.parse(dataLines.join("\n")));
    } catch {
      // malformed frame — skip rather than kill the stream
    }
  };

  // SSE frames are separated by a blank line; buffer across chunk
  // boundaries since a frame can be split between reads.
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      processFrame(frame);
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) processFrame(buffer);
}
