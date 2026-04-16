import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { uploadBufferToStorage } from "./storageService";

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
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-600)}`));
    });
  });
}

export async function mixVideoWithMusic({
  videoUrl,
  musicUrl,
  musicVolume,
}: {
  videoUrl: string;
  musicUrl: string;
  musicVolume: number;
}): Promise<string> {
  const volume = Math.max(0, Math.min(100, musicVolume)) / 100;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mix-"));
  const vPath = path.join(tmp, "video.mp4");
  const mPath = path.join(tmp, "music.mp3");
  const oPath = path.join(tmp, "output.mp4");

  try {
    console.log(`[MusicMix] Downloading video: ${videoUrl.substring(0, 80)}`);
    console.log(`[MusicMix] Downloading music: ${musicUrl.substring(0, 80)}`);
    await Promise.all([
      downloadToFile(videoUrl, vPath),
      downloadToFile(musicUrl, mPath),
    ]);
    console.log(`[MusicMix] Downloads complete, running ffmpeg with volume=${volume.toFixed(2)}`);

    await runFfmpeg([
      "-y",
      "-i", vPath,
      "-i", mPath,
      "-filter:a", `volume=${volume.toFixed(2)}`,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      oPath,
    ]);

    console.log("[MusicMix] ffmpeg complete, uploading result...");
    const buffer = await fs.readFile(oPath);
    console.log(`[MusicMix] Output size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
    const filename = `mixed_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
    const publicUrl = await uploadBufferToStorage(buffer, filename, "video/mp4", "videos");
    console.log("[MusicMix] Upload complete:", publicUrl);
    return publicUrl;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

export async function mixImageWithMusic({
  imageUrl,
  musicUrl,
  musicVolume,
  duration = 10,
}: {
  imageUrl: string;
  musicUrl: string;
  musicVolume: number;
  duration?: number;
}): Promise<string> {
  const volume = Math.max(0, Math.min(100, musicVolume)) / 100;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "imgmix-"));
  const imgPath = path.join(tmp, "image.jpg");
  const mPath = path.join(tmp, "music.mp3");
  const oPath = path.join(tmp, "output.mp4");

  try {
    console.log(`[ImageMix] Downloading image: ${imageUrl.substring(0, 80)}`);
    console.log(`[ImageMix] Downloading music: ${musicUrl.substring(0, 80)}`);
    await Promise.all([
      downloadToFile(imageUrl, imgPath),
      downloadToFile(musicUrl, mPath),
    ]);
    console.log(`[ImageMix] Downloads complete, creating ${duration}s video with volume=${volume.toFixed(2)}`);

    await runFfmpeg([
      "-y",
      "-loop", "1",
      "-i", imgPath,
      "-i", mPath,
      "-filter:a", `volume=${volume.toFixed(2)}`,
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-t", String(duration),
      "-shortest",
      oPath,
    ]);

    console.log("[ImageMix] ffmpeg complete, uploading result...");
    const buffer = await fs.readFile(oPath);
    console.log(`[ImageMix] Output size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
    const filename = `imgvid_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
    const publicUrl = await uploadBufferToStorage(buffer, filename, "video/mp4", "videos");
    console.log("[ImageMix] Upload complete:", publicUrl);
    return publicUrl;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
