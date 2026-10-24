# 使用说明 / Publishing guide

## 在线管理（推荐）

网站发布后，点击首页顶部的“管理”，或打开 `https://xuxu0927.github.io/docs/admin/`。

### 首次连接

1. 打开 [GitHub fine-grained 令牌设置](https://github.com/settings/personal-access-tokens/new?name=Notes%20Manager&target_name=Xuxu0927&contents=write)。
2. 设置名称和有效期。Resource owner 选 `Xuxu0927`。
3. Repository access 选择 **Only select repositories**，仅勾选 `docs`。
4. Repository permissions 的 **Contents** 选择 **Read and write**。Metadata 为 GitHub 自动附带的读取权限，无需账号管理或 Actions 权限。
5. 生成令牌，将它粘贴到后台的令牌输入框，点击“连接仓库”。令牌只发送给 GitHub API，保存在当前页面内存中；刷新、关闭页面或断开连接后需要重新输入。请不要把令牌发给他人或提交到仓库。

### 上传并发布

1. 点击“新增”，填写中文标题。英文标题可留空，暂时沿用中文标题。
2. 在对应区域选择或拖入中文 / 英文 MD / PDF 文件，可以只上传其中一个版本；也可先保存标题，文件后补。
3. 点击“保存到待发布列表”，核对下方预览。可继续添加多篇，也可以编辑现有笔记、更换文件或调整顺序。
4. 点击“发布更新”。后台会将文件、目录、网站及中英文仓库首页作为同一次提交写入 `main`，GitHub Pages 随后自动更新。无需在电脑上运行命令。

单个文件最多 20 MB，一次发布最多 40 MB；Markdown 须为 UTF-8 编码。不会自动翻译文档，也不会自动将 MD 转为 PDF。

“移出目录”仅取消网站和 README 中的收录；“移除”单个语言版本仅取消对应链接，源文件仍保留在仓库中。替换文件时，旧文件也可能保留在仓库中。

有未发布更改时可点击“备份草稿”，下载包含文件和目录的 JSON 文件。它不包含令牌，可在重新连接后通过“恢复草稿”继续编辑；恢复操作会替换当前待发布目录，请先核对预览再发布。

### 常见问题

- **刷新后未登录**：这是预期行为，重新输入令牌即可；未备份的编辑会丢失。
- **令牌无效 / 没有权限**：检查是否过期，是否只授权了正确的 `docs` 仓库，以及 Contents 是否为 Read and write。
- **仓库已发生变化**：后台不会强制覆盖新提交。先备份草稿，再重新加载最新目录，将自己的修改与最新内容核对后重新发布；恢复旧草稿会替换目录，需保留其他新笔记。
- **结果未能确认**：先打开仓库查看最新提交，再重新连接。不要连续重复发布。
- **发布成功但网站未变化**：确认 Pages 已启用，等待部署完成，并刷新网站。

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

The online manager is available at `/admin/`. Use a fine-grained GitHub token scoped only to this repository, with **Contents: Read and write**. The token is held in page memory only and sent directly to GitHub. Save notes to the pending list, then publish. A single commit updates the uploaded files, catalog, website and bilingual READMEs. File limits: 20 MB each, 40 MB per publication. Markdown must use UTF-8. Draft backups contain documents but no token.

Enable **Settings → Pages → Deploy from a branch → main → / (root)** to publish the website. Chinese is the default; use the language button for English.

Upload your Markdown/PDF files into the language folders and add entries to `notes.json`. Use `null` for versions not yet available. Run `python tools/build.py` and upload all changed files. This updates the website and both repository homepages from the same catalog.
