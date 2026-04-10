import { getBrowser } from "../config/browser.js";
import type { Book } from "../models/bookModel.js";
import { buildBookHtml } from "../utils/bookHtml.js";
import { AppError } from "../utils/errors/AppError.js";

export async function generateBookPreview(book: Book, chapters: any) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = await buildBookHtml(book, chapters);
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "24mm", right: "24mm" },
    });

    return pdf;
  } catch (error) {
    throw new AppError("could not generate pdf", 500, error);
  } finally {
    page.close();
  }
}
