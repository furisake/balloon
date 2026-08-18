/// <reference lib="webworker" />
import { parse } from "@/lib/core/parser";
import { lint } from "@/lib/core/linter";

self.onmessage = (event: MessageEvent<{ source: string }>) => {
  const parsed = parse(event.data.source);
  self.postMessage({ ...parsed, diagnostics: [...parsed.diagnostics, ...lint(event.data.source)] });
};
