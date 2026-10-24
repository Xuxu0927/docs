# 使用说明 / Publishing guide

## 首次开启网站

进入仓库 **Settings → Pages**，在 **Build and deployment → Source** 选择 **Deploy from a branch**，选择 **main** 和 **/ (root)**，点击 **Save**。

等待 GitHub 完成部署后，页面会显示网站地址，预期为 `https://xuxu0927.github.io/docs/`。

仓库首页无需开启 Pages 即可查看。中文为默认语言，英文版本通过顶部链接切换。

## 添加自己的笔记

1. 中文 Markdown 放在 `md/zh/`，英文 Markdown 放在 `md/en/`。
2. 中文 PDF 放在 `pdf/zh/`，英文 PDF 放在 `pdf/en/`。
3. 在 `notes.json` 数组中增加一条记录（以下只是格式示例，目前目录为空）：

```json
[
  {
    "title": { "zh": "我的第一篇笔记", "en": "My First Note" },
    "md_zh": "md/zh/first-note.md",
    "md_en": null,
    "pdf_zh": null,
    "pdf_en": null
  }
]
```

尚未上传的版本使用 `null`，页面会显示“待补充”。路径必须对应实际存在的文件。

4. 在本地仓库文件夹运行 `python tools/build.py`，自动更新网站和中英文首页，然后将这些变更一起上传到 GitHub。目录顺序就是表格顺序，序号自动生成。

网站表格中的 MD / PDF 链接直接下载对应文件；仓库首页中的链接可用于预览。中英文内容需分别编写或上传。

## 修改外观

编辑 `site.html` 后重新运行 `python tools/build.py`。不要直接修改生成的 `index.html`、`README.md` 或 `README.en.md`，否则下次生成会覆盖修改。

## English

Enable **Settings → Pages → Deploy from a branch → main → / (root)** to publish the website. Chinese is the default; use the language button for English.

Upload your Markdown/PDF files into the language folders and add entries to `notes.json`. Use `null` for versions not yet available. Run `python tools/build.py` and upload all changed files. This updates the website and both repository homepages from the same catalog.
