import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "uploads";
const UPLOADS_DIR = path.join(process.cwd(), "client", "public", "uploads");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  if (e === "mp4") return "video/mp4";
  if (e === "mov") return "video/quicktime";
  return "application/octet-stream";
}

async function run() {
  const { rows } = await pool.query<{ id: string; image_url: string }>(
    "SELECT id, image_url FROM gukdung_images WHERE image_url LIKE '/uploads/%'"
  );

  console.log(`Found ${rows.length} rows with /uploads/ URLs`);

  let migrated = 0;
  let missing = 0;
  let failed = 0;

  for (const row of rows) {
    const filename = row.image_url.replace(/^\/uploads\//, "");
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[MISSING] ${filename} (row ${row.id})`);
      missing++;
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const ext = filename.split(".").pop() ?? "jpg";
    const contentType = mimeFromExt(ext);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: true });

    if (upErr) {
      console.error(`[FAIL] ${filename}: ${upErr.message}`);
      failed++;
      continue;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    const newUrl = data.publicUrl;

    await pool.query("UPDATE gukdung_images SET image_url = $1 WHERE id = $2", [
      newUrl,
      row.id,
    ]);

    migrated++;
    if (migrated % 10 === 0) console.log(`  ...${migrated}/${rows.length}`);
  }

  console.log(`\nDone.  migrated=${migrated}  missing=${missing}  failed=${failed}`);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
