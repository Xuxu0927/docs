"""Optional: validate files and update the bilingual repository READMEs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def table_text(value):
    for before, after in (('&', '&amp;'), ('<', '&lt;'), ('>', '&gt;'), ('|', '&#124;'), ('[', '&#91;'), (']', '&#93;'), ('\r', ' '), ('\n', ' ')):
        value = value.replace(before, after)
    return value

notes = json.loads((ROOT / 'notes.json').read_text(encoding='utf-8'))
if not isinstance(notes, list):
    raise ValueError('notes.json must contain a list')
for note in notes:
    category = note.get('category')
    if category is not None and (not isinstance(category, dict) or not isinstance(category.get('zh'), str) or not category['zh'].strip() or ('en' in category and not isinstance(category['en'], str))):
        raise ValueError('Each category needs a Chinese name and an optional English name')
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

groups = {}
for note in notes:
    key = (note.get('category') or {}).get('zh', '')
    groups.setdefault(key, []).append(note)
if not groups:
    groups[''] = []
categorized = any(note.get('category') for note in notes)

for lang, filename, title, headers in (
    ('zh', 'README.md', '学习笔记', ['序号', '主题', '中文 Markdown', '英文 Markdown', '中文 PDF', '英文 PDF']),
    ('en', 'README.en.md', 'Study Notes', ['No.', 'Topic', 'Chinese Markdown', 'English Markdown', 'Chinese PDF', 'English PDF']),
):
    toggle = '**简体中文** | [English](README.en.md)' if lang == 'zh' else '[简体中文](README.md) | **English**'
    lines = [f'# {title}', '', toggle, '']
    from urllib.parse import quote
    for key, items in groups.items():
        category = (items[0].get('category') or {}) if items else {}
        name = (category.get(lang) or category.get('zh')) if category else ('其他' if lang == 'zh' else 'Other') if categorized else ''
        if name:
            lines += ['## ' + table_text(name), '']
        lines += ['| ' + ' | '.join(headers) + ' |', '|---|---|---|---|---|---|']
        for i, note in enumerate(items, 1):
            cells = [str(i), table_text(note['title'].get(lang) or note['title']['zh'])]
            for key in ('md_zh', 'md_en', 'pdf_zh', 'pdf_en'):
                path = note.get(key)
                label = 'MD' if key.startswith('md') else 'PDF'
                cells.append(f'[{label}]({quote(path)})' if path else '—')
            lines.append('| ' + ' | '.join(cells) + ' |')
        lines.append('')
    (ROOT / filename).write_text('\n'.join(lines), encoding='utf-8')
print(f'Updated README.md and README.en.md ({len(notes)} notes)')
