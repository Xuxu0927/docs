# 更新笔记

网站直接读取 `notes.json`，无需运行命令或使用后台。

1. 在 GitHub 仓库上传文件：中文 MD → `md/zh/`，英文 MD → `md/en/`；中文 PDF → `pdf/zh/`，英文 PDF → `pdf/en/`。
2. 编辑 `notes.json`，增加一条记录并提交：

```json
[
  {
    "title": { "zh": "我的笔记", "en": "My Notes" },
    "md_zh": "md/zh/my-notes.md",
    "md_en": null,
    "pdf_zh": null,
    "pdf_en": null
  }
]
```

没有的版本填 `null`，表格显示 `—`。多条记录用逗号分隔，排列顺序就是表格顺序。

3. 等待 GitHub Pages 部署完成，刷新网站即可。

- 修改文件内容：在 GitHub 编辑或替换同一路径的文件，下载内容随部署更新。
- 修改主题标题、增删条目或调整顺序：编辑 `notes.json`。
- 修改网页外观或页标题：直接编辑 `index.html`（语言切换时的文字在 `notes.js`）。

新增文件不会自动被收录到目录，需在 `notes.json` 填写路径。

仓库 README 与网站目录独立。如需同步 README，可选在本地运行 `python tools/build.py` 后提交生成的文件；不影响网站更新。

# English

Upload Markdown/PDF files to the matching language folders, edit `notes.json`, and commit. Once GitHub Pages finishes deploying, refresh the website. Editing an existing document updates its download without changing the catalog. No local build or token is needed to update the website through GitHub.
