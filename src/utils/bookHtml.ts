import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { Book } from "../models/bookModel.js";
import * as authorService from "../services/authorService.js";

function chapterToHtml(chapter: { [k in string]: any }) {
  let content = chapter.content
    ? generateHTML(JSON.parse(chapter.content), [StarterKit])
    : "<p>No content yet.</p>";

  return `
    <section class="chapter">
      <h2 class="chapter-title">${chapter.title}</h2>
      <div class="chapter-body">${content}</div>
    </section>
  `;
}

export async function buildBookHtml(
  book: Book,
  chapters: { [k in string]: any }[],
) {
  const chaptersHtml = chapters.map(chapterToHtml).join("");
  const author = await authorService.findByAuthorId(book.authorId.toString());
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          /* Base */
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 16px;
            line-height: 1.85;
            color: #1a1a1a;
          }

          /* Title page */
          .title-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh; /* fills exactly one A4 page */
            text-align: center;
            break-after: page; /* next content always starts on a new page */
          }

          .book-title {
            font-size: 36px;
            font-weight: normal;
            letter-spacing: -0.02em;
            margin-bottom: 1rem;
          }

          .book-author {
            font-size: 16px;
            color: #555;
            font-style: italic;
          }

          /* Chapters */
          .chapter {
            padding: 60px 0;
            /* each chapter starts on a new page */
            break-before: page;
          }

          .chapter-title {
            font-size: 26px;
            font-weight: normal;
            margin-bottom: 2.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #ddd;
          }

          /* Tiptap content styles */
          .chapter-body p { margin-bottom: 1.2em; }
          .chapter-body h1 { font-size: 24px; margin: 1.6em 0 0.5em; }
          .chapter-body h2 { font-size: 20px; margin: 1.4em 0 0.4em; }
          .chapter-body h3 { font-size: 17px; margin: 1.2em 0 0.4em; }
          .chapter-body blockquote {
            border-left: 3px solid #aaa;
            padding-left: 1.2rem;
            color: #555;
            font-style: italic;
            margin: 1.4em 0;
          }
          .chapter-body hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 2em auto;
            width: 40%;
          }
          .chapter-body strong { font-weight: 700; }
          .chapter-body em { font-style: italic; }
          .chapter-body s { text-decoration: line-through; }
        </style>
      </head>
      <body>
        <div class="title-page">
          <h1 class="book-title">${book.title}</h1>
          <p class="book-author">${author?.penName ?? "Draft"}</p>
        </div>
        ${chaptersHtml}
      </body>
    </html>
  `;
}
