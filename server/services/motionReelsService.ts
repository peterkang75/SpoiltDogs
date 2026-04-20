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
const HALF_W = 540;
const HALF_H = 960;

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

function runFfmpeg(args: string[], timeoutMs = 300_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out after ${timeoutMs / 1000}s. stderr: ${stderr.slice(-500)}`));
    }, timeoutMs);
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("error", (e) => { clearTimeout(timer); reject(e); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
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
      const sw = Math.ceil(HALF_W * 1.2);
      const sh = Math.ceil(HALF_H * 1.2);
      return `[0:v]scale=${sw}:${sh},zoompan=z='min(1+${zoomIncrement}*on\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${TOTAL_FRAMES}:s=${HALF_W}x${HALF_H}:fps=${FPS},scale=${WIDTH}:${HEIGHT}[bg]`;
    }

    case "zoom-out": {
      const sw = Math.ceil(HALF_W * 1.2);
      const sh = Math.ceil(HALF_H * 1.2);
      return `[0:v]scale=${sw}:${sh},zoompan=z='max(1.15-${zoomIncrement}*on\\,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${TOTAL_FRAMES}:s=${HALF_W}x${HALF_H}:fps=${FPS},scale=${WIDTH}:${HEIGHT}[bg]`;
    }

    case "pan-right": {
      const sw = Math.ceil(HALF_W * 1.4);
      const sh = Math.ceil(HALF_H * 1.4);
      const panRange = sw - HALF_W;
      return `[0:v]scale=${sw}:${sh},crop=${HALF_W}:${HALF_H}:x='${panRange}*t/${DURATION}':y='(ih-${HALF_H})/2',fps=${FPS},scale=${WIDTH}:${HEIGHT}[bg]`;
    }

    case "pan-left": {
      const sw = Math.ceil(HALF_W * 1.4);
      const sh = Math.ceil(HALF_H * 1.4);
      const panRange = sw - HALF_W;
      return `[0:v]scale=${sw}:${sh},crop=${HALF_W}:${HALF_H}:x='${panRange}-${panRange}*t/${DURATION}':y='(ih-${HALF_H})/2',fps=${FPS},scale=${WIDTH}:${HEIGHT}[bg]`;
    }

    case "tilt-up": {
      const sw = Math.ceil(HALF_W * 1.4);
      const sh = Math.ceil(HALF_H * 1.4);
      const tiltRange = sh - HALF_H;
      return `[0:v]scale=${sw}:${sh},crop=${HALF_W}:${HALF_H}:x='(iw-${HALF_W})/2':y='${tiltRange}-${tiltRange}*t/${DURATION}',fps=${FPS},scale=${WIDTH}:${HEIGHT}[bg]`;
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
      const sw = Math.ceil(HALF_W * 1.2);
      const sh = Math.ceil(HALF_H * 1.2);
      return `[${inputIdx}:v]scale=${sw}:${sh},zoompan=z='min(1+${zoomIncrement}*on\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${HALF_W}x${HALF_H}:fps=${fps},scale=${WIDTH}:${HEIGHT}[${outputLabel}]`;
    }
    case "zoom-out": {
      const sw = Math.ceil(HALF_W * 1.2);
      const sh = Math.ceil(HALF_H * 1.2);
      return `[${inputIdx}:v]scale=${sw}:${sh},zoompan=z='max(1.15-${zoomIncrement}*on\\,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${HALF_W}x${HALF_H}:fps=${fps},scale=${WIDTH}:${HEIGHT}[${outputLabel}]`;
    }
    case "pan-right": {
      const sw = Math.ceil(HALF_W * 1.4);
      const sh = Math.ceil(HALF_H * 1.4);
      const panRange = sw - HALF_W;
      return `[${inputIdx}:v]scale=${sw}:${sh},crop=${HALF_W}:${HALF_H}:x='${panRange}*t/${segDuration}':y='(ih-${HALF_H})/2',fps=${fps},scale=${WIDTH}:${HEIGHT}[${outputLabel}]`;
    }
    case "pan-left": {
      const sw = Math.ceil(HALF_W * 1.4);
      const sh = Math.ceil(HALF_H * 1.4);
      const panRange = sw - HALF_W;
      return `[${inputIdx}:v]scale=${sw}:${sh},crop=${HALF_W}:${HALF_H}:x='${panRange}-${panRange}*t/${segDuration}':y='(ih-${HALF_H})/2',fps=${fps},scale=${WIDTH}:${HEIGHT}[${outputLabel}]`;
    }
    case "tilt-up": {
      const sw = Math.ceil(HALF_W * 1.4);
      const sh = Math.ceil(HALF_H * 1.4);
      const tiltRange = sh - HALF_H;
      return `[${inputIdx}:v]scale=${sw}:${sh},crop=${HALF_W}:${HALF_H}:x='(iw-${HALF_W})/2':y='${tiltRange}-${tiltRange}*t/${segDuration}',fps=${fps},scale=${WIDTH}:${HEIGHT}[${outputLabel}]`;
    }
    default:
      return buildSegmentMotionFilter(inputIdx, "zoom-in", segDuration, fps, outputLabel);
  }
}

// ── ffprobe: get video duration ─────────────────────────────────────────────

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_streams", filePath,
    ], { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.on("close", () => {
      try {
        const data = JSON.parse(stdout);
        const s = (data.streams as any[]).find((s) => s.codec_type === "video") ?? data.streams[0];
        const dur = parseFloat(s?.duration ?? "0");
        resolve(isNaN(dur) || dur <= 0 ? 20 : dur);
      } catch {
        resolve(20);
      }
    });
    proc.on("error", () => resolve(20));
  });
}

// iPhone 세로 영상 회전 정규화: -vf(단일입력)는 auto-rotate 적용됨을 활용해서
// 픽셀을 실제로 회전시킨 중간 파일 생성. 회전 메타데이터 형식(tags.rotate, display
// matrix side_data)이나 부호 규칙 상관없이 ffmpeg 내장 로직이 올바르게 처리.
async function normalizeVideoOrientation(inputPath: string, outputPath: string): Promise<void> {
  await runFfmpeg([
    "-y",
    "-i", inputPath,
    "-vf", "null", // 단일입력 -vf는 auto-rotate 트리거
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
    "-c:a", "aac", "-b:a", "128k",
    "-metadata:s:v:0", "rotate=", // 구식 rotate 태그 제거
    "-movflags", "+faststart",
    outputPath,
  ]);
}

// ── Main Pipeline ───────────────────────────────────────────────────────────

export interface MotionReelInput {
  imageUrl?: string;         // AI-generated or attached image (for Ken Burns)
  videoUrl?: string;         // Attached real video (skip Ken Burns, overlay text on video)
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
    videoUrl,
    imageUrls,
    aidaScript,
    musicUrl,
    musicVolume = 30,
    overlayTemplate = "gradient",
    showLabel = false,
    motionEffect = "zoom-in",
  } = input;

  // 실제 영상 첨부 → 텍스트+음악 오버레이만 (Ken Burns 없음)
  if (videoUrl) {
    return generateVideoOverlayReel({ videoUrl, aidaScript, musicUrl, musicVolume, overlayTemplate, showLabel });
  }

  const images = imageUrls && imageUrls.length === 4 ? imageUrls as [string, string, string, string] : null;

  if (images) {
    return generateMultiImageReel({ images, aidaScript, musicUrl, musicVolume, overlayTemplate, showLabel });
  }
  return generateSingleImageReel({ imageUrl: imageUrl!, aidaScript, musicUrl, musicVolume, overlayTemplate, showLabel, motionEffect });
}

// ── Video Overlay Reel (실제 영상 위에 AIDA 텍스트 + 음악) ─────────────────

async function generateVideoOverlayReel({
  videoUrl,
  aidaScript,
  musicUrl,
  musicVolume,
  overlayTemplate,
  showLabel,
}: {
  videoUrl: string;
  aidaScript: MotionReelInput["aidaScript"];
  musicUrl?: string;
  musicVolume: number;
  overlayTemplate: OverlayTemplate;
  showLabel: boolean;
}): Promise<string> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "motion-vid-"));
  const rawBgPath = path.join(tmp, "bg_raw.mp4");
  const bgPath = path.join(tmp, "bg.mp4");
  const t1Path = path.join(tmp, "t1.png");
  const t2Path = path.join(tmp, "t2.png");
  const t3Path = path.join(tmp, "t3.png");
  const t4Path = path.join(tmp, "t4.png");
  const mPath = path.join(tmp, "music.mp3");
  const oPath = path.join(tmp, "output.mp4");

  try {
    console.log(`[MotionReel] Video overlay mode (template=${overlayTemplate})`);

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

    const downloads: Promise<void>[] = [downloadToFile(videoUrl, rawBgPath)];
    if (musicUrl) downloads.push(downloadToFile(musicUrl, mPath));
    downloads.push(
      fs.writeFile(t1Path, overlayBuffers[0]),
      fs.writeFile(t2Path, overlayBuffers[1]),
      fs.writeFile(t3Path, overlayBuffers[2]),
      fs.writeFile(t4Path, overlayBuffers[3]),
    );
    await Promise.all(downloads);

    // iPhone 세로 영상 회전 정규화 (filter_complex는 auto-rotate 적용 안 됨)
    // 이 pre-process는 -vf 단일입력으로 auto-rotate 픽셀을 실제로 적용시킴
    console.log(`[MotionReel] Normalizing video orientation...`);
    await normalizeVideoOrientation(rawBgPath, bgPath);

    // 실제 영상 길이 감지 → AIDA 타이밍 계산 (최대 20초로 제한)
    const rawDuration = await getVideoDuration(bgPath);
    const dur = rawDuration;
    const s1 = dur / 4;
    const s2 = dur / 2;
    const s3 = (dur * 3) / 4;
    console.log(`[MotionReel] Video duration: ${rawDuration.toFixed(1)}s → using ${dur.toFixed(1)}s. Segments: 0/${s1.toFixed(1)}/${s2.toFixed(1)}/${s3.toFixed(1)}`);

    const volume = Math.max(0, Math.min(100, musicVolume)) / 100;
    const fadeDur = (dur - 2) > 0 ? dur - 2 : dur * 0.9;

    const filterComplex: string[] = [
      // 영상 크기를 1080×1920으로 맞춤 (회전은 pre-process에서 이미 처리됨)
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg]`,
      `[1:v]format=rgba,fade=t=in:st=0:d=0.5:alpha=1,fade=t=out:st=${(s1 - 0.5).toFixed(2)}:d=0.5:alpha=1[t1]`,
      `[2:v]format=rgba,fade=t=in:st=${s1.toFixed(2)}:d=0.5:alpha=1,fade=t=out:st=${(s2 - 0.5).toFixed(2)}:d=0.5:alpha=1[t2]`,
      `[3:v]format=rgba,fade=t=in:st=${s2.toFixed(2)}:d=0.5:alpha=1,fade=t=out:st=${(s3 - 0.5).toFixed(2)}:d=0.5:alpha=1[t3]`,
      `[4:v]format=rgba,fade=t=in:st=${s3.toFixed(2)}:d=0.5:alpha=1,fade=t=out:st=${(dur - 0.5).toFixed(2)}:d=0.5:alpha=1[t4]`,
      `[bg][t1]overlay=0:0[o1]`,
      `[o1][t2]overlay=0:0[o2]`,
      `[o2][t3]overlay=0:0[o3]`,
      `[o3][t4]overlay=0:0[v]`,
    ];

    const musicIdx = 5;
    const args: string[] = [
      "-y",
      "-i", bgPath,
      "-loop", "1", "-i", t1Path,
      "-loop", "1", "-i", t2Path,
      "-loop", "1", "-i", t3Path,
      "-loop", "1", "-i", t4Path,
    ];

    if (musicUrl) {
      args.push("-i", mPath);
      filterComplex.push(`[${musicIdx}:a]volume=${volume.toFixed(2)},afade=t=out:st=${fadeDur.toFixed(2)}:d=2[a]`);
      // 원본 영상 오디오가 있으면 믹스
      filterComplex[filterComplex.length - 1]; // [a] label already set
      args.push("-filter_complex", filterComplex.join(";"));
      args.push("-map", "[v]", "-map", "[a]");
      args.push("-c:a", "aac", "-b:a", "192k");
    } else {
      args.push("-filter_complex", filterComplex.join(";"));
      args.push("-map", "[v]");
      // 원본 오디오 보존
      args.push("-map", "0:a?");
      args.push("-c:a", "aac", "-b:a", "192k");
    }

    args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-t", dur.toFixed(2), oPath);
    await runFfmpeg(args);

    return await uploadResult(oPath);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
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
      "-loop", "1", "-i", bgPath,
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
    console.log(`[MotionReel] Multi-image 2-pass mode (4 images, template=${overlayTemplate})`);

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
    const segPaths = [0, 1, 2, 3].map((i) => path.join(tmp, `seg${i}.mp4`));

    const downloads: Promise<void>[] = [
      ...images.map((url, i) => downloadToFile(url, imgPaths[i])),
      ...overlayBuffers.map((buf, i) => fs.writeFile(txtPaths[i], buf)),
    ];
    if (musicUrl) downloads.push(downloadToFile(musicUrl, mPath));
    await Promise.all(downloads);

    // ── Pass 1: Render 4 individual segments (motion + text overlay) ──
    console.log("[MotionReel] Pass 1: Rendering 4 segments sequentially");
    for (let i = 0; i < 4; i++) {
      console.log(`[MotionReel] Segment ${i + 1}/4 (${AIDA_MOTION_ARC[i]})`);
      const motionFilter = buildSegmentMotionFilter(0, AIDA_MOTION_ARC[i], SEG_DURATION, FPS, "bg");
      const segFilter = [
        motionFilter,
        `[1:v]format=rgba[txt]`,
        `[bg][txt]overlay=0:0[v]`,
      ].join(";");

      const segFrames = Math.ceil(SEG_DURATION * FPS);
      await runFfmpeg([
        "-y",
        "-loop", "1", "-i", imgPaths[i],
        "-loop", "1", "-i", txtPaths[i],
        "-filter_complex", segFilter,
        "-map", "[v]",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-frames:v", String(segFrames),
        segPaths[i],
      ], 120_000);
    }

    // ── Pass 2: Concat segments with xfade + add music ──
    console.log("[MotionReel] Pass 2: Concatenating with xfade transitions");
    const volume = Math.max(0, Math.min(100, musicVolume)) / 100;

    const concatFilter = [
      `[0:v][1:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${SEG_DURATION - XFADE_DURATION}[x1]`,
      `[x1][2:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${2 * SEG_DURATION - 2 * XFADE_DURATION}[x2]`,
      `[x2][3:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${3 * SEG_DURATION - 3 * XFADE_DURATION}[v]`,
    ];

    const args: string[] = [
      "-y",
      "-i", segPaths[0], "-i", segPaths[1], "-i", segPaths[2], "-i", segPaths[3],
    ];

    if (musicUrl) {
      args.push("-i", mPath);
      concatFilter.push(`[4:a]volume=${volume.toFixed(2)},afade=t=out:st=18:d=2[a]`);
      args.push("-filter_complex", concatFilter.join(";"));
      args.push("-map", "[v]", "-map", "[a]");
      args.push("-c:a", "aac", "-b:a", "192k");
    } else {
      args.push("-filter_complex", concatFilter.join(";"));
      args.push("-map", "[v]");
    }

    args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", "-t", String(DURATION), oPath);
    await runFfmpeg(args, 120_000);

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
