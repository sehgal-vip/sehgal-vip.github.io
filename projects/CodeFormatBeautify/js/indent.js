// Generic indentation beautifier
function indentBeautify(input, language, indent) {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return input || '';
  }

  const indentStr = typeof indent === 'number' ? ' '.repeat(indent) : (indent || '  ');
  const lines = input.split('\n');
  // Strip existing indentation
  const stripped = lines.map(l => l.trimStart());

  const isKeywordBased = ['python', 'shell', 'ruby'].includes(language);

  if (isKeywordBased) {
    return indentKeywordBased(stripped, language, indentStr);
  } else {
    return indentBraceBased(stripped, language, indentStr);
  }
}

function indentKeywordBased(lines, language, indentStr) {
  const result = [];
  let level = 0;

  // Python: increase after lines ending with ':', decrease at dedent keywords
  if (language === 'python') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === '') { result.push(''); continue; }

      // Dedent for elif, else, except, finally, and closing dedent patterns
      if (/^(elif |else:|except|finally:)/.test(line)) {
        level = Math.max(0, level - 1);
      }
      // Check if we're starting a new def/class at top level after previous block
      if (/^(def |class )/.test(line) && level > 0) {
        // Look back to see if we should dedent
        let shouldDedent = true;
        for (let j = i - 1; j >= 0; j--) {
          const prev = lines[j].trim();
          if (prev === '') continue;
          if (prev.endsWith(':')) { shouldDedent = false; break; }
          break;
        }
        if (shouldDedent) level = Math.max(0, level - 1);
      }

      result.push(indentStr.repeat(level) + line);

      // Increase indent after lines ending with ':'
      if (line.endsWith(':')) {
        level++;
      }
    }
  }

  // Shell: increase after then/do, decrease before fi/done/esac
  if (language === 'shell') {
    for (const line of lines) {
      if (line === '') { result.push(''); continue; }

      // Decrease before fi, done, esac
      if (/^(fi|done|esac)\b/.test(line)) {
        level = Math.max(0, level - 1);
      }

      result.push(indentStr.repeat(level) + line);

      // Increase after then, do, else
      if (/;\s*then\s*$/.test(line) || /\bthen\s*$/.test(line)) {
        level++;
      }
      if (/;\s*do\s*$/.test(line) || /\bdo\s*$/.test(line)) {
        level++;
      }
    }
  }

  // Ruby: increase after def/class/module/if/unless/while/until/for/do/begin, decrease at end
  if (language === 'ruby') {
    for (const line of lines) {
      if (line === '') { result.push(''); continue; }

      if (/^(end|else|elsif|when|rescue|ensure)\b/.test(line)) {
        level = Math.max(0, level - 1);
      }

      result.push(indentStr.repeat(level) + line);

      if (/^(def |class |module |if |unless |while |until |for |do\b|begin\b|case\b)/.test(line) &&
          !line.includes(' end')) {
        level++;
      }
    }
  }

  return result.filter((_, i) => i < lines.length).join('\n');
}

function indentBraceBased(lines, language, indentStr) {
  const result = [];
  let level = 0;

  for (const line of lines) {
    if (line === '') { result.push(''); continue; }

    // Preprocessor directives in C/C++ stay at level 0
    if ((language === 'c') && line.startsWith('#')) {
      result.push(line);
      continue;
    }

    // PHP opening tag stays at level 0
    if (language === 'php' && line.startsWith('<?php')) {
      result.push(line);
      // Count braces in this line
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      level += opens - closes;
      continue;
    }

    // Count closing braces at the start of line to dedent
    const closingBraces = (line.match(/^[\s]*}/g) || []).length;
    if (line.startsWith('}') || line.startsWith('} ')) {
      level = Math.max(0, level - 1);
    }

    result.push(indentStr.repeat(level) + line);

    // Count braces on the line
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    const netBraces = opens - closes;

    // Adjust level (closing at start was already handled)
    if (line.startsWith('}') || line.startsWith('} ')) {
      level += netBraces + 1; // +1 because we already decremented
    } else {
      level += netBraces;
    }
    if (level < 0) level = 0;
  }

  return result.join('\n');
}

module.exports = { indentBeautify };
