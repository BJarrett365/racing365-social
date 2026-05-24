"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/app/components/Panel";
import { R365Button } from "@/app/components/R365Button";
import { DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT } from "@/app/lib/higgsfield/constants";
import { withAppPathPrefix } from "@/app/lib/app-base-path";
import { isSafeContentId, normalizeContentIdForFilename } from "@/app/lib/editor-content-id";
import {
  buildF365MatchReportOpenAiPrompt,
  buildF365MatchReportRunwayPrompt,
  buildF365PreviewOpenAiPrompt,
  buildF365PreviewRunwayPrompt,
  f365HeroVarsFromArticle,
  f365PreviewVarsFromArticle,
  f365RunwayArticleHook,
  type ArticleHeroSource,
} from "@/app/lib/language-studio/f365-text-to-image-prompts";
import { RUNWAY_T2I_PROMPT_MAX, RUNWAY_T2I_RATIOS_NEWS_SHORTS, formatRunwayT2iRatioLabel } from "@/app/lib/runway-text-to-image-constants";

type AspectOption = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

type T2iProvider = "runway" | "openai" | "higgsfield";

type EditState = {
  brightnessPct: number;
  contrastPct: number;
  saturatePct: number;
  rotationDeg: number;
  flipH: boolean;
  flipV: boolean;
};

const DEFAULT_EDIT: EditState = {
  brightnessPct: 100,
  contrastPct: 100,
  saturatePct: 100,
  rotationDeg: 0,
  flipH: false,
  flipV: false,
};

function clientToCanvasCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

/** Render image with adjustments + rotation + flip into canvas (overwrites dimensions). */
function renderImageToCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement, opts: EditState): void {
  const rad = (opts.rotationDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const outW = Math.max(1, Math.round(iw * cos + ih * sin));
  const outH = Math.max(1, Math.round(iw * sin + ih * cos));
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const bf = opts.brightnessPct / 100;
  const cf = opts.contrastPct / 100;
  const sf = opts.saturatePct / 100;
  ctx.filter = `brightness(${bf}) contrast(${cf}) saturate(${sf})`;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(rad);
  ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1);
  ctx.drawImage(img, -iw / 2, -ih / 2);
  ctx.restore();
  ctx.filter = "none";
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not build image from canvas."));
    img.src = canvas.toDataURL("image/png");
  });
}

function readFileAsBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const match = /^data:([^;]+);base64,(.+)$/.exec(raw);
      if (!match) {
        reject(new Error("Could not read file as base64."));
        return;
      }
      resolve({ mime: match[1].trim(), base64: match[2].replace(/\s/g, "") });
    };
    reader.onerror = () => reject(new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function parseTagsCsv(raw: string): string[] | undefined {
  const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function buildPresetArticleSource(args: {
  title: string;
  standfirst: string;
  body: string;
  category: string;
  tagsCsv: string;
}): ArticleHeroSource | null {
  const title = args.title.trim();
  if (!title) return null;
  return {
    title,
    standfirst: args.standfirst.trim(),
    body: args.body.trim(),
    category: args.category.trim() || undefined,
    tags: parseTagsCsv(args.tagsCsv),
  };
}

export function AiImageEditorClient() {
  const searchParams = useSearchParams();
  const displayRef = useRef<HTMLCanvasElement>(null);

  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const [hasOriginalFile, setHasOriginalFile] = useState(false);

  const [edit, setEdit] = useState<EditState>(DEFAULT_EDIT);
  const [history, setHistory] = useState<EditState[]>([]);

  const [cropMode, setCropMode] = useState(false);
  const [cropDrag, setCropDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectOption>("1:1");
  const [presetTitle, setPresetTitle] = useState("");
  const [presetStandfirst, setPresetStandfirst] = useState("");
  const [presetBody, setPresetBody] = useState("");
  const [presetCategory, setPresetCategory] = useState("");
  const [presetTagsCsv, setPresetTagsCsv] = useState("");
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [modelEndpoint, setModelEndpoint] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultLibraryRel, setResultLibraryRel] = useState<string | null>(null);

  const [t2iProvider, setT2iProvider] = useState<T2iProvider>("higgsfield");
  const [t2iPrompt, setT2iPrompt] = useState("");
  const [t2iRunwayRatio, setT2iRunwayRatio] = useState("1280:720");
  const [t2iOpenAiSize, setT2iOpenAiSize] = useState<"1792x1024" | "1024x1024" | "1024x1792">("1792x1024");
  const [t2iHiggsAspect, setT2iHiggsAspect] = useState<AspectOption>("16:9");
  const [t2iBusy, setT2iBusy] = useState(false);
  const [t2iError, setT2iError] = useState<string | null>(null);
  const [t2iMessage, setT2iMessage] = useState<string | null>(null);
  const [t2iPreviewUrl, setT2iPreviewUrl] = useState<string | null>(null);
  const [t2iLibraryRel, setT2iLibraryRel] = useState<string | null>(null);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-19), { ...edit }]);
  }, [edit]);

  const redraw = useCallback(() => {
    const canvas = displayRef.current;
    if (!canvas || !baseImage) return;
    renderImageToCanvas(canvas, baseImage, edit);
  }, [baseImage, edit]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const loadImageFromFile = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      const url = URL.createObjectURL(file);
      originalUrlRef.current = url;
      const img = new Image();
      img.onload = () => {
        setBaseImage(img);
        setEdit(DEFAULT_EDIT);
        setHistory([]);
        setCropMode(false);
        setCropDrag(null);
        setHasOriginalFile(true);
      };
      img.src = url;
    },
    [],
  );

  const loadImageFromUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSourceImageUrl(trimmed);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBaseImage(img);
      setEdit(DEFAULT_EDIT);
      setHistory([]);
      setCropMode(false);
      setCropDrag(null);
      setHasOriginalFile(false);
    };
    img.onerror = () => setAiError("Could not load image from URL.");
    img.src = trimmed;
  }, []);

  useEffect(() => {
    const rel = searchParams.get("rel")?.trim();
    if (!rel) return;
    loadImageFromUrl(withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}`));
  }, [loadImageFromUrl, searchParams]);

  const resetImage = useCallback(() => {
    const url = originalUrlRef.current;
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      setBaseImage(img);
      setEdit(DEFAULT_EDIT);
      setHistory([]);
      setCropMode(false);
      setCropDrag(null);
      setHasOriginalFile(true);
    };
    img.src = url;
  }, []);

  const resetAdjustments = useCallback(() => {
    pushHistory();
    setEdit(DEFAULT_EDIT);
  }, [pushHistory]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setEdit(prev);
      return h.slice(0, -1);
    });
  }, []);

  const rotateBy = useCallback(
    (delta: number) => {
      pushHistory();
      setEdit((e) => ({
        ...e,
        rotationDeg: (((e.rotationDeg + delta) % 360) + 360) % 360,
      }));
    },
    [pushHistory],
  );

  const toggleFlipH = useCallback(() => {
    pushHistory();
    setEdit((e) => ({ ...e, flipH: !e.flipH }));
  }, [pushHistory]);

  const toggleFlipV = useCallback(() => {
    pushHistory();
    setEdit((e) => ({ ...e, flipV: !e.flipV }));
  }, [pushHistory]);

  const applyCrop = useCallback(async () => {
    const canvas = displayRef.current;
    if (!canvas || !baseImage || !cropDrag) return;
    const x0 = Math.min(cropDrag.x0, cropDrag.x1);
    const y0 = Math.min(cropDrag.y0, cropDrag.y1);
    const w = Math.abs(cropDrag.x1 - cropDrag.x0);
    const h = Math.abs(cropDrag.y1 - cropDrag.y0);
    if (w < 4 || h < 4) return;

    pushHistory();
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(w);
    tmp.height = Math.round(h);
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    renderImageToCanvas(canvas, baseImage, edit);
    tctx.drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
    try {
      const next = await canvasToImage(tmp);
      setBaseImage(next);
      setEdit(DEFAULT_EDIT);
      setCropMode(false);
      setCropDrag(null);
    } catch {
      /* ignore */
    }
  }, [baseImage, cropDrag, edit, pushHistory]);

  const downloadPng = useCallback(() => {
    const canvas = displayRef.current;
    if (!canvas || !baseImage) return;
    renderImageToCanvas(canvas, baseImage, edit);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `edited-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }, [baseImage, edit]);

  const loadEditedIntoAi = useCallback(async () => {
    const canvas = displayRef.current;
    if (!canvas || !baseImage) return;
    renderImageToCanvas(canvas, baseImage, edit);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], `editor-export-${Date.now()}.png`, { type: "image/png" });
        setAiFile(f);
        setAiError(null);
        setPresetMessage("Exported current canvas to AI step — run AI edit when ready.");
      },
      "image/png",
    );
  }, [baseImage, edit]);

  const onCropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!cropMode || !displayRef.current) return;
      const { x, y } = clientToCanvasCoords(e.clientX, e.clientY, displayRef.current);
      setCropDrag({ x0: x, y0: y, x1: x, y1: y });
    },
    [cropMode],
  );

  const onCropMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!cropMode || !cropDrag || !displayRef.current) return;
      const { x, y } = clientToCanvasCoords(e.clientX, e.clientY, displayRef.current);
      setCropDrag((d) => (d ? { ...d, x1: x, y1: y } : null));
    },
    [cropMode, cropDrag],
  );

  const onCropMouseUp = useCallback(() => {
    /* selection finalized in cropDrag */
  }, []);

  const cropOverlayStyle = (): React.CSSProperties | null => {
    if (!cropMode || !cropDrag || !displayRef.current) return null;
    const c = displayRef.current;
    const x0 = Math.min(cropDrag.x0, cropDrag.x1);
    const y0 = Math.min(cropDrag.y0, cropDrag.y1);
    const w = Math.abs(cropDrag.x1 - cropDrag.x0);
    const h = Math.abs(cropDrag.y1 - cropDrag.y0);
    return {
      left: `${(x0 / c.width) * 100}%`,
      top: `${(y0 / c.height) * 100}%`,
      width: `${(w / c.width) * 100}%`,
      height: `${(h / c.height) * 100}%`,
    };
  };

  const applyMatchReportImagePrompt = useCallback(() => {
    const article = buildPresetArticleSource({
      title: presetTitle,
      standfirst: presetStandfirst,
      body: presetBody,
      category: presetCategory,
      tagsCsv: presetTagsCsv,
    });
    if (!article) {
      setPresetMessage(null);
      setAiError("Add an article title for this preset.");
      return;
    }
    setAiError(null);
    const v = f365HeroVarsFromArticle(article);
    setAiPrompt(buildF365MatchReportOpenAiPrompt(v, article));
    setAspectRatio("16:9");
    setPresetMessage("Match report prompt filled for AI assist.");
  }, [presetBody, presetCategory, presetStandfirst, presetTagsCsv, presetTitle]);

  const applyPreviewImagePrompt = useCallback(() => {
    const article = buildPresetArticleSource({
      title: presetTitle,
      standfirst: presetStandfirst,
      body: presetBody,
      category: presetCategory,
      tagsCsv: presetTagsCsv,
    });
    if (!article) {
      setPresetMessage(null);
      setAiError("Add an article title for this preset.");
      return;
    }
    setAiError(null);
    const pv = f365PreviewVarsFromArticle(article);
    setAiPrompt(buildF365PreviewOpenAiPrompt(pv, article));
    setAspectRatio("16:9");
    setPresetMessage("Preview hero prompt filled for AI assist.");
  }, [presetBody, presetCategory, presetStandfirst, presetTagsCsv, presetTitle]);

  const applyMatchReportT2i = useCallback(() => {
    const article = buildPresetArticleSource({
      title: presetTitle,
      standfirst: presetStandfirst,
      body: presetBody,
      category: presetCategory,
      tagsCsv: presetTagsCsv,
    });
    if (!article) {
      setT2iMessage(null);
      setT2iError("Add an article title for this preset.");
      return;
    }
    setT2iError(null);
    const v = f365HeroVarsFromArticle(article);
    const snip = { standfirst: article.standfirst, body: article.body };
    setT2iPrompt(
      t2iProvider === "openai" || t2iProvider === "higgsfield"
        ? buildF365MatchReportOpenAiPrompt(v, snip)
        : buildF365MatchReportRunwayPrompt(v, { narrativeHook: f365RunwayArticleHook(snip) }),
    );
    setT2iMessage("Match report prompt filled for text-to-image.");
  }, [presetBody, presetCategory, presetStandfirst, presetTagsCsv, presetTitle, t2iProvider]);

  const applyPreviewT2i = useCallback(() => {
    const article = buildPresetArticleSource({
      title: presetTitle,
      standfirst: presetStandfirst,
      body: presetBody,
      category: presetCategory,
      tagsCsv: presetTagsCsv,
    });
    if (!article) {
      setT2iMessage(null);
      setT2iError("Add an article title for this preset.");
      return;
    }
    setT2iError(null);
    const pv = f365PreviewVarsFromArticle(article);
    const snip = { standfirst: article.standfirst, body: article.body };
    setT2iPrompt(
      t2iProvider === "openai" || t2iProvider === "higgsfield"
        ? buildF365PreviewOpenAiPrompt(pv, snip)
        : buildF365PreviewRunwayPrompt(pv, { narrativeHook: f365RunwayArticleHook(snip) }),
    );
    setT2iMessage("Preview hero prompt filled for text-to-image.");
  }, [presetBody, presetCategory, presetStandfirst, presetTagsCsv, presetTitle, t2iProvider]);

  const runT2i = useCallback(async () => {
    const promptText = t2iPrompt.trim();
    if (!promptText) {
      setT2iError("Enter a prompt (or use the Football365 buttons below with an article title).");
      setT2iMessage(null);
      return;
    }
    setT2iBusy(true);
    setT2iError(null);
    setT2iMessage(null);
    setT2iPreviewUrl(null);
    setT2iLibraryRel(null);
    try {
      if (t2iProvider === "openai") {
        const res = await fetch("/api/openai/text-to-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            size: t2iOpenAiSize,
            quality: "standard",
          }),
        });
        const data = (await res.json()) as { error?: string; imageUrl?: string; imageLibraryRel?: string };
        if (!res.ok || !data.imageUrl) throw new Error(data.error || "OpenAI text-to-image failed.");
        setT2iPreviewUrl(data.imageUrl);
        setT2iLibraryRel(data.imageLibraryRel?.trim() ? data.imageLibraryRel.trim() : null);
        setT2iMessage("OpenAI image saved to library. Open Media Library or attach the path in Language Studio.");
        return;
      }
      if (t2iProvider === "higgsfield") {
        const res = await fetch("/api/higgsfield/text-to-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            aspectRatio: t2iHiggsAspect,
          }),
        });
        const data = (await res.json()) as { error?: string; imageUrl?: string; imageLibraryRel?: string };
        if (!res.ok || !data.imageUrl) throw new Error(data.error || "Higgsfield text-to-image failed.");
        setT2iPreviewUrl(data.imageUrl);
        setT2iLibraryRel(data.imageLibraryRel?.trim() ? data.imageLibraryRel.trim() : null);
        setT2iMessage("Higgsfield image saved to library.");
        return;
      }
      if (promptText.length > RUNWAY_T2I_PROMPT_MAX) {
        throw new Error(
          `Runway allows at most ${RUNWAY_T2I_PROMPT_MAX} characters. Shorten the prompt or switch to OpenAI / Higgsfield.`,
        );
      }
      const startRes = await fetch("/api/runway/text-to-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText, ratio: t2iRunwayRatio }),
      });
      const startData = (await startRes.json()) as { error?: string; taskId?: string };
      if (!startRes.ok) throw new Error(startData.error || "Runway text-to-image failed.");
      const taskId = typeof startData.taskId === "string" ? startData.taskId.trim() : "";
      if (!taskId) throw new Error("Runway did not return a task id.");
      const norm = normalizeContentIdForFilename(`editor-t2i-${Date.now().toString(36)}`);
      const contentId = isSafeContentId(norm) && norm.length > 0 ? norm : `editor-t2i-${Date.now().toString(36)}`;
      const maxAttempts = 45;
      const delayMs = 3000;
      let lastStatus = "";
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, delayMs));
        const impRes = await fetch("/api/runway/import-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, taskId, assetKind: "image" }),
        });
        const impData = (await impRes.json()) as { error?: string; backgroundImageRel?: string; status?: string };
        if (impRes.ok && typeof impData.backgroundImageRel === "string" && impData.backgroundImageRel.trim()) {
          const rel = impData.backgroundImageRel.trim();
          setT2iPreviewUrl(withAppPathPrefix(`/api/file?rel=${encodeURIComponent(rel)}`));
          setT2iLibraryRel(rel);
          setT2iMessage(`Runway image ready (task ${taskId}).`);
          return;
        }
        if (impRes.status === 409) {
          lastStatus = typeof impData.status === "string" ? impData.status : "processing";
          continue;
        }
        throw new Error(impData.error || `Runway import failed (${impRes.status}).`);
      }
      const approxMin = Math.round((maxAttempts * delayMs) / 6000) / 10;
      throw new Error(
        lastStatus
          ? `Runway task did not finish within ~${approxMin} min (last status: ${lastStatus}).`
          : `Runway task did not finish within ~${approxMin} min.`,
      );
    } catch (e) {
      setT2iError(e instanceof Error ? e.message : "Text-to-image failed.");
    } finally {
      setT2iBusy(false);
    }
  }, [t2iPrompt, t2iProvider, t2iOpenAiSize, t2iHiggsAspect, t2iRunwayRatio]);

  const runAiEdit = async () => {
    setAiBusy(true);
    setAiError(null);
    setResultImageUrl(null);
    setResultLibraryRel(null);
    try {
      const trimmedUrl = sourceImageUrl.trim();
      let payload: Record<string, unknown>;

      if (trimmedUrl) {
        payload = {
          prompt: aiPrompt.trim(),
          aspectRatio,
          sourceImageUrl: trimmedUrl,
        };
      } else if (aiFile) {
        const { base64, mime } = await readFileAsBase64(aiFile);
        payload = {
          prompt: aiPrompt.trim(),
          aspectRatio,
          imageBase64: base64,
          imageMimeType: mime,
        };
      } else {
        throw new Error("Use “Send canvas to AI” after editing, paste an HTTPS image URL, or pick a file below.");
      }

      const ep = modelEndpoint.trim();
      if (ep) payload.modelEndpoint = ep;

      const res = await fetch("/api/higgsfield/image-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        imageUrl?: string;
        imageLibraryRel?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (${res.status}).`);

      setResultImageUrl(data.imageUrl ?? null);
      setResultLibraryRel(data.imageLibraryRel ?? null);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI edit failed.");
    } finally {
      setAiBusy(false);
    }
  };

  const brightnessSlider = (
    <label className="flex min-w-[120px] flex-1 flex-col gap-1 text-[11px] font-semibold uppercase text-[color:var(--text-muted)]">
      Brightness
      <input
        type="range"
        min={50}
        max={150}
        value={edit.brightnessPct}
        onMouseDown={() => pushHistory()}
        onChange={(e) => setEdit((prev) => ({ ...prev, brightnessPct: Number(e.target.value) }))}
      />
      <span className="text-[10px] font-normal normal-case text-[color:var(--text-secondary)]">{edit.brightnessPct}%</span>
    </label>
  );

  const contrastSlider = (
    <label className="flex min-w-[120px] flex-1 flex-col gap-1 text-[11px] font-semibold uppercase text-[color:var(--text-muted)]">
      Contrast
      <input
        type="range"
        min={50}
        max={150}
        value={edit.contrastPct}
        onMouseDown={() => pushHistory()}
        onChange={(e) => setEdit((prev) => ({ ...prev, contrastPct: Number(e.target.value) }))}
      />
      <span className="text-[10px] font-normal normal-case text-[color:var(--text-secondary)]">{edit.contrastPct}%</span>
    </label>
  );

  const saturateSlider = (
    <label className="flex min-w-[120px] flex-1 flex-col gap-1 text-[11px] font-semibold uppercase text-[color:var(--text-muted)]">
      Saturation
      <input
        type="range"
        min={0}
        max={200}
        value={edit.saturatePct}
        onMouseDown={() => pushHistory()}
        onChange={(e) => setEdit((prev) => ({ ...prev, saturatePct: Number(e.target.value) }))}
      />
      <span className="text-[10px] font-normal normal-case text-[color:var(--text-secondary)]">{edit.saturatePct}%</span>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div>
        <Link href="/tools" className="text-sm font-semibold text-[#22c55e] hover:underline">
          ← Tools
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--text-primary)]">Image Editor</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Adjust, rotate, flip, crop and export images in the browser — similar to a lightweight desktop editor. Use{" "}
          <strong className="text-[color:var(--text-primary)]">Text to image</strong> below to generate a library still (Runway / OpenAI / Higgsfield) without uploading first. Optional{" "}
          <strong className="text-[color:var(--text-primary)]">AI assist</strong> (Higgsfield image-edit) runs after manual edits when you want a prompt-based pass with a source image.
        </p>
      </div>

      <Panel title="Canvas">
        <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border)] pb-4">
          <label className="cursor-pointer rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-hover)]">
            Open…
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => loadImageFromFile(e.target.files?.[0] ?? null)} />
          </label>
          <R365Button type="button" variant="ghost" disabled={!baseImage} onClick={resetAdjustments}>
            Reset adjustments
          </R365Button>
          <R365Button type="button" variant="ghost" disabled={!hasOriginalFile} onClick={resetImage}>
            Reload original file
          </R365Button>
          <R365Button type="button" variant="ghost" disabled={history.length === 0} onClick={undo}>
            Undo
          </R365Button>
          <span className="mx-1 h-6 w-px bg-[color:var(--border)]" aria-hidden />
          <R365Button type="button" variant="ghost" disabled={!baseImage} onClick={() => rotateBy(-90)}>
            Rotate −90°
          </R365Button>
          <R365Button type="button" variant="ghost" disabled={!baseImage} onClick={() => rotateBy(90)}>
            Rotate +90°
          </R365Button>
          <R365Button type="button" variant="ghost" disabled={!baseImage} onClick={toggleFlipH}>
            Flip H
          </R365Button>
          <R365Button type="button" variant="ghost" disabled={!baseImage} onClick={toggleFlipV}>
            Flip V
          </R365Button>
          <span className="mx-1 h-6 w-px bg-[color:var(--border)]" aria-hidden />
          <R365Button
            type="button"
            variant="ghost"
            disabled={!baseImage}
            onClick={() => {
              setCropMode((c) => !c);
              setCropDrag(null);
            }}
          >
            {cropMode ? "Exit crop" : "Crop"}
          </R365Button>
          <R365Button type="button" variant="ghost" disabled={!cropMode || !cropDrag} onClick={() => void applyCrop()}>
            Apply crop
          </R365Button>
          <span className="mx-1 h-6 w-px bg-[color:var(--border)]" aria-hidden />
          <R365Button type="button" disabled={!baseImage} onClick={downloadPng}>
            Download PNG
          </R365Button>
          <Link href="/library">
            <R365Button type="button" variant="ghost">
              Library
            </R365Button>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          {brightnessSlider}
          {contrastSlider}
          {saturateSlider}
        </div>

        <div className="relative mt-4 inline-block max-w-full rounded-xl border border-[color:var(--border)] bg-[repeating-conic-gradient(#404040_0%_25%,#2a2a2a_0%_50%)_50%/16px_16px]"
        >
          {!baseImage ? (
            <div className="flex min-h-[240px] min-w-[min(100%,420px)] items-center justify-center px-8 py-16 text-sm text-[color:var(--text-muted)]">
              Open an image to start editing.
            </div>
          ) : (
            <>
              <canvas
                ref={displayRef}
                className={`max-h-[min(75vh,900px)] max-w-full ${cropMode ? "cursor-crosshair" : ""}`}
                onMouseDown={onCropMouseDown}
                onMouseMove={onCropMouseMove}
                onMouseUp={onCropMouseUp}
                onMouseLeave={onCropMouseUp}
              />
              {cropMode && cropOverlayStyle() ? (
                <div
                  className="pointer-events-none absolute box-border border-2 border-[#22c55e]"
                  style={cropOverlayStyle() ?? undefined}
                />
              ) : null}
            </>
          )}
        </div>
        {cropMode ? (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">Drag on the image to choose the crop region, then Apply crop.</p>
        ) : null}
      </Panel>

      <Panel title="Text to image (upload optional)">
        <p className="text-xs text-[color:var(--text-secondary)]">
          Generate straight to <strong className="text-[color:var(--text-primary)]">Media Library</strong> — no file upload required. Use Match report / Preview with an article title, or paste any prompt.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          Provider
          <select
            value={t2iProvider}
            onChange={(e) => setT2iProvider(e.target.value as T2iProvider)}
            className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="higgsfield">Higgsfield (prompt-only — Seedream v4 default)</option>
            <option value="openai">OpenAI Images (gpt-image-1 default)</option>
            <option value="runway">Runway Gen-4 (polled to library)</option>
          </select>
        </label>
        {t2iProvider === "runway" ? (
          <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
            Runway ratio
            <select
              value={t2iRunwayRatio}
              onChange={(e) => setT2iRunwayRatio(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              {RUNWAY_T2I_RATIOS_NEWS_SHORTS.map((r) => (
                <option key={r} value={r}>
                  {formatRunwayT2iRatioLabel(r)}
                </option>
              ))}
            </select>
          </label>
        ) : t2iProvider === "openai" ? (
          <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
            OpenAI output size
            <select
              value={t2iOpenAiSize}
              onChange={(e) => setT2iOpenAiSize(e.target.value as typeof t2iOpenAiSize)}
              className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="1792x1024">1792 × 1024 — landscape</option>
              <option value="1024x1024">1024 × 1024 — square</option>
              <option value="1024x1792">1024 × 1792 — portrait</option>
            </select>
          </label>
        ) : (
          <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
            Higgsfield aspect ratio
            <select
              value={t2iHiggsAspect}
              onChange={(e) => setT2iHiggsAspect(e.target.value as AspectOption)}
              className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </label>
        )}
        <label className="mt-3 block text-[11px] font-semibold uppercase text-[color:var(--text-muted)]">
          Article title (for Football365 presets)
          <input
            value={presetTitle}
            onChange={(e) => setPresetTitle(e.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            placeholder="Required for Match report / Preview hero buttons"
          />
        </label>
        <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
          Full standfirst, body and tags are in <strong className="text-[color:var(--text-primary)]">AI-assisted edit</strong> below if you need richer presets.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase text-[color:var(--text-muted)]">
          Prompt
          <textarea
            value={t2iPrompt}
            onChange={(e) => setT2iPrompt(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-xs text-[color:var(--text-primary)]"
            placeholder="Describe the image to generate…"
          />
        </label>
        {t2iProvider === "runway" && t2iPrompt.length > RUNWAY_T2I_PROMPT_MAX ? (
          <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Prompt is {t2iPrompt.length} chars; Runway max is {RUNWAY_T2I_PROMPT_MAX}. Use presets with Runway selected, or switch to OpenAI / Higgsfield.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <R365Button type="button" variant="ghost" onClick={applyMatchReportT2i} disabled={t2iBusy}>
            Match report hero
          </R365Button>
          <R365Button type="button" variant="ghost" onClick={applyPreviewT2i} disabled={t2iBusy}>
            Preview hero
          </R365Button>
          <R365Button type="button" onClick={() => void runT2i()} disabled={t2iBusy || !t2iPrompt.trim()}>
            {t2iBusy ? "Generating…" : "Text to image"}
          </R365Button>
        </div>
        {t2iMessage ? <p className="mt-2 text-xs text-[#22c55e]">{t2iMessage}</p> : null}
        {t2iError ? <p className="mt-2 text-sm text-red-300">{t2iError}</p> : null}
        {t2iPreviewUrl ? (
          <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
            {t2iLibraryRel ? (
              <p className="break-all font-mono text-[11px] text-[color:var(--text-secondary)]">
                Library: <code>{t2iLibraryRel}</code>
              </p>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                t2iLibraryRel?.trim()
                  ? withAppPathPrefix(`/api/file?rel=${encodeURIComponent(t2iLibraryRel.trim())}`)
                  : t2iPreviewUrl
              }
              alt=""
              className="mt-2 max-h-96 max-w-full rounded-lg border border-[color:var(--border)] object-contain"
            />
            <R365Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() =>
                void navigator.clipboard.writeText(
                  t2iLibraryRel?.trim()
                    ? withAppPathPrefix(`/api/file?rel=${encodeURIComponent(t2iLibraryRel.trim())}`)
                    : t2iPreviewUrl,
                )
              }
            >
              Copy image URL
            </R365Button>
          </div>
        ) : null}
      </Panel>

      <details className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
        <summary className="cursor-pointer text-sm font-bold text-[color:var(--text-primary)]">Optional: AI-assisted edit (Higgsfield)</summary>
        <div className="mt-4 space-y-4 border-t border-[color:var(--border)] pt-4">
          <p className="text-xs text-[color:var(--text-secondary)]">
            Runs after manual edits if you want generative changes. Use <strong className="text-[color:var(--text-primary)]">Send canvas to AI</strong>{" "}
            to pass the current canvas as the source image (Admin keys required).
          </p>
          <div className="flex flex-wrap gap-2">
            <R365Button type="button" variant="ghost" disabled={!baseImage} onClick={() => void loadEditedIntoAi()}>
              Send canvas to AI
            </R365Button>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <label className="flex min-h-[160px] min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
              AI prompt
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={8}
                className="min-h-[160px] flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                placeholder="Describe the change you want Higgsfield to apply on top of your image…"
              />
              {presetMessage ? <p className="text-xs font-normal text-[#22c55e]">{presetMessage}</p> : null}
            </label>

            <div className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 lg:w-[min(100%,300px)]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">Football365 prompts</p>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                Article title
                <input
                  value={presetTitle}
                  onChange={(e) => setPresetTitle(e.target.value)}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-sm"
                />
              </label>
              <details className="text-[11px] text-[color:var(--text-secondary)]">
                <summary className="cursor-pointer font-semibold text-[color:var(--text-primary)]">Optional fields</summary>
                <div className="mt-2 space-y-2">
                  <textarea value={presetStandfirst} onChange={(e) => setPresetStandfirst(e.target.value)} rows={2} className="w-full rounded border px-2 py-1 text-sm" placeholder="Standfirst" />
                  <textarea value={presetBody} onChange={(e) => setPresetBody(e.target.value)} rows={2} className="w-full rounded border px-2 py-1 font-mono text-[12px]" placeholder="Body HTML" />
                  <input value={presetCategory} onChange={(e) => setPresetCategory(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Category" />
                  <input value={presetTagsCsv} onChange={(e) => setPresetTagsCsv(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" placeholder="Tags, comma-separated" />
                </div>
              </details>
              <R365Button type="button" variant="ghost" onClick={applyMatchReportImagePrompt} disabled={aiBusy}>
                Match report prompt
              </R365Button>
              <R365Button type="button" variant="ghost" onClick={applyPreviewImagePrompt} disabled={aiBusy}>
                Preview prompt
              </R365Button>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Or AI source file (if not using canvas / URL)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm"
              onChange={(e) => setAiFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--text-muted)]">
            Or HTTPS source URL for AI
            <input value={sourceImageUrl} onChange={(e) => setSourceImageUrl(e.target.value)} placeholder="https://…" className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 font-mono text-[13px]" />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
              Aspect
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectOption)} className="ml-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 text-sm">
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase text-[color:var(--text-muted)]">
              Model path override
              <input value={modelEndpoint} onChange={(e) => setModelEndpoint(e.target.value)} placeholder={DEFAULT_HIGGSFIELD_IMAGE_EDIT_ENDPOINT} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 font-mono text-[12px]" />
            </label>
          </div>
          <R365Button type="button" onClick={() => void runAiEdit()} disabled={aiBusy || !aiPrompt.trim()}>
            {aiBusy ? "Running AI…" : "Run AI edit"}
          </R365Button>
          {aiError ? <p className="text-sm text-red-300">{aiError}</p> : null}
          {resultImageUrl ? (
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
              <p className="text-xs text-[color:var(--text-muted)]">
                {resultLibraryRel ? (
                  <>
                    Library: <code className="text-[11px]">{resultLibraryRel}</code>
                  </>
                ) : null}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultImageUrl} alt="AI result" className="mt-2 max-h-[400px] max-w-full rounded-lg border border-[color:var(--border)]" />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
