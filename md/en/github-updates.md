# Updating Notes on GitHub (Example)

This **Practice** example explains how to maintain this website. Rename the example categories as needed.

## Edit an existing note

Open its Markdown file on GitHub, edit it, and commit the changes. The download updates after GitHub Pages finishes deploying. The homepage is a categorized download directory; it does not display document bodies. GitHub can preview the Markdown files.

## Add a note

Upload Chinese Markdown to `md/zh/` and English Markdown to `md/en/`. Append a record to the root `notes.json` array, separated from the previous record by a comma:

```json
{
  "category": { "zh": "实践记录", "en": "Practice" },
  "title": { "zh": "我的新笔记", "en": "My New Note" },
  "md_zh": "md/zh/my-note.md",
  "md_en": null,
  "pdf_zh": null,
  "pdf_en": null
}
```

The sample path must refer to a file you actually upload. Missing versions use `null` and appear as `—`.

## Categories and ordering

Entries with the same `category.zh` share one table. Set `category.en` for the English heading. New category names create additional tables. Categories follow their first appearance in the array; notes retain their relative order. Older entries without a category still work and appear under **Other** when mixed with categorized entries.

## PDFs

Upload PDFs to `pdf/zh/` or `pdf/en/`, then fill in `pdf_zh` or `pdf_en`. Translations and PDF files must be prepared separately.

## Repository homepage

The website reads `notes.json`, not the README. You can edit README tables manually or optionally run `python tools/build.py` locally to generate both READMEs from the catalog. Website updates do not require that command.

## Remove these examples

Remove their entries from `notes.json`, then delete their Markdown files when you are ready to use your own content.
