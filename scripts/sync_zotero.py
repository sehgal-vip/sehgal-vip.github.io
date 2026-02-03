#!/usr/bin/env python3
"""Sync Zotero SQLite database from Google Drive to Jekyll CSV files."""
import os
import csv
import sqlite3
import tempfile
import requests

# Google Drive file ID for zotero.sqlite
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


def extract_items(db_path):
    """Extract items from Zotero SQLite database."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query to get items with their data
    query = '''
    SELECT
        i.itemID,
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
                'description': (row['abstract'] or '')[:200],
                'year': year,
                'url': url
            })

    conn.close()
    return items


def write_csv(items, category, output_dir):
    """Write items to CSV file."""
    filepath = os.path.join(output_dir, f'reading_{category}.csv')
    filtered = [i for i in items if i['type'] == category]
    filtered.sort(key=lambda x: (x['year'] or '0'), reverse=True)

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['title', 'author', 'description', 'year', 'url'])
        writer.writeheader()
        for item in filtered:
            writer.writerow({
                'title': item['title'],
                'author': item['author'],
                'description': item['description'],
                'year': item['year'],
                'url': item['url']
            })

    print(f'Wrote {len(filtered)} items to {filepath}')


def main():
    if not ZOTERO_SQLITE_ID:
        print('Error: ZOTERO_SQLITE_ID environment variable not set')
        return

    output_dir = os.environ.get('OUTPUT_DIR', '_data')

    # Download SQLite to temp file
    with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as tmp:
        tmp_path = tmp.name

    try:
        print('Downloading zotero.sqlite from Google Drive...')
        download_sqlite(ZOTERO_SQLITE_ID, tmp_path)

        print('Extracting items from database...')
        items = extract_items(tmp_path)
        print(f'Found {len(items)} items')

        # Write CSV files
        for category in ['books', 'papers', 'articles', 'others']:
            write_csv(items, category, output_dir)

        print('Sync complete!')
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == '__main__':
    main()
