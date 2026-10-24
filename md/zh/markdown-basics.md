# Markdown 入门（示例）

这是一篇示例笔记，属于“基础知识”。可以直接修改本文件，或用自己的笔记替换它。

## 标题和段落

用 `#` 写一级标题，用 `##` 写二级标题。段落之间空一行。

## 列表

- 今天学习的概念
- 一个具体例子
- 还没有理解的问题

## 代码

```python
message = "Hello, notes!"
print(message)
```

## 表格

| 概念 | 含义 |
| --- | --- |
| Markdown | 文本笔记格式 |
| GitHub Pages | 发布本仓库的网页 |

## 本文件如何显示在网站中

仓库根目录的 `notes.json` 把标题、分类和文件路径关联起来：

```json
{
  "category": { "zh": "基础知识", "en": "Fundamentals" },
  "title": { "zh": "Markdown 入门", "en": "Markdown Basics" },
  "md_zh": "md/zh/markdown-basics.md",
  "md_en": "md/en/markdown-basics.md",
  "pdf_zh": null,
  "pdf_en": null
}
```

修改本文件会更新下载内容；修改 `notes.json` 中的 `title` 或 `category` 会更新网页中的标题或分类。没有 PDF 时填 `null`，表格显示 `—`。
