import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:3000";
const imagePath = "/home/ubuntu/upload/pasted_file_6Pn2PR_image.png";
const evidenceDir = "/home/ubuntu/tezza-prompts/validation-evidence";
const report = { faceDesktop: {}, sceneMobile: {} };

function jsonResponse(body) {
  return { status: 200, contentType: "application/json", body: JSON.stringify(body) };
}

async function captureActiveStatus(page, expectedLabel) {
  const status = page.locator(".image-progress").filter({ has: page.locator("p", { hasText: expectedLabel }) });
  await status.waitFor({ state: "visible", timeout: 5000 });
  const snapshot = await status.evaluate(element => {
    const progress = element.querySelector('[role="progressbar"]');
    return {
      label: element.querySelector("p")?.textContent?.trim() ?? "",
      ariaLive: element.getAttribute("aria-live"),
      progressRole: progress?.getAttribute("role"),
      value: progress?.getAttribute("aria-valuenow"),
      detail: progress?.getAttribute("aria-valuetext"),
    };
  });
  if (snapshot.label !== expectedLabel || snapshot.ariaLive !== "polite" || snapshot.progressRole !== "progressbar") {
    throw new Error(`Estado acessível inválido: ${JSON.stringify(snapshot)}`);
  }
  return snapshot;
}

async function mockImageFlows(page) {
  await page.addInitScript(() => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function delayedToBlob(callback, ...args) {
      return originalToBlob.call(this, blob => window.setTimeout(() => callback(blob), 350), ...args);
    };
  });

  await page.route("**/api/upload-image", async route => {
    await new Promise(resolve => setTimeout(resolve, 550));
    await route.fulfill(jsonResponse({ key: "e2e-reference-key", url: "/manus-storage/e2e-reference.jpg", contentType: "image/jpeg", size: 1234 }));
  });
  await page.route("**/api/trpc/prompt.extractTraits**", async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill(jsonResponse([{ result: { data: { json: { traits: "Face & identity: oval face; Hair: dark brown hair." } } } }]));
  });
  await page.route("**/api/trpc/prompt.generate**", async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill(jsonResponse([{ result: { data: { json: { prompt: "E2E generated prompt" } } } }]));
  });
}

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
try {
  await mkdir(evidenceDir, { recursive: true });

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mockImageFlows(desktop);
  await desktop.goto(baseUrl, { waitUntil: "networkidle" });
  await desktop.locator("#face-reference-upload").setInputFiles(imagePath);
  report.faceDesktop.preparing = await captureActiveStatus(desktop, "Preparando a foto");
  report.faceDesktop.uploading = await captureActiveStatus(desktop, "Enviando a foto");
  report.faceDesktop.analyzing = await captureActiveStatus(desktop, "Analisando os traços");
  await desktop.screenshot({ path: `${evidenceDir}/face-analyzing-desktop.png`, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mockImageFlows(mobile);
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Foto" }).click();
  await mobile.locator("#scene-upload").setInputFiles(imagePath);
  report.sceneMobile.preparing = await captureActiveStatus(mobile, "Preparando a imagem");
  report.sceneMobile.uploading = await captureActiveStatus(mobile, "Enviando a imagem");
  await mobile.getByRole("button", { name: /Gerar Método Feminino/ }).click();
  report.sceneMobile.analyzing = await captureActiveStatus(mobile, "Lendo a direção visual");
  await mobile.screenshot({ path: `${evidenceDir}/scene-analyzing-mobile.png`, fullPage: true });

  await writeFile(`${evidenceDir}/progress-e2e-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
