// Formatters module - beautify/minify functions

// ============ JSON ============

function beautifyJSON(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed, null, indent);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

function minifyJSON(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed);
  } catch (e) {
    return { error: true, message: e.message };
  }
}

// ============ XML ============

function beautifyXML(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }

  const indentStr = typeof indent === 'number' ? ' '.repeat(indent) : indent;
  let formatted = '';
  let level = 0;
  let hasWarning = false;
  let warningMsg = '';

  // Tokenize XML into parts: declarations, comments, CDATA, tags, text
  const tokens = [];
  let remaining = input.trim();

  while (remaining.length > 0) {
    if (remaining.startsWith('<?')) {
      const end = remaining.indexOf('?>');
      if (end === -1) { hasWarning = true; warningMsg = 'Unclosed processing instruction'; tokens.push(remaining); break; }
      tokens.push(remaining.substring(0, end + 2));
      remaining = remaining.substring(end + 2);
    } else if (remaining.startsWith('<!--')) {
      const end = remaining.indexOf('-->');
      if (end === -1) { hasWarning = true; warningMsg = 'Unclosed comment'; tokens.push(remaining); break; }
      tokens.push(remaining.substring(0, end + 3));
      remaining = remaining.substring(end + 3);
    } else if (remaining.startsWith('<![CDATA[')) {
      const end = remaining.indexOf(']]>');
      if (end === -1) { hasWarning = true; warningMsg = 'Unclosed CDATA'; tokens.push(remaining); break; }
      tokens.push(remaining.substring(0, end + 3));
      remaining = remaining.substring(end + 3);
    } else if (remaining.startsWith('</')) {
      const end = remaining.indexOf('>');
      if (end === -1) { hasWarning = true; warningMsg = 'Unclosed closing tag'; tokens.push(remaining); break; }
      tokens.push(remaining.substring(0, end + 1));
      remaining = remaining.substring(end + 1);
    } else if (remaining.startsWith('<')) {
      const end = remaining.indexOf('>');
      if (end === -1) { hasWarning = true; warningMsg = 'Unclosed tag'; tokens.push(remaining); break; }
      tokens.push(remaining.substring(0, end + 1));
      remaining = remaining.substring(end + 1);
    } else {
      // Text content
      const nextTag = remaining.indexOf('<');
      if (nextTag === -1) {
        if (remaining.trim()) tokens.push(remaining.trim());
        break;
      }
      const text = remaining.substring(0, nextTag);
      if (text.trim()) tokens.push(text.trim());
      remaining = remaining.substring(nextTag);
    }
  }

  const lines = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.startsWith('<?')) {
      lines.push(indentStr.repeat(level) + token);
    } else if (token.startsWith('<!--') || token.startsWith('<![CDATA[')) {
      lines.push(indentStr.repeat(level) + token);
    } else if (token.startsWith('</')) {
      level--;
      if (level < 0) level = 0;
      lines.push(indentStr.repeat(level) + token);
    } else if (token.startsWith('<')) {
      const isSelfClosing = token.endsWith('/>');
      // Check if next token is text content followed by closing tag
      if (!isSelfClosing && i + 2 < tokens.length &&
          !tokens[i + 1].startsWith('<') &&
          tokens[i + 2].startsWith('</')) {
        // Inline: <tag>text</tag>
        lines.push(indentStr.repeat(level) + token + tokens[i + 1] + tokens[i + 2]);
        i += 2;
      } else if (!isSelfClosing) {
        lines.push(indentStr.repeat(level) + token);
        level++;
      } else {
        lines.push(indentStr.repeat(level) + token);
      }
    } else {
      // Standalone text
      lines.push(indentStr.repeat(level) + token);
    }
  }

  formatted = lines.join('\n');

  if (hasWarning) {
    return { warning: true, message: warningMsg, result: formatted };
  }
  return formatted;
}

function minifyXML(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  // Remove whitespace between tags
  return input.replace(/>\s+</g, '><').replace(/^\s+|\s+$/g, '').trim();
}

// ============ YAML ============

// Use js-yaml (npm for tests, CDN for browser)
let jsyaml;
try {
  jsyaml = require('js-yaml');
} catch (e) {
  // Will be available via CDN in browser as window.jsyaml
  if (typeof window !== 'undefined' && window.jsyaml) {
    jsyaml = window.jsyaml;
  }
}

function beautifyYAML(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const indentNum = typeof indent === 'number' ? indent : 2;
    // Handle multi-document YAML
    const docs = [];
    const parts = input.split(/^---\s*$/m);
    const hasMultiDoc = parts.length > 1 && input.includes('---');

    if (hasMultiDoc) {
      for (const part of parts) {
        if (part.trim()) {
          const parsed = jsyaml.load(part);
          docs.push('---\n' + jsyaml.dump(parsed, { indent: indentNum, lineWidth: -1 }).trimEnd());
        }
      }
      return docs.join('\n');
    }

    const parsed = jsyaml.load(input);
    if (parsed === undefined || parsed === null) {
      return { error: true, message: 'Empty or null YAML document' };
    }
    return jsyaml.dump(parsed, { indent: indentNum, lineWidth: -1 }).trimEnd();
  } catch (e) {
    const msg = e.message || 'Invalid YAML';
    return { error: true, message: msg };
  }
}

function minifyYAML(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const parsed = jsyaml.load(input);
    return jsyaml.dump(parsed, { flowLevel: 0, lineWidth: -1 }).trimEnd();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

// ============ TOML ============

function beautifyTOML(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }

  const lines = input.split('\n');
  const result = [];
  let hasError = false;
  let errorMsg = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '' || line.startsWith('#')) {
      result.push(line);
      continue;
    }

    // Section headers like [package] or [dependencies.sub]
    if (/^\[[\w.-]+\]$/.test(line) || /^\[\[[\w.-]+\]\]$/.test(line)) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      result.push(line);
      continue;
    }

    // Key-value pairs: key = value
    if (/^[\w.-]+\s*=/.test(line)) {
      const eqIdx = line.indexOf('=');
      const key = line.substring(0, eqIdx).trim();
      const value = line.substring(eqIdx + 1).trim();

      if (value === '') {
        hasError = true;
        errorMsg = `Invalid TOML at line ${i + 1}: empty value for key "${key}"`;
        break;
      }

      result.push(`${key} = ${value}`);
      continue;
    }

    // If we reach here, it's potentially invalid
    if (line.startsWith('[') && !line.endsWith(']')) {
      hasError = true;
      errorMsg = `Invalid TOML at line ${i + 1}: unclosed section header`;
      break;
    }

    result.push(line);
  }

  if (hasError) {
    return { error: true, message: errorMsg };
  }

  return result.join('\n');
}

// ============ HTML & CSS (Prettier-based) ============

let prettier, prettierPluginBabel, prettierPluginHtml, prettierPluginCss, prettierPluginTs;
try {
  prettier = require('prettier');
} catch (e) {
  // Will be available via CDN in browser
}

async function beautifyHTML(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const indentNum = typeof indent === 'number' ? indent : 2;
    const useTabs = indent === '\t';
    const result = await prettier.format(input, {
      parser: 'html',
      tabWidth: useTabs ? 2 : indentNum,
      useTabs,
      printWidth: 120,
    });
    return result.trimEnd();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

async function minifyHTML(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  // Strip whitespace between tags and collapse spaces
  let result = input
    .replace(/>\s+</g, '><')
    .replace(/\n\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return result;
}

async function beautifyCSS(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const indentNum = typeof indent === 'number' ? indent : 2;
    const useTabs = indent === '\t';
    const result = await prettier.format(input, {
      parser: 'css',
      tabWidth: useTabs ? 2 : indentNum,
      useTabs,
      printWidth: 120,
    });
    return result.trimEnd();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

async function minifyCSS(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  // Remove comments, collapse whitespace, strip unnecessary spaces
  let result = input
    .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove comments
    .replace(/\s*\n\s*/g, '')            // Remove newlines
    .replace(/\s*{\s*/g, '{')            // Remove space around {
    .replace(/\s*}\s*/g, '}')            // Remove space around }
    .replace(/\s*;\s*/g, ';')            // Remove space around ;
    .replace(/\s*:\s*/g, ':')            // Remove space around :
    .replace(/\s*,\s*/g, ',')            // Remove space around ,
    .replace(/;}/g, '}')                 // Remove trailing ;
    .trim();
  return result;
}

// ============ JavaScript & TypeScript (Prettier-based) ============

async function beautifyJS(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const indentNum = typeof indent === 'number' ? indent : 2;
    const useTabs = indent === '\t';
    const result = await prettier.format(input, {
      parser: 'babel',
      tabWidth: useTabs ? 2 : indentNum,
      useTabs,
      printWidth: 80,
      semi: true,
      singleQuote: false,
    });
    return result.trimEnd();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

async function minifyJS(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  // Basic JS minification: remove comments, collapse whitespace
  let result = input
    .replace(/\/\/.*$/gm, '')            // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')    // Remove multi-line comments
    .replace(/\n\s*/g, '')               // Remove newlines + indentation
    .replace(/\s{2,}/g, ' ')             // Collapse spaces
    .trim();
  return result;
}

async function beautifyTS(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const indentNum = typeof indent === 'number' ? indent : 2;
    const useTabs = indent === '\t';
    const result = await prettier.format(input, {
      parser: 'typescript',
      tabWidth: useTabs ? 2 : indentNum,
      useTabs,
      printWidth: 80,
      semi: true,
      singleQuote: false,
    });
    return result.trimEnd();
  } catch (e) {
    return { error: true, message: e.message };
  }
}

async function minifyTS(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  let result = input
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return result;
}

// ============ SQL ============

let sqlFormatter;
try {
  sqlFormatter = require('sql-formatter');
} catch (e) {
  // Will be available via CDN in browser
}

function beautifySQL(input, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  try {
    const indentNum = typeof indent === 'number' ? indent : 2;
    const useTabs = indent === '\t';
    return sqlFormatter.format(input, {
      tabWidth: useTabs ? 1 : indentNum,
      useTabs,
      keywordCase: 'upper',
    });
  } catch (e) {
    return { error: true, message: e.message };
  }
}

function minifySQL(input) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { error: true, message: 'Empty input' };
  }
  // Collapse all whitespace to single spaces
  return input
    .replace(/--.*$/gm, '')           // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .trim();
}

// ============ Minify Controls ============

function canMinify(language) {
  const minifiable = ['json', 'xml', 'html', 'css', 'javascript', 'typescript', 'sql', 'yaml'];
  return minifiable.includes(language);
}

module.exports = {
  beautifyJSON,
  minifyJSON,
  beautifyXML,
  minifyXML,
  beautifyYAML,
  minifyYAML,
  beautifyTOML,
  beautifyHTML,
  minifyHTML,
  beautifyCSS,
  minifyCSS,
  beautifyJS,
  minifyJS,
  beautifyTS,
  minifyTS,
  beautifySQL,
  minifySQL,
  canMinify,
  // Note: minifyTOML intentionally not exported
};
