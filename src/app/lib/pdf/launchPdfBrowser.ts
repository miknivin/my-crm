/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared Puppeteer launcher for Invoice PDF generation, mirroring the
 * dev-vs-Vercel branching already proven in the Proposal routes
 * (src/app/api/proposals/generate & production-generate), extracted once
 * here since both new Invoice PDF routes need it. Proposal's own routes
 * are left untouched.
 */
export async function launchPdfBrowser(forceProduction: boolean): Promise<any> {
  const isVercelProduction = forceProduction || process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isVercelProduction) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = await chromium.executablePath();
    return puppeteerCore.default.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: true,
    });
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function renderHtmlToPdf(html: string, forceProduction: boolean): Promise<Buffer> {
  const browser = await launchPdfBrowser(forceProduction);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}
