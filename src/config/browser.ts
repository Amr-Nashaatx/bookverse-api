import puppeteer, { Browser } from "puppeteer";

let browser: Browser | null = null;

export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "shell",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }

  browser.on("disconnected", () => {
    browser = null;
  });

  return browser;
}
