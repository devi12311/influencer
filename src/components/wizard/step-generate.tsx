"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { chooseDraftGenerationAction, startDraftGeneration } from "@/actions/post";

interface DraftGeneration {
  id: string;
  outputMediaUrl: string | null;
  status: string;
}

export function StepGenerate({
  draftId,
  initialAspectRatio,
  initialCurrentGenerationId,
  initialGenerations,
  influencerName,
  promptTitle,
}: {
  draftId: string;
  influencerName: string;
  initialAspectRatio?: "1:1" | "4:5" | "9:16";
  initialCurrentGenerationId?: string;
  initialGenerations: DraftGeneration[];
  promptTitle: string;
}) {
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">(initialAspectRatio ?? "4:5");
  const [currentGenerationId, setCurrentGenerationId] = useState<string | undefined>(initialCurrentGenerationId);
  const [generations, setGenerations] = useState<DraftGeneration[]>(initialGenerations);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  const currentGeneration = useMemo(
    () => generations.find((generation) => generation.id === currentGenerationId) ?? generations[generations.length - 1],
    [currentGenerationId, generations],
  );

  async function pollGeneration(id: string) {
    let attempts = 0;

    while (attempts < 60) {
      const response = await fetch(`/api/generations/${id}`);
      const payload = (await response.json()) as {
        generation?: { errorMessage?: string | null; outputMediaUrl?: string | null; status: string };
      };
      const generation = payload.generation;

      if (generation) {
        setGenerations((current) => {
          const existing = current.find((item) => item.id === id);
          const next = {
            id,
            outputMediaUrl: generation.outputMediaUrl ?? null,
            status: generation.status,
          };
          return existing ? current.map((item) => (item.id === id ? next : item)) : [...current, next];
        });
      }

      if (generation?.status === "SUCCEEDED") {
        setStatus("succeeded");
        setCurrentGenerationId(id);
        await chooseDraftGenerationAction({ draftId, generationId: id });
        return;
      }

      if (generation?.status === "FAILED") {
        setStatus("failed");
        setError(generation.errorMessage ?? "Generation failed.");
        return;
      }

      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setStatus("timed_out");
    setError("Generation did not finish before the polling timeout.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Step 3</p>
          <h2 className="text-3xl font-semibold text-slate-950">Generate image</h2>
          <p className="text-sm text-slate-600">Using {influencerName} + {promptTitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Aspect ratio
            <select className="rounded-xl border border-slate-300 px-4 py-3" onChange={(event) => setAspectRatio(event.target.value as "1:1" | "4:5" | "9:16")} value={aspectRatio}>
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="9:16">9:16</option>
            </select>
          </label>
          <button
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            onClick={async () => {
              setError(null);
              setStatus("starting");
              const result = await startDraftGeneration({ aspectRatio, draftId });
              setGenerations((current) => [...current, { id: result.generationId, outputMediaUrl: null, status: "RUNNING" }]);
              setCurrentGenerationId(result.generationId);
              setStatus("running");
              await pollGeneration(result.generationId);
            }}
            type="button"
          >
            {status === "starting" || status === "running" ? "Generating…" : generations.length > 0 ? "Regenerate" : "Generate"}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          {currentGeneration?.outputMediaUrl ? (
            <img alt="Generated output" className="w-full object-cover" src={currentGeneration.outputMediaUrl} />
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
              {status === "running" || status === "starting" ? "Generating image…" : "Start a generation to preview an image here."}
            </div>
          )}
        </div>
      </section>
      <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6">
        {currentGenerationId ? (
          <Link className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href={`/new-post?draft=${draftId}&step=4`}>
            Continue to review
          </Link>
        ) : null}
        <div>
          <p className="text-sm font-medium text-slate-500">Draft generations</p>
          <h3 className="text-xl font-semibold text-slate-950">Choose a winner</h3>
        </div>
        <div className="space-y-3">
          {generations.length === 0 ? <p className="text-sm text-slate-500">No generations yet.</p> : null}
          {generations.map((generation) => (
            <button
              key={generation.id}
              className={`w-full space-y-2 rounded-2xl border p-3 text-left ${currentGenerationId === generation.id ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"}`}
              onClick={async () => {
                setCurrentGenerationId(generation.id);
                await chooseDraftGenerationAction({ draftId, generationId: generation.id });
              }}
              type="button"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                {generation.outputMediaUrl ? <img alt={generation.id} className="h-full w-full object-cover" src={generation.outputMediaUrl} /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">{generation.status}</div>}
              </div>
              <p className="text-xs text-slate-500">{generation.id}</p>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
