import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const TEMPLATE_DIR = path.join(process.cwd(), "server", "templates");
const WIDTH = 1080;
const HEIGHT = 1920;
const BG_IMAGE = process.argv[2];

if (!BG_IMAGE || !fs.existsSync(BG_IMAGE)) {
  console.error("Usage: tsx tools/render-reel-previews.ts <background-image-path>");
  console.error("Renders all 5 production overlay templates as PNGs to /tmp/reel-<name>.png");
  process.exit(1);
}

function loadCSS(): string {
  return fs.readFileSync(path.join(TEMPLATE_DIR, "design-system.css"), "utf-8");
}

const templates = [
  { name: "gradient", file: "reel-overlay-gradient.html", usesDesignSystem: true },
  { name: "clean", file: "reel-overlay-clean.html", usesDesignSystem: true },
  { name: "canva-1", file: "reel-overlay-canva-1.html", usesDesignSystem: false },
  { name: "canva-2", file: "reel-overlay-canva-2.html", usesDesignSystem: false },
  { name: "canva-3", file: "reel-overlay-canva-3.html", usesDesignSystem: false },
];

async function main() {
  const bgBase64 = fs.readFileSync(BG_IMAGE).toString("base64");
  const bgDataUrl = `data:image/png;base64,${bgBase64}`;
  const css = loadCSS();

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const t of templates) {
    let html = fs.readFileSync(path.join(TEMPLATE_DIR, t.file), "utf-8");
    html = html.replace(/\{\{text\}\}/g, "Not every dog settles for ordinary. Some simply know better.");
    html = html.replace(/\{\{label\}\}/g, "Attention");

    if (t.usesDesignSystem) {
      html = html.replace(/<link[^>]*design-system\.css[^>]*>/, `<style>${css}</style>`);
    }

    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    await page.evaluate((bgUrl: string) => {
      document.body.style.background = `url(${bgUrl}) center/cover no-repeat`;
    }, bgDataUrl);

    const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    fs.writeFileSync(`/tmp/reel-${t.name}.png`, buf);
    console.log(`Rendered: /tmp/reel-${t.name}.png`);
    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
