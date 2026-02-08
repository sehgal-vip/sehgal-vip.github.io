// Language detection module
function detectLanguage(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { language: 'text', minified: false };
  }

  const trimmed = input.trim();
  const lines = input.split('\n');
  const lineCount = lines.length;
  const isMinified = lineCount === 1 && trimmed.length > 500;

  // 1. RTF check
  if (trimmed.startsWith('{\\rtf')) {
    return { language: 'unsupported', minified: false };
  }

  // 2. JSON: starts with { or [ and is valid JSON
  if (/^[\{\[]/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      const minified = !input.includes('\n') || isMinified;
      return { language: 'json', minified };
    } catch (e) {
      // Not valid JSON, continue detection
    }
  }

  // 3. XML: starts with <?xml or has XML-like structure
  if (/^<\?xml\b/i.test(trimmed)) {
    const minified = lineCount <= 1 || isMinified;
    return { language: 'xml', minified };
  }

  // 4. HTML: <!DOCTYPE html or <html
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    const minified = lineCount <= 1 || isMinified;
    return { language: 'html', minified };
  }

  // 18. PHP: <?php (before YAML since it starts with special char)
  if (/^<\?php\b/i.test(trimmed)) {
    return { language: 'php', minified: false };
  }

  // 5. YAML: --- or key: value patterns (no braces dominating)
  if (/^---\s*$/m.test(trimmed) ||
      (/^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*.+/m.test(trimmed) &&
       !trimmed.startsWith('{') && !trimmed.startsWith('[') &&
       /^\s*-\s+/m.test(trimmed))) {
    return { language: 'yaml', minified: false };
  }

  // 6. TOML: [section] headers or key = value patterns
  if (/^\[[\w.-]+\]\s*$/m.test(trimmed) &&
      /^\w[\w.-]*\s*=\s*.+/m.test(trimmed)) {
    return { language: 'toml', minified: false };
  }

  // 7. SQL: keywords as first tokens
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|EXPLAIN|SHOW|DESCRIBE|USE|SET)\b/i.test(trimmed)) {
    return { language: 'sql', minified: false };
  }

  // 8. CSS: selectors + { + property: value; patterns
  // Must have CSS-like properties (word-with-hyphens: value;) and no programming keywords
  if (/[a-zA-Z.*#@:\[\]][^{]*\{[^}]*(margin|padding|color|font|display|width|height|border|background|position|text-align|float|overflow)\s*:/im.test(trimmed) &&
      !/(const |let |var |function |=>|require\(|import |def |class |interface |fn |println|pub fn)/m.test(trimmed)) {
    const minified = lineCount <= 1 || isMinified;
    return { language: 'css', minified };
  }

  // 9. Shell: shebang
  if (/^#!\/bin\/(bash|sh|zsh)/m.test(trimmed)) {
    return { language: 'shell', minified: false };
  }

  // 10. Rust: fn main, let mut, impl, pub fn, println!
  if (/(^|\n)\s*(fn |let mut |impl |pub fn |println!)/m.test(trimmed)) {
    return { language: 'rust', minified: false };
  }

  // 11. Go: package main, func, :=
  if (/(^|\n)\s*package\s+\w+/m.test(trimmed) && /(^|\n)\s*func\s+/m.test(trimmed)) {
    return { language: 'go', minified: false };
  }

  // 12. TypeScript: interface, type annotations with : type
  if (/(^|\n)\s*(interface |type \w+ =|:\s*(string|number|boolean|any)\b)/m.test(trimmed)) {
    return { language: 'typescript', minified: false };
  }

  // 13. JavaScript: const, let, function, =>, require
  if (/(^|\n)\s*(const |let |var |function\s+\w+|=>\s*\{|require\s*\(|module\.exports)/m.test(trimmed)) {
    return { language: 'javascript', minified: false };
  }

  // 14. Java: public class, System.out
  if (/(^|\n)\s*(public\s+class\s+|System\.out|private\s+static)/m.test(trimmed)) {
    return { language: 'java', minified: false };
  }

  // 15. C/C++: #include, int main
  if (/(^|\n)\s*#include\s*[<"]/m.test(trimmed) ||
      /(^|\n)\s*int\s+main\s*\(/m.test(trimmed)) {
    return { language: 'c', minified: false };
  }

  // 16. PHP: $var patterns (<?php caught earlier)
  if (/\$[a-zA-Z_]\w*/.test(trimmed)) {
    return { language: 'php', minified: false };
  }

  // 17. Ruby: def/end, puts (check before Python to avoid def conflict)
  if (/(^|\n)\s*(puts |def \w+)/m.test(trimmed) &&
      /(^|\n)\s*end\s*$/m.test(trimmed)) {
    return { language: 'ruby', minified: false };
  }

  // 18. Python: def, import, class with colon endings (after Ruby to avoid conflict)
  if (/(^|\n)\s*(def |import |from .+ import |class \w+)/m.test(trimmed)) {
    return { language: 'python', minified: false };
  }

  // 19. Markdown: # headings, **bold**, [links](url)
  if (/^#{1,6}\s+.+/m.test(trimmed) ||
      /\*\*[^*]+\*\*/m.test(trimmed)) {
    return { language: 'markdown', minified: false };
  }

  // 20. Fallback
  return { language: 'text', minified: false };
}

module.exports = { detectLanguage };
