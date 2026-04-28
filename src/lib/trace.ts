import type { TraceEvent } from "@/src/domain/contracts";

export class Trace {
  private events: TraceEvent[] = [];

  add(event: Omit<TraceEvent, "id">) {
    const next: TraceEvent = {
      id: `${this.events.length + 1}`.padStart(3, "0"),
      ...event
    };
    this.events.push(next);
    return next;
  }

  all() {
    return this.events;
  }
}

export function clampConfidence(value: number) {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}
