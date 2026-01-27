# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Install dependencies
bundle install

# Run local dev server (http://localhost:4000)
bundle exec jekyll serve

# Build site (outputs to _site/)
bundle exec jekyll build

# Validate site
bundle exec jekyll doctor
```

## Architecture

This is a Jekyll-based personal blog deployed to GitHub Pages at sehgal-vip.github.io.

### Data-Driven Configuration

The site uses YAML/CSV data files in `_data/` to drive UI components:
- `navigation.yml` - Main nav menu items (renders in header and sidebar)
- `commands.yml` - Command palette actions with keyboard shortcuts
- `projects.csv`, `reading_*.csv` - Content for Projects and Reading pages

### Layout Hierarchy

```
default.html          Base template (head, header, footer, command-palette)
├── home.html         Homepage with featured posts
├── post.html         Blog post template (includes comments, share buttons)
└── page.html         Generic page wrapper
```

### Key Includes

- `command-palette.html` - Fuzzy search modal triggered by Cmd+K
- `sidebar.html` - Navigation and social links
- `theme-toggle.html` - Dark/light mode switcher (persists to localStorage)
- `comments.html` - Giscus (GitHub Discussions) integration

### Styling

All custom CSS lives in `_sass/custom.scss` (~50KB). The site uses CSS custom properties for theming defined in `_config.yml` under `colors:`.

## Blog Posts

Posts go in `_posts/` with filename format: `YYYY-MM-DD-title-slug.md`

Required frontmatter:
```yaml
---
layout: post
title: "Post Title"
date: YYYY-MM-DD
---
```

Optional frontmatter: `categories`, `tags`, `excerpt`, `author`, `comments` (boolean), `share` (boolean)

## Configuration

`_config.yml` contains:
- Site metadata (title, description, author, URL)
- Theme colors (primary, secondary, dark/light backgrounds)
- Social links (GitHub, LinkedIn, Instagram, Substack)
- Giscus comments config (requires repo_id and category_id from giscus.app)
- Google Analytics measurement ID

## Deployment

Push to `main` branch triggers automatic GitHub Pages build. Changes appear within 2-3 minutes.
