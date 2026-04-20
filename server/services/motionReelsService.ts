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

export type OverlayTemplate = "gradient" | "clean";

function buildOverlayHtml(label: string, text: string, template: OverlayTemplate = "gradient"): string {
  const fileName = template === "clean" ? "reel-overlay-clean.html" : "reel-overlay-gradient.html";
  const filePath = path.join(TEMPLATE_DIR, fileName);
  let html = readFileSync(filePath, "utf-8");

  const css = loadCSS();
  html = html.replace(/<link[^>]*design-system\.css[^>]*>/, `<style>${css}</style>`);

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

export interface MotionReelInput {
  imageUrl: string;
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
}

export async function generateMotionReel({
  imageUrl,
  aidaScript,
  musicUrl,
  musicVolume = 30,
  overlayTemplate = "gradient",
  showLabel = false,
}: MotionReelInput): Promise<string> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "motion-reel-"));
  const bgPath = path.join(tmp, "bg.jpg");
  const t1Path = path.join(tmp, "t1.png");
  const t2Path = path.join(tmp, "t2.png");
  const t3Path = path.join(tmp, "t3.png");
  const t4Path = path.join(tmp, "t4.png");
  const mPath = path.join(tmp, "music.mp3");
  const oPath = path.join(tmp, "output.mp4");

  try {
    console.log("[MotionReel] Step 1: Rendering text overlay PNGs with Puppeteer");
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

    console.log("[MotionReel] Step 2: Downloading assets");
    const downloads: Promise<void>[] = [
      downloadToFile(imageUrl, bgPath),
    ];
    if (musicUrl) {
      downloads.push(downloadToFile(musicUrl, mPath));
    }
    downloads.push(
      fs.writeFile(t1Path, overlayBuffers[0]),
      fs.writeFile(t2Path, overlayBuffers[1]),
      fs.writeFile(t3Path, overlayBuffers[2]),
      fs.writeFile(t4Path, overlayBuffers[3]),
    );
    await Promise.all(downloads);

    console.log("[MotionReel] Step 3: FFmpeg compositing (Ken Burns + text overlays + music)");
    const volume = Math.max(0, Math.min(100, musicVolume)) / 100;

    const zoomIncrement = (0.15 / TOTAL_FRAMES).toFixed(8);

    const filterComplex = [
      `[0:v]scale=${Math.ceil(WIDTH * 1.2)}:${Math.ceil(HEIGHT * 1.2)},zoompan=z='min(1+${zoomIncrement}*on\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${TOTAL_FRAMES}:s=${WIDTH}x${HEIGHT}:fps=${FPS}[bg]`,
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
      filterComplex.push(
        `[5:a]volume=${volume.toFixed(2)},afade=t=out:st=18:d=2[a]`
      );
      args.push("-filter_complex", filterComplex.join(";"));
      args.push("-map", "[v]", "-map", "[a]");
      args.push("-c:a", "aac", "-b:a", "192k");
    } else {
      args.push("-filter_complex", filterComplex.join(";"));
      args.push("-map", "[v]");
    }

    args.push(
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-t", String(DURATION),
      "-shortest",
      oPath
    );

    await runFfmpeg(args);

    console.log("[MotionReel] Step 4: Uploading to Supabase Storage");
    const buffer = await fs.readFile(oPath);
    console.log(`[MotionReel] Output size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
    const filename = `motion_reel_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
    const publicUrl = await uploadBufferToStorage(buffer, filename, "video/mp4", "videos");
    console.log("[MotionReel] Upload complete:", publicUrl);

    return publicUrl;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
