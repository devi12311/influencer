"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { commitUpload, presignUpload } from "@/actions/upload";

type UploadKind = "INFLUENCER_ASSET" | "POST_MEDIA" | "PROMPT_REFERENCE";

type UploadStatus = "done" | "error" | "uploading" | "waiting";

interface UploadItem {
  error?: string;
  file: File;
  id: string;
  progress: number;
  status: UploadStatus;
}

interface ImageDropzoneProps {
  kind: UploadKind;
  onComplete?: () => void;
}

function uploadFileWithProgress(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`Upload failed with status ${request.status}.`));
    };
    request.onerror = () => reject(new Error("Upload failed due to a network error."));
    request.send(file);
  });
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        return;
      }
      await worker(item);
    }
  });

  await Promise.all(runners);
}

export function ImageDropzone({ kind, onComplete }: ImageDropzoneProps) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const updateUpload = useCallback((id: string, updater: (current: UploadItem) => UploadItem) => {
    setUploads((currentUploads) => currentUploads.map((item) => (item.id === id ? updater(item) : item)));
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      const nextItems = files.map((file) => ({
        file,
        id: `${file.name}-${crypto.randomUUID()}`,
        progress: 0,
        status: "waiting" as const,
      }));

      setUploads((current) => [...nextItems, ...current]);

      await runWithConcurrency(nextItems, 3, async (item) => {
        updateUpload(item.id, (current) => ({ ...current, progress: 1, status: "uploading" }));

        try {
          const upload = await presignUpload({
            contentType: item.file.type,
            filename: item.file.name,
            kind,
            size: item.file.size,
          });

          await uploadFileWithProgress(upload.uploadUrl, item.file, (progress) => {
            updateUpload(item.id, (current) => ({ ...current, progress, status: "uploading" }));
          });

          await commitUpload({
            expectedMime: item.file.type,
            expectedSize: item.file.size,
            kind,
            objectKey: upload.objectKey,
          });

          updateUpload(item.id, (current) => ({ ...current, progress: 100, status: "done" }));
        } catch (error) {
          updateUpload(item.id, (current) => ({
            ...current,
            error: error instanceof Error ? error.message : "Upload failed.",
            status: "error",
          }));
        }
      });

      onComplete?.();
      router.refresh();
    },
    [kind, onComplete, router, updateUpload],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      void processFiles(acceptedFiles);
    },
    [processFiles],
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: true,
    onDrop,
  });

  const hasUploads = uploads.length > 0;
  const uploadSummary = useMemo(() => uploads.filter((item) => item.status === "done").length, [uploads]);

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={`rounded-[2rem] border-2 border-dashed p-8 text-center transition ${
          isDragActive ? "border-slate-950 bg-slate-50" : "border-slate-300 bg-white"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-lg font-semibold text-slate-950">Drop images here, or click to browse.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">JPEG, PNG, or WebP • max 20MB per file • uploads run with concurrency 3.</p>
      </div>

      {hasUploads ? (
        <div className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Upload progress</h3>
            <p className="text-xs text-slate-500">{uploadSummary} complete</p>
          </div>
          <ul className="space-y-3">
            {uploads.map((upload) => (
              <li key={upload.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{upload.file.name}</p>
                    <p className="text-xs text-slate-500">{upload.status}</p>
                  </div>
                  {upload.status === "error" ? (
                    <button
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                      onClick={() => void processFiles([upload.file])}
                      type="button"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${upload.progress}%` }} />
                </div>
                {upload.error ? <p className="mt-2 text-xs text-red-600">{upload.error}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
