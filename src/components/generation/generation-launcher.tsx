"use client";

import { useState } from "react";
import { generateImage } from "@/actions/generation";

interface Option {
  id: string;
  label: string;
}

export function GenerationLauncher({
  influencers,
  prompts,
}: {
  influencers: Option[];
  prompts: Option[];
}) {
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  async function pollGeneration(id: string) {
    let attempts = 0;

    while (attempts < 60) {
      const response = await fetch(`/api/generations/${id}`);
      const payload = (await response.json()) as {
        generation?: { errorMessage?: string | null; outputMediaUrl?: string | null; status: string };
      };

      if (payload.generation?.status === "SUCCEEDED") {
        setStatus("succeeded");
        setImageUrl(payload.generation.outputMediaUrl ?? null);
        return;
      }

      if (payload.generation?.status === "FAILED") {
        setStatus("failed");
        setError(payload.generation.errorMessage ?? "Generation failed.");
        return;
      }

      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setStatus("timed_out");
    setError("Generation did not finish before the polling timeout.");
  }

  return (
    <form
      className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setImageUrl(null);
        setStatus("starting");
        const formData = new FormData(event.currentTarget);
        const influencerId = String(formData.get("influencerId") ?? "");
        const promptId = String(formData.get("promptId") ?? "");
        const aspectRatio = String(formData.get("aspectRatio") ?? "4:5") as "1:1" | "4:5" | "9:16";

        try {
          const result = await generateImage({ influencerId, promptId, aspectRatio });
          setGenerationId(result.generationId);
          setStatus("running");
          await pollGeneration(result.generationId);
        } catch (caughtError) {
          setStatus("failed");
          setError(caughtError instanceof Error ? caughtError.message : "Generation failed to start.");
        }
      }}
    >
      <div>
        <p className="text-sm font-medium text-slate-500">Generation sandbox</p>
        <h3 className="text-2xl font-semibold text-slate-950">Generate a Nano Banana preview</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Influencer
          <select className="w-full rounded-xl border border-slate-300 px-4 py-3" name="influencerId" required>
            {influencers.map((influencer) => (
              <option key={influencer.id} value={influencer.id}>
                {influencer.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Prompt
          <select className="w-full rounded-xl border border-slate-300 px-4 py-3" name="promptId" required>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Aspect ratio
          <select className="w-full rounded-xl border border-slate-300 px-4 py-3" defaultValue="4:5" name="aspectRatio">
            <option value="1:1">1:1</option>
            <option value="4:5">4:5</option>
            <option value="9:16">9:16</option>
          </select>
        </label>
      </div>
      <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
        {status === "starting" || status === "running" ? "Generating…" : "Generate image"}
      </button>
      {generationId ? <p className="text-sm text-slate-500">Generation ID: {generationId}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {imageUrl ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <img alt="Generated preview" className="w-full object-cover" src={imageUrl} />
        </div>
      ) : null}
    </form>
  );
}
