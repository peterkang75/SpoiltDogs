import { spawn } from "child_process";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import os from "os";
import { renderHtmlToImage } from "./templateRenderer";
import { uploadBufferToStorage } from "./storageService";

const TEMPLATE_DIR = path.join(process.cwd(), "server", "templates");
const DURATION = 20;
const FPS = 25;
const TOTAL_FRAMES = DURATION * FPS;
const WIDTH = 1080;
const HEIGHT = 1920;

function loadCSS(): string {
  return readFileSync(path.join(TEMPLATE_DIR, "design-system.css"), "utf-8");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type OverlayTemplate = "gradient" | "clean" | "canva-1" | "canva-2" | "canva-3";

const TEMPLATE_FILES: Record<OverlayTemplate, string> = {
  gradient: "reel-overlay-gradient.html",
  clean: "reel-overlay-clean.html",
  "canva-1": "reel-overlay-canva-1.html",
  "canva-2": "reel-overlay-canva-2.html",
  "canva-3": "reel-overlay-canva-3.html",
};

const NEEDS_DESIGN_SYSTEM = new Set<OverlayTemplate>(["gradient", "clean"]);

function buildOverlayHtml(label: string, text: string, template: OverlayTemplate = "gradient"): string {
  const fileName = TEMPLATE_FILES[template] || TEMPLATE_FILES.gradient;
  const filePath = path.join(TEMPLATE_DIR, fileName);
  let html = readFileSync(filePath, "utf-8");

  if (NEEDS_DESIGN_SYSTEM.has(template)) {
    const css = loadCSS();
    html = html.replace(/<link[^>]*design-system\.css[^>]*>/, `<style>${css}</style>`);
  }

  html = html.replace(/\{\{label\}\}/g, escapeHtml(label));
  html = html.replace(/\{\{text\}\}/g, escapeHtml(text));

  return html;
}

async function downloadToFile(url: string, filePath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(filePath, buf);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}

// ── Motion Effects ──────────────────────────────────────────────────────────

export type MotionEffect = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "tilt-up";

export const MOTION_EFFECTS: Record<MotionEffect, { label: string; labelKo: string }> = {
  "zoom-in": { label: "Ken Burns Zoom In", labelKo: "줌 인" },
  "zoom-out": { label: "Ken Burns Zoom Out", labelKo: "줌 아웃" },
  "pan-left": { label: "Pan Right → Left", labelKo: "좌로 이동" },
  "pan-right": { label: "Pan Left → Right", labelKo: "우로 이동" },
  "tilt-up": { label: "Tilt Bottom → Top", labelKo: "위로 이동" },
};

function buildMotionFilter(effect: MotionEffect): string {
  const zoomIncrement = (0.15 / TOTAL_FRAMES).toFixed(8);

  switch (effect) {
    case "zoom-in": {
      const sw = Math.ceil(WIDTH * 1.2);
      const sh = Math.ceil(HEIGHT * 1.2);
      return `[0:v]scale=${sw}:${sh},zoompan=z='min(1+${zoomIncrement}*on\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${TOTAL_FRAMES}:s=${WIDTH}x${HEIGHT}:fps=${FPS}[bg]`;
    }

    case "zoom-out": {
      const sw = Math.ceil(WIDTH * 1.2);
      const sh = Math.ceil(HEIGHT * 1.2);
      return `[0:v]scale=${sw}:${sh},zoompan=z='max(1.15-${zoomIncrement}*on\\,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${TOTAL_FRAMES}:s=${WIDTH}x${HEIGHT}:fps=${FPS}[bg]`;
    }

    case "pan-right": {
      const sw = Math.ceil(WIDTH * 1.4);
      const sh = Math.ceil(HEIGHT * 1.4);
      const panRange = sw - WIDTH;
      return `[0:v]scale=${sw}:${sh},crop=${WIDTH}:${HEIGHT}:x='${panRange}*t/${DURATION}':y='(ih-${HEIGHT})/2',fps=${FPS}[bg]`;
    }

    case "pan-left": {
      const sw = Math.ceil(WIDTH * 1.4);
      const sh = Math.ceil(HEIGHT * 1.4);
      const panRange = sw - WIDTH;
      return `[0:v]scale=${sw}:${sh},crop=${WIDTH}:${HEIGHT}:x='${panRange}-${panRange}*t/${DURATION}':y='(ih-${HEIGHT})/2',fps=${FPS}[bg]`;
    }

    case "tilt-up": {
      const sw = Math.ceil(WIDTH * 1.4);
      const sh = Math.ceil(HEIGHT * 1.4);
      const tiltRange = sh - HEIGHT;
      return `[0:v]scale=${sw}:${sh},crop=${WIDTH}:${HEIGHT}:x='(iw-${WIDTH})/2':y='${tiltRange}-${tiltRange}*t/${DURATION}',fps=${FPS}[bg]`;
    }

    default:
      return buildMotionFilter("zoom-in");
  }
}

// ── AIDA narrative arc — each stage maps to a camera motion ──────────────────
const AIDA_MOTION_ARC: [MotionEffect, MotionEffect, MotionEffect, MotionEffect] = [
  "zoom-in",    // Attention: contemplative, focused
  "pan-right",  // Interest: journey, discovery
  "zoom-out",   // Desire: reveal the full picture
  "tilt-up",    // Action: aspirational, uplifting
];

function buildSegmentMotionFilter(
  inputIdx: number,
  effect: MotionEffect,
  segDuration: number,
  fps: number,
  outputLabel: string,
): string {
  const frames = Math.ceil(segDuration * fps);
  const zoomIncrement = (0.15 / frames).toFixed(8);

  switch (effect) {
    case "zoom-in": {
      const sw = Math.ceil(WIDTH * 1.2);
      const sh = Math.ceil(HEIGHT * 1.2);
      return `[${inputIdx}:v]scale=${sw}:${sh},zoompan=z='min(1+${zoomIncrement}*on\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${fps}[${outputLabel}]`;
    }
    case "zoom-out": {
      const sw = Math.ceil(WIDTH * 1.2);
      const sh = Math.ceil(HEIGHT * 1.2);
      return `[${inputIdx}:v]scale=${sw}:${sh},zoompan=z='max(1.15-${zoomIncrement}*on\\,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${fps}[${outputLabel}]`;
    }
    case "pan-right": {
      const sw = Math.ceil(WIDTH * 1.4);
      const sh = Math.ceil(HEIGHT * 1.4);
      const panRange = sw - WIDTH;
      return `[${inputIdx}:v]scale=${sw}:${sh},crop=${WIDTH}:${HEIGHT}:x='${panRange}*t/${segDuration}':y='(ih-${HEIGHT})/2',fps=${fps}[${outputLabel}]`;
    }
    case "pan-left": {
      const sw = Math.ceil(WIDTH * 1.4);
      const sh = Math.ceil(HEIGHT * 1.4);
      const panRange = sw - WIDTH;
      return `[${inputIdx}:v]scale=${sw}:${sh},crop=${WIDTH}:${HEIGHT}:x='${panRange}-${panRange}*t/${segDuration}':y='(ih-${HEIGHT})/2',fps=${fps}[${outputLabel}]`;
    }
    case "tilt-up": {
      const sw = Math.ceil(WIDTH * 1.4);
      const sh = Math.ceil(HEIGHT * 1.4);
      const tiltRange = sh - HEIGHT;
      return `[${inputIdx}:v]scale=${sw}:${sh},crop=${WIDTH}:${HEIGHT}:x='(iw-${WIDTH})/2':y='${tiltRange}-${tiltRange}*t/${segDuration}',fps=${fps}[${outputLabel}]`;
    }
    default:
      return buildSegmentMotionFilter(inputIdx, "zoom-in", segDuration, fps, outputLabel);
  }
}

// ── Main Pipeline ───────────────────────────────────────────────────────────

export interface MotionReelInput {
  imageUrl: string;
  imageUrls?: string[];
  aidaScript: {
    attention: string;
    interest: string;
    desire: string;
    action: string;
  };
  musicUrl?: string;
  musicVolume?: number;
  overlayTemplate?: OverlayTemplate;
  showLabel?: boolean;
  motionEffect?: MotionEffect;
}

export async function generateMotionReel(input: MotionReelInput): Promise<string> {
  const {
    imageUrl,
    imageUrls,
    aidaScript,
    musicUrl,
    musicVolume = 30,
    overlayTemplate = "gradient",
    showLabel = false,
    motionEffect = "zoom-in",
  } = input;

  const images = imageUrls && imageUrls.length === 4 ? imageUrls as [string, string, string, string] : null;

  if (images) {
    return generateMultiImageReel({ images, aidaScript, musicUrl, musicVolume, overlayTemplate, showLabel });
  }
  return generateSingleImageReel({ imageUrl, aidaScript, musicUrl, musicVolume, overlayTemplate, showLabel, motionEffect });
}

// ── Single-Image Reel (original MVP pipeline) ──────────────────────────────

async function generateSingleImageReel({
  imageUrl,
  aidaScript,
  musicUrl,
  musicVolume,
  overlayTemplate,
  showLabel,
  motionEffect,
}: {
  imageUrl: string;
  aidaScript: MotionReelInput["aidaScript"];
  musicUrl?: string;
  musicVolume: number;
  overlayTemplate: OverlayTemplate;
  showLabel: boolean;
  motionEffect: MotionEffect;
}): Promise<string> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "motion-reel-"));
  const bgPath = path.join(tmp, "bg.jpg");
  const t1Path = path.join(tmp, "t1.png");
  const t2Path = path.join(tmp, "t2.png");
  const t3Path = path.join(tmp, "t3.png");
  const t4Path = path.join(tmp, "t4.png");
  const mPath = path.join(tmp, "music.mp3");
  const oPath = path.join(tmp, "output.mp4");

  try {
    console.log(`[MotionReel] Single-image mode (template=${overlayTemplate}, effect=${motionEffect})`);
    const overlays = [
      { label: showLabel ? "Attention" : "", text: aidaScript.attention },
      { label: showLabel ? "Interest" : "", text: aidaScript.interest },
      { label: showLabel ? "Desire" : "", text: aidaScript.desire },
      { label: "", text: aidaScript.action },
    ];

    const overlayBuffers = await Promise.all(
      overlays.map((o) => {
        const html = buildOverlayHtml(o.label, o.text, overlayTemplate);
        return renderHtmlToImage(html, WIDTH, HEIGHT, { omitBackground: true, deviceScaleFactor: 1 });
      })
    );

    const downloads: Promise<void>[] = [downloadToFile(imageUrl, bgPath)];
    if (musicUrl) downloads.push(downloadToFile(musicUrl, mPath));
    downloads.push(
      fs.writeFile(t1Path, overlayBuffers[0]),
      fs.writeFile(t2Path, overlayBuffers[1]),
      fs.writeFile(t3Path, overlayBuffers[2]),
      fs.writeFile(t4Path, overlayBuffers[3]),
    );
    await Promise.all(downloads);

    const volume = Math.max(0, Math.min(100, musicVolume)) / 100;
    const motionFilter = buildMotionFilter(motionEffect);

    const filterComplex = [
      motionFilter,
      `[1:v]format=rgba,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=4.5:d=0.5:alpha=1[t1]`,
      `[2:v]format=rgba,fade=t=in:st=5:d=0.5:alpha=1,fade=t=out:st=9.5:d=0.5:alpha=1[t2]`,
      `[3:v]format=rgba,fade=t=in:st=10:d=0.5:alpha=1,fade=t=out:st=14.5:d=0.5:alpha=1[t3]`,
      `[4:v]format=rgba,fade=t=in:st=15:d=0.5:alpha=1,fade=t=out:st=19.5:d=0.5:alpha=1[t4]`,
      `[bg][t1]overlay=0:0[o1]`,
      `[o1][t2]overlay=0:0[o2]`,
      `[o2][t3]overlay=0:0[o3]`,
      `[o3][t4]overlay=0:0[v]`,
    ];

    const args: string[] = [
      "-y",
      "-loop", "1", "-t", String(DURATION), "-i", bgPath,
      "-loop", "1", "-i", t1Path,
      "-loop", "1", "-i", t2Path,
      "-loop", "1", "-i", t3Path,
      "-loop", "1", "-i", t4Path,
    ];

    if (musicUrl) {
      args.push("-i", mPath);
      filterComplex.push(`[5:a]volume=${volume.toFixed(2)},afade=t=out:st=18:d=2[a]`);
      args.push("-filter_complex", filterComplex.join(";"));
      args.push("-map", "[v]", "-map", "[a]");
      args.push("-c:a", "aac", "-b:a", "192k");
    } else {
      args.push("-filter_complex", filterComplex.join(";"));
      args.push("-map", "[v]");
    }

    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-t", String(DURATION), "-shortest", oPath);
    await runFfmpeg(args);

    return await uploadResult(oPath);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Multi-Image Reel (4 images × 4 motions + xfade transitions) ────────────

const SEG_DURATION = 5.5;
const XFADE_DURATION = 0.5;

async function generateMultiImageReel({
  images,
  aidaScript,
  musicUrl,
  musicVolume,
  overlayTemplate,
  showLabel,
}: {
  images: [string, string, string, string];
  aidaScript: MotionReelInput["aidaScript"];
  musicUrl?: string;
  musicVolume: number;
  overlayTemplate: OverlayTemplate;
  showLabel: boolean;
}): Promise<string> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "motion-multi-"));
  const mPath = path.join(tmp, "music.mp3");
  const oPath = path.join(tmp, "output.mp4");

  try {
    console.log(`[MotionReel] Multi-image mode (4 images, template=${overlayTemplate})`);

    const overlays = [
      { label: showLabel ? "Attention" : "", text: aidaScript.attention },
      { label: showLabel ? "Interest" : "", text: aidaScript.interest },
      { label: showLabel ? "Desire" : "", text: aidaScript.desire },
      { label: "", text: aidaScript.action },
    ];

    const overlayBuffers = await Promise.all(
      overlays.map((o) => {
        const html = buildOverlayHtml(o.label, o.text, overlayTemplate);
        return renderHtmlToImage(html, WIDTH, HEIGHT, { omitBackground: true, deviceScaleFactor: 1 });
      })
    );

    const imgPaths = images.map((_, i) => path.join(tmp, `bg${i}.jpg`));
    const txtPaths = overlayBuffers.map((_, i) => path.join(tmp, `t${i}.png`));

    const downloads: Promise<void>[] = [
      ...images.map((url, i) => downloadToFile(url, imgPaths[i])),
      ...overlayBuffers.map((buf, i) => fs.writeFile(txtPaths[i], buf)),
    ];
    if (musicUrl) downloads.push(downloadToFile(musicUrl, mPath));
    await Promise.all(downloads);

    // 1-pass FFmpeg: 4 images with individual motion → xfade → text overlays
    const segFps = FPS;
    const volume = Math.max(0, Math.min(100, musicVolume)) / 100;

    const filterLines: string[] = [];

    // Motion filters for each segment (5.5s each)
    for (let i = 0; i < 4; i++) {
      filterLines.push(
        buildSegmentMotionFilter(i, AIDA_MOTION_ARC[i], SEG_DURATION, segFps, `s${i}`)
      );
    }

    // xfade transitions between segments
    // offset = segment_end - xfade_duration
    // seg0: 0–5.5s, seg1: 5.0–10.5s, seg2: 10.0–15.5s, seg3: 15.0–20.5s → trim to 20s
    filterLines.push(
      `[s0][s1]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${SEG_DURATION - XFADE_DURATION}[x1]`
    );
    filterLines.push(
      `[x1][s2]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${2 * SEG_DURATION - 2 * XFADE_DURATION}[x2]`
    );
    filterLines.push(
      `[x2][s3]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${3 * SEG_DURATION - 3 * XFADE_DURATION}[bg]`
    );

    // Text overlay fade timings aligned to actual timeline
    // seg0: 0–5.0s, seg1: 5.0–10.0s, seg2: 10.0–15.0s, seg3: 15.0–20.0s
    const textInputBase = 4; // inputs 0–3 are images, 4–7 are text PNGs
    for (let i = 0; i < 4; i++) {
      const st = i * 5;
      const fadeOut = st + 4.5;
      filterLines.push(
        `[${textInputBase + i}:v]format=rgba,fade=t=in:st=${st}:d=0.5:alpha=1,fade=t=out:st=${fadeOut}:d=0.5:alpha=1[t${i}]`
      );
    }

    // Overlay text on composited background
    filterLines.push(`[bg][t0]overlay=0:0[o0]`);
    filterLines.push(`[o0][t1]overlay=0:0[o1]`);
    filterLines.push(`[o1][t2]overlay=0:0[o2]`);
    filterLines.push(`[o2][t3]overlay=0:0[v]`);

    // Build args: 4 image inputs + 4 text inputs + optional music
    const args: string[] = ["-y"];
    for (let i = 0; i < 4; i++) {
      args.push("-loop", "1", "-t", String(SEG_DURATION), "-i", imgPaths[i]);
    }
    for (let i = 0; i < 4; i++) {
      args.push("-loop", "1", "-i", txtPaths[i]);
    }

    if (musicUrl) {
      args.push("-i", mPath);
      filterLines.push(`[8:a]volume=${volume.toFixed(2)},afade=t=out:st=18:d=2[a]`);
      args.push("-filter_complex", filterLines.join(";"));
      args.push("-map", "[v]", "-map", "[a]");
      args.push("-c:a", "aac", "-b:a", "192k");
    } else {
      args.push("-filter_complex", filterLines.join(";"));
      args.push("-map", "[v]");
    }

    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-t", String(DURATION), "-shortest", oPath);
    await runFfmpeg(args);

    return await uploadResult(oPath);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Upload helper ────────────────────────────────────────────────────────────
async function uploadResult(oPath: string): Promise<string> {
  console.log("[MotionReel] Uploading to Supabase Storage");
  const buffer = await fs.readFile(oPath);
  console.log(`[MotionReel] Output size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
  const filename = `motion_reel_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
  const publicUrl = await uploadBufferToStorage(buffer, filename, "video/mp4", "videos");
  console.log("[MotionReel] Upload complete:", publicUrl);
  return publicUrl;
}
