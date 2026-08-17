#!/usr/bin/env python3
"""Sync the Zotero library to Jekyll CSV files.

Preferred source: the Zotero Web API (always current — Zotero's own sync
keeps it fresh), enabled by ZOTERO_USER_ID + ZOTERO_API_KEY.
Legacy fallback: a zotero.sqlite snapshot on Google Drive (ZOTERO_SQLITE_ID),
which only updates when someone manually re-uploads it.
"""
import os
import re
import csv
import sqlite3
import tempfile
import requests

# Zotero Web API credentials (preferred source)
ZOTERO_USER_ID = os.environ.get('ZOTERO_USER_ID', '')
ZOTERO_API_KEY = os.environ.get('ZOTERO_API_KEY', '')

# Google Drive file ID for zotero.sqlite (legacy fallback)
ZOTERO_SQLITE_ID = os.environ.get('ZOTERO_SQLITE_ID', '')

# Map Zotero item types to our categories
TYPE_MAP = {
    'book': 'books',
    'bookSection': 'books',
    'journalArticle': 'papers',
    'conferencePaper': 'papers',
    'preprint': 'papers',
    'thesis': 'papers',
    'report': 'papers',
    'blogPost': 'articles',
    'magazineArticle': 'articles',
    'newspaperArticle': 'articles',
    'webpage': 'others',
    'document': 'others',
    'presentation': 'others',
    'videoRecording': 'others',
    'podcast': 'others',
}


def download_sqlite(file_id, dest_path):
    """Download zotero.sqlite from Google Drive."""
    # Try direct download first
    url = f'https://drive.google.com/uc?export=download&id={file_id}'

    session = requests.Session()
    response = session.get(url, stream=True)

    # Handle virus scan warning for large files
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            url = f'https://drive.google.com/uc?export=download&confirm={value}&id={file_id}'
            response = session.get(url, stream=True)
            break

    with open(dest_path, 'wb') as f:
        for chunk in response.iter_content(32768):
            if chunk:
                f.write(chunk)

    print(f'Downloaded {dest_path} ({os.path.getsize(dest_path)} bytes)')


API_BASE = 'https://api.zotero.org'


def _api_get(path, params):
    headers = {'Zotero-API-Key': ZOTERO_API_KEY, 'Zotero-API-Version': '3'}
    response = requests.get(f'{API_BASE}{path}', params=params, headers=headers, timeout=60)
    response.raise_for_status()
    return response


def fetch_collection_names():
    """Map collection keys to names — collections become the tags column."""
    names = {}
    start = 0
    while True:
        r = _api_get(f'/users/{ZOTERO_USER_ID}/collections',
                     {'format': 'json', 'limit': 100, 'start': start})
        batch = r.json()
        if not batch:
            break
        for coll in batch:
            names[coll['key']] = coll['data']['name']
        start += len(batch)
        total = int(r.headers.get('Total-Results', 0) or 0)
        if total and start >= total:
            break
    return names


def fetch_items_api():
    """Fetch top-level items from the Zotero Web API (always current)."""
    collections = fetch_collection_names()
    items = []
    start = 0
    while True:
        r = _api_get(f'/users/{ZOTERO_USER_ID}/items/top',
                     {'format': 'json', 'limit': 100, 'start': start})
        batch = r.json()
        if not batch:
            break
        for entry in batch:
            data = entry.get('data', {})
            item_type = data.get('itemType', '')
            if item_type in ('attachment', 'note', 'annotation'):
                continue
            title = (data.get('title') or '').strip()
            if not title:
                continue

            authors = []
            for creator in data.get('creators', []):
                if creator.get('creatorType') != 'author':
                    continue
                name = creator.get('name') or \
                    f"{creator.get('firstName', '')} {creator.get('lastName', '')}".strip()
                if name:
                    authors.append(name)
            author_str = ', '.join(authors[:3])
            if len(authors) > 3:
                author_str += ' et al.'

            year_match = re.search(r'\b(\d{4})\b', data.get('date') or '')
            url = data.get('url') or ''
            if data.get('DOI'):
                url = f"https://doi.org/{data['DOI']}"
            tags = '; '.join(sorted(collections[k] for k in data.get('collections', [])
                                    if k in collections))

            items.append({
                'type': TYPE_MAP.get(item_type, 'others'),
                'title': title,
                'author': author_str,
                'description': truncate_words(data.get('abstractNote') or '', 300),
                'year': year_match.group(1) if year_match else '',
                'url': url,
                'tags': tags,
                'added': data.get('dateAdded', ''),
            })
        start += len(batch)
        total = int(r.headers.get('Total-Results', 0) or 0)
        if total and start >= total:
            break

    print(f'Fetched {len(items)} items from the Zotero API')
    return dedupe_items(items)


def extract_items(db_path):
    """Extract items from Zotero SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query to get items with their data
    query = '''
    SELECT
        i.itemID,
        i.dateAdded as dateAdded,
        it.typeName as itemType,
        (SELECT value FROM itemData id
         JOIN itemDataValues idv ON id.valueID = idv.valueID
         JOIN fields f ON id.fieldID = f.fieldID
         WHERE id.itemID = i.itemID AND f.fieldName = 'title') as title,
        (SELECT value FROM itemData id
         JOIN itemDataValues idv ON id.valueID = idv.valueID
         JOIN fields f ON id.fieldID = f.fieldID
         WHERE id.itemID = i.itemID AND f.fieldName = 'abstractNote') as abstract,
        (SELECT value FROM itemData id
         JOIN itemDataValues idv ON id.valueID = idv.valueID
         JOIN fields f ON id.fieldID = f.fieldID
         WHERE id.itemID = i.itemID AND f.fieldName = 'date') as date,
        (SELECT value FROM itemData id
         JOIN itemDataValues idv ON id.valueID = idv.valueID
         JOIN fields f ON id.fieldID = f.fieldID
         WHERE id.itemID = i.itemID AND f.fieldName = 'url') as url,
        (SELECT value FROM itemData id
         JOIN itemDataValues idv ON id.valueID = idv.valueID
         JOIN fields f ON id.fieldID = f.fieldID
         WHERE id.itemID = i.itemID AND f.fieldName = 'DOI') as doi
    FROM items i
    JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
    WHERE i.itemID NOT IN (SELECT itemID FROM deletedItems)
      AND it.typeName NOT IN ('attachment', 'note', 'annotation')
    '''

    cursor.execute(query)
    items = []

    for row in cursor.fetchall():
        item_id = row['itemID']

        # Get creators (authors)
        cursor.execute('''
            SELECT c.firstName, c.lastName, ct.creatorType
            FROM itemCreators ic
            JOIN creators c ON ic.creatorID = c.creatorID
            JOIN creatorTypes ct ON ic.creatorTypeID = ct.creatorTypeID
            WHERE ic.itemID = ?
            ORDER BY ic.orderIndex
        ''', (item_id,))

        creators = cursor.fetchall()
        authors = []
        for c in creators:
            if c['creatorType'] == 'author':
                name = f"{c['firstName'] or ''} {c['lastName'] or ''}".strip()
                if name:
                    authors.append(name)

        author_str = ', '.join(authors[:3])
        if len(authors) > 3:
            author_str += ' et al.'

        # Get collection names (Zotero subfolders) as semicolon-joined tags.
        # Leaf name only; nested paths are not included.
        cursor.execute('''
            SELECT c.collectionName
            FROM collectionItems ci
            JOIN collections c ON ci.collectionID = c.collectionID
            WHERE ci.itemID = ?
            ORDER BY c.collectionName
        ''', (item_id,))
        tags_str = '; '.join(r['collectionName'] for r in cursor.fetchall())

        # Parse year from date
        date = row['date'] or ''
        year = ''
        if date and len(date) >= 4:
            year = date[:4]

        # Get URL (prefer DOI)
        url = row['url'] or ''
        if row['doi']:
            url = f"https://doi.org/{row['doi']}"

        # Get category
        item_type = row['itemType']
        category = TYPE_MAP.get(item_type, 'others')

        if row['title']:  # Skip items without title
            items.append({
                'type': category,
                'title': row['title'],
                'author': author_str,
                'description': truncate_words(row['abstract'] or '', 300),
                'year': year,
                'url': url,
                'tags': tags_str,
                # Zotero stores UTC "YYYY-MM-DD HH:MM:SS" — normalize to ISO
                # so the Reading page's recency marker can Date.parse it.
                'added': (row['dateAdded'] or '').replace(' ', 'T') + ('Z' if row['dateAdded'] else ''),
            })

    conn.close()
    return dedupe_items(items)


def truncate_words(text, limit):
    """Truncate at a word boundary with an ellipsis, never mid-word."""
    text = ' '.join(text.split())
    if len(text) <= limit:
        return text
    cut = text.rfind(' ', 0, limit)
    if cut == -1:
        cut = limit
    return text[:cut].rstrip('.,;:') + '…'


def item_key(item):
    """Identity for dedup. The same paper saved from two sources (arXiv,
    HuggingFace 'Paper page - …') gets different titles and URLs but shares
    an arXiv ID, so prefer that; fall back to normalized title."""
    m = re.search(r'(?:arxiv\.org/abs/|arXiv\.|huggingface\.co/papers/)(\d{4}\.\d{4,5})',
                  item['url'] or '')
    if m:
        return ('arxiv', m.group(1))
    title = ' '.join(item['title'].lower().split())
    title = re.sub(r'^paper page - ', '', title)
    return (item['type'], title)


def dedupe_items(items):
    """Drop duplicate items, e.g. an item filed in Zotero twice or saved
    from two sources. Keep the copy with the most complete metadata."""
    def completeness(i):
        # Penalize aggregator titles so the canonical source wins ties.
        aggregator = i['title'].lower().startswith('paper page - ')
        return sum(bool(i[k]) for k in ('url', 'description', 'author', 'year', 'tags')) - (2 if aggregator else 0)

    best = {}
    order = []
    for item in items:
        key = item_key(item)
        if key not in best:
            best[key] = item
            order.append(key)
        elif completeness(item) > completeness(best[key]):
            best[key] = item
    deduped = [best[k] for k in order]
    if len(deduped) < len(items):
        print(f'Dropped {len(items) - len(deduped)} duplicate item(s)')
    return deduped


def write_csv(items, category, output_dir):
    """Write items to CSV file."""
    filepath = os.path.join(output_dir, f'reading_{category}.csv')
    filtered = [i for i in items if i['type'] == category]
    filtered.sort(key=lambda x: (x['year'] or '0'), reverse=True)

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['title', 'author', 'description', 'year', 'url', 'tags', 'added'])
        writer.writeheader()
        for item in filtered:
            writer.writerow({
                'title': item['title'],
                'author': item['author'],
                'description': item['description'],
                'year': item['year'],
                'url': item['url'],
                'tags': item.get('tags', ''),
                'added': item.get('added', ''),
            })

    print(f'Wrote {len(filtered)} items to {filepath}')


def write_meta(items, output_dir):
    """Write sync metadata (timestamp + per-category counts) for the
    Reading page's stats strip. Committed only when the CSVs change, so
    the timestamp reflects when the library content last changed."""
    from datetime import datetime, timezone

    filepath = os.path.join(output_dir, 'reading_meta.yml')
    counts = {}
    for item in items:
        counts[item['type']] = counts.get(item['type'], 0) + 1

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('# Generated by scripts/sync_zotero.py — do not edit by hand.\n')
        f.write(f'last_synced: "{datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}"\n')
        f.write('counts:\n')
        for category in ['papers', 'books', 'articles', 'others']:
            f.write(f'  {category}: {counts.get(category, 0)}\n')

    print(f'Wrote sync metadata to {filepath}')


def sync_from_drive():
    """Legacy path: download a zotero.sqlite snapshot from Google Drive.
    Only as fresh as the last manual upload — prefer the Web API."""
    with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as tmp:
        tmp_path = tmp.name

    try:
        print('Downloading zotero.sqlite from Google Drive...')
        download_sqlite(ZOTERO_SQLITE_ID, tmp_path)

        print('Extracting items from database...')
        return extract_items(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def main():
    output_dir = os.environ.get('OUTPUT_DIR', '_data')

    if ZOTERO_USER_ID and ZOTERO_API_KEY:
        print('Syncing from the Zotero Web API...')
        items = fetch_items_api()
    elif ZOTERO_SQLITE_ID:
        items = sync_from_drive()
    else:
        print('Error: set ZOTERO_USER_ID + ZOTERO_API_KEY (preferred) '
              'or ZOTERO_SQLITE_ID (legacy Drive snapshot)')
        return

    print(f'Found {len(items)} items')

    for category in ['books', 'papers', 'articles', 'others']:
        write_csv(items, category, output_dir)

    write_meta(items, output_dir)

    print('Sync complete!')


if __name__ == '__main__':
    main()
