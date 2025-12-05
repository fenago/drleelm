export default function LoadingIndicator({
  label = "Preparing your answer…",
  elapsedSeconds,
}: { label?: string; elapsedSeconds?: number }) {
  return (
    <div className="w-full max-w-4xl rounded-2xl p-6 border border-stone-900 bg-stone-950">
      <div className="flex items-center gap-4">
        <div className="relative h-5 w-5">
          <span className="absolute inset-0 rounded-full border-2 border-stone-700 animate-ping" />
          <span className="absolute inset-0 rounded-full border-2 border-stone-500" />
        </div>
        <div className="text-stone-300 flex items-center gap-3">
          <span>{label}</span>
          {elapsedSeconds !== undefined && (
            <span className="font-mono text-sky-400 tabular-nums text-sm">{elapsedSeconds}s</span>
          )}
        </div>
      </div>

      {elapsedSeconds !== undefined && elapsedSeconds > 10 && (
        <div className="mt-2 text-xs text-stone-500">
          LLM requests can take 15-30+ seconds depending on complexity
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="h-3 rounded bg-stone-800/60 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-stone-800/60 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-stone-800/60 animate-pulse" />
      </div>
    </div>
  );
}