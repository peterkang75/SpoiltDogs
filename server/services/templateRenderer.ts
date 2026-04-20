import puppeteer, { type Browser } from "puppeteer";
import path from "path";
import fs from "fs";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;
  const launchOptions: any = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  };

  // Railway/Nixpacks: use system Chromium instead of bundled one
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  browser = await puppeteer.launch(launchOptions);
  return browser;
}

/** Render an HTML string to a PNG buffer */
export async function renderHtmlToImage(
  html: string,
  width: number = 1080,
  height: number = 1350,
): Promise<Buffer> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15_000 });
    const buffer = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width, height } });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}

/** Render a template file with variable substitution */
export async function renderTemplate(
  templateName: string,
  variables: Record<string, string>,
  width: number = 1080,
  height: number = 1350,
): Promise<Buffer> {
  const templateDir = path.join(__dirname, "..", "templates");
  const templatePath = path.join(templateDir, `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  let html = fs.readFileSync(templatePath, "utf-8");

  // Replace {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const escaped = value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), escaped);
  }

  return renderHtmlToImage(html, width, height);
}

/** Render multiple slides and return array of PNG buffers */
export async function renderSlides(
  slides: { templateName: string; variables: Record<string, string> }[],
  width: number = 1080,
  height: number = 1350,
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  for (const slide of slides) {
    const buf = await renderTemplate(slide.templateName, slide.variables, width, height);
    buffers.push(buf);
  }
  return buffers;
}

/** Cleanup browser on shutdown */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
