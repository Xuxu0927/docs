"""Validate the catalog and generate the website and bilingual READMEs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
notes = json.loads((ROOT / 'notes.json').read_text(encoding='utf-8'))
if not isinstance(notes, list):
    raise ValueError('notes.json must contain a list')
for note in notes:
    for lang in ('zh', 'en'):
        if not isinstance(note.get('title', {}).get(lang), str) or not note['title'][lang].strip():
            raise ValueError('Each note needs title.zh and title.en')
    for key in ('md_zh', 'md_en', 'pdf_zh', 'pdf_en'):
        path = note.get(key)
        if path:
            resolved = (ROOT / path).resolve()
            if not resolved.is_relative_to(ROOT) or not resolved.is_file():
                raise ValueError(f'Missing or invalid local file: {path}')
            if resolved.suffix.lower() != ('.md' if key.startswith('md') else '.pdf'):
                raise ValueError(f'Wrong file type: {path}')

payload = json.dumps(notes, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
(ROOT / 'index.html').write_text((ROOT / 'site.html').read_text(encoding='utf-8').replace('__CATALOG__', payload), encoding='utf-8')

for lang, filename, title, intro, headers in (
    ('zh', 'README.md', '学习笔记', '个人学习笔记与资料整理，持续更新。', ['序号', '主题', '中文 Markdown', '英文 Markdown', '中文 PDF', '英文 PDF']),
    ('en', 'README.en.md', 'Study Notes', 'Personal study notes and learning materials.', ['No.', 'Topic', 'Chinese Markdown', 'English Markdown', 'Chinese PDF', 'English PDF']),
):
    toggle = '**简体中文** | [English](README.en.md)' if lang == 'zh' else '[简体中文](README.md) | **English**'
    lines = [f'# {title}', '', toggle, '', intro, '', '| ' + ' | '.join(headers) + ' |', '|---|---|---|---|---|---|']
    from urllib.parse import quote
    for i, note in enumerate(notes, 1):
        cells = [str(i), note['title'][lang].replace('|', '&#124;').replace('\n', ' ')]
        for key in ('md_zh', 'md_en', 'pdf_zh', 'pdf_en'):
            path = note.get(key)
            label = 'MD' if key.startswith('md') else 'PDF'
            cells.append(f'[{label}]({quote(path)})' if path else ('待补充' if lang == 'zh' else 'Coming soon'))
        lines.append('| ' + ' | '.join(cells) + ' |')
    lines += ['', ('暂无笔记，后续持续更新。' if lang == 'zh' else 'No notes yet. More to come.') if not notes else '', '', '[添加笔记与网站发布说明](GUIDE.md)' if lang == 'zh' else '[Adding notes and publishing](GUIDE.md)', '']
    (ROOT / filename).write_text('\n'.join(lines), encoding='utf-8')
print(f'Built index.html, README.md and README.en.md ({len(notes)} notes)')
