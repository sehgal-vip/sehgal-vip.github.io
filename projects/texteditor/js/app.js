(function () {
  'use strict';

  // === #24: CDN Library Check ===
  var cdnOk = (typeof marked !== 'undefined' && typeof TurndownService !== 'undefined' &&
    typeof turndownPluginGfm !== 'undefined' && typeof DOMPurify !== 'undefined');

  if (!cdnOk) {
    var cdnErr = document.getElementById('cdnError');
    if (cdnErr) cdnErr.hidden = false;
    var cb = document.getElementById('convertBtn');
    if (cb) cb.disabled = true;
    return; // Stop all initialization
  }

  // === DOM Elements ===
  var inputFormat = document.getElementById('inputFormat');
  var outputFormat = document.getElementById('outputFormat');
  var detectedLabel = document.getElementById('detectedFormat');
  var inputArea = document.getElementById('inputArea');
  var inputWrapper = document.getElementById('inputWrapper');
  var clearBtn = document.getElementById('clearBtn');
  var uploadBtn = document.getElementById('uploadBtn');
  var uploadBtnText = document.getElementById('uploadBtnText');
  var fileInput = document.getElementById('fileInput');
  var lossyWarning = document.getElementById('lossyWarning');
  var lossyMessage = document.getElementById('lossyMessage');
  var convertBtn = document.getElementById('convertBtn');
  var outputArea = document.getElementById('outputArea');
  var outputWrapper = document.getElementById('outputWrapper');
  var renderedView = document.getElementById('renderedView');
  var htmlToggle = document.getElementById('htmlToggle');
  var toggleRaw = document.getElementById('toggleRaw');
  var toggleRendered = document.getElementById('toggleRendered');
  var copyBtn = document.getElementById('copyBtn');
  var copyBtnText = document.getElementById('copyBtnText');
  var downloadBtn = document.getElementById('downloadBtn');
  var pasteBtn = document.getElementById('pasteBtn');
  var swapBtn = document.getElementById('swapBtn');
  var inputStats = document.getElementById('inputStats');
  var outputStats = document.getElementById('outputStats');
  var panelOutput = document.getElementById('panelOutput');
  var undoBanner = document.getElementById('undoBanner');
  var undoBtn = document.getElementById('undoBtn');

  // State
  var currentOutput = '';
  var showRendered = false;
  var sourceFilename = ''; // #15: smart download name
  var lastState = null;    // #21: undo
  var undoTimer = null;

  // === Initialize Libraries ===
  marked.setOptions({ gfm: true, breaks: false, pedantic: false });

  var turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  });
  turndownService.use(turndownPluginGfm.gfm);

  // ============================
  // AUTO-DETECTION
  // ============================
  function detectFormat(text) {
    if (!text || !text.trim()) return null;
    if (text.trimStart().startsWith('{\\rtf')) return 'rtf';
    var htmlIndicators = /<(!DOCTYPE|html|head|body|div|p|span|h[1-6]|ul|ol|li|table|tr|td|th|a\s|img\s|br|hr|section|article|nav|footer|header|main|form|input|button|select|textarea|pre|code|blockquote|strong|em|b|i)\b[^>]*>/i;
    var htmlTagCount = (text.match(/<[a-z][a-z0-9]*\b[^>]*>/gi) || []).length;
    var htmlCloseCount = (text.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
    if (htmlIndicators.test(text) && (htmlTagCount >= 2 || htmlCloseCount >= 1)) return 'html';
    var mdPatterns = [
      /^#{1,6}\s+.+/m, /\*\*[^*]+\*\*/, /(?<!\*)\*[^*]+\*(?!\*)/,
      /__[^_]+__/, /\[[^\]]+\]\([^)]+\)/, /^```/m, /^>\s+.+/m,
      /^[-*+]\s+.+/m, /^\d+\.\s+.+/m, /!\[[^\]]*\]\([^)]+\)/,
      /^-{3,}$/m, /\|.*\|.*\|/, /^- \[[ x]\]/m
    ];
    var mdScore = 0;
    for (var p = 0; p < mdPatterns.length; p++) {
      if (mdPatterns[p].test(text)) mdScore++;
    }
    if (mdScore >= 2) return 'md';
    return 'txt';
  }

  function getEffectiveInputFormat() {
    if (inputFormat.value === 'auto') return detectFormat(inputArea.value) || 'txt';
    return inputFormat.value;
  }

  function updateDetectedLabel() {
    if (inputFormat.value !== 'auto') { detectedLabel.textContent = ''; return; }
    var text = inputArea.value;
    if (!text.trim()) { detectedLabel.textContent = ''; return; }
    var detected = detectFormat(text);
    var names = { md: 'Markdown', html: 'HTML', txt: 'Plain Text', rtf: 'RTF' };
    detectedLabel.textContent = detected ? 'Detected: ' + names[detected] : '';
  }

  // ============================
  // LOSSY WARNING
  // ============================
  var lossyMap = {
    'html-txt': 'Formatting and links will be stripped.',
    'html-md': 'Some HTML elements may not convert perfectly.',
    'rtf-md': 'Complex formatting may be simplified.',
    'rtf-txt': 'All formatting will be stripped.',
    'md-txt': 'All formatting will be stripped.',
    'md-rtf': 'Only basic formatting \u2014 bold, italic, headings, lists \u2014 will be preserved.',
    'html-rtf': 'Only basic formatting \u2014 bold, italic, headings, lists \u2014 will be preserved.',
    'txt-rtf': 'Only basic formatting \u2014 bold, italic, headings, lists \u2014 will be preserved.',
    'rtf-rtf': 'Only basic formatting \u2014 bold, italic, headings, lists \u2014 will be preserved.'
  };

  function updateLossyWarning() {
    var key = getEffectiveInputFormat() + '-' + outputFormat.value;
    var msg = lossyMap[key];
    if (msg && inputArea.value.trim()) {
      lossyMessage.textContent = msg;
      lossyWarning.hidden = false;
    } else {
      lossyWarning.hidden = true;
    }
  }

  // ============================
  // SAME-FORMAT PREVENTION
  // ============================
  function preventSameFormat() {
    var inFmt = getEffectiveInputFormat();
    if (inFmt === outputFormat.value) {
      var fmts = ['md', 'html', 'txt', 'rtf'];
      for (var i = 0; i < fmts.length; i++) {
        if (fmts[i] !== inFmt) { outputFormat.value = fmts[i]; break; }
      }
    }
  }

  // ============================
  // RTF PARSER (RTF -> HTML)
  // ============================
  function parseRtfToHtml(rtf) {
    var i = 0, len = rtf.length;
    var bold = false, italic = false, underline = false;
    var stateStack = [];
    var skipKeywords = new Set([
      'fonttbl','colortbl','stylesheet','info','pict','object','header','footer',
      'footnote','xmlnstbl','listtable','listoverridetable','revtbl','rsidtbl',
      'generator','mmathPr','themedata','colorschememapping','datastore',
      'latentstyles','datafield','fldinst','bkmkstart','bkmkend'
    ]);

    function pushState() { stateStack.push({bold:bold,italic:italic,underline:underline}); }
    function popState() {
      if (stateStack.length) { var s=stateStack.pop(); bold=s.bold; italic=s.italic; underline=s.underline; }
    }
    function skipGroup() {
      var d=1;
      while(i<len&&d>0){if(rtf[i]==='\\'&&i+1<len){i+=2;continue;}if(rtf[i]==='{')d++;else if(rtf[i]==='}')d--;i++;}
    }

    var segments=[], currentText='', prevBold=false, prevItalic=false, prevUnderline=false;
    function flushText() {
      if(currentText){segments.push({text:currentText,bold:prevBold,italic:prevItalic,underline:prevUnderline});currentText='';}
      prevBold=bold; prevItalic=italic; prevUnderline=underline;
    }
    function addText(ch) {
      if(bold!==prevBold||italic!==prevItalic||underline!==prevUnderline) flushText();
      currentText+=ch;
    }
    function addPar() { flushText(); segments.push({par:true}); }

    while(i<len){
      var ch=rtf[i];
      if(ch==='{'){
        pushState(); i++;
        if(i<len&&rtf[i]==='\\'){
          if(rtf[i+1]==='*'){skipGroup();popState();continue;}
          var pw='',j=i+1;while(j<len&&/[a-z]/.test(rtf[j])){pw+=rtf[j];j++;}
          if(skipKeywords.has(pw)){skipGroup();popState();continue;}
        }
        continue;
      }
      if(ch==='}'){flushText();popState();i++;prevBold=bold;prevItalic=italic;prevUnderline=underline;continue;}
      if(ch==='\\'){
        i++;if(i>=len)break;var nc=rtf[i];
        if(nc==='\\'||nc==='{'||nc==='}'){addText(nc);i++;continue;}
        if(!/[a-z]/i.test(nc)){
          switch(nc){
            case'~':addText('\u00A0');break;case'-':break;case'_':addText('\u2011');break;
            case'\'':i++;var hx=rtf.substring(i,i+2);i+=2;var hc=parseInt(hx,16);if(!isNaN(hc))addText(String.fromCharCode(hc));continue;
            default:break;
          }
          i++;continue;
        }
        var word='';while(i<len&&/[a-z]/.test(rtf[i])){word+=rtf[i];i++;}
        var param='';if(i<len&&/[-\d]/.test(rtf[i])){while(i<len&&(/[\d]/.test(rtf[i])||(param===''&&rtf[i]==='-'))){param+=rtf[i];i++;}}
        if(i<len&&rtf[i]===' ')i++;
        var np=param!==''?parseInt(param,10):null;
        switch(word){
          case'b':flushText();bold=(np!==0);prevBold=bold;break;
          case'i':flushText();italic=(np!==0);prevItalic=italic;break;
          case'ul':flushText();underline=true;prevUnderline=true;break;
          case'ulnone':case'ul0':flushText();underline=false;prevUnderline=false;break;
          case'par':case'line':addPar();break;
          case'tab':addText('\t');break;
          case'bullet':addText('\u2022');break;
          case'endash':addText('\u2013');break;case'emdash':addText('\u2014');break;
          case'lquote':addText('\u2018');break;case'rquote':addText('\u2019');break;
          case'ldblquote':addText('\u201C');break;case'rdblquote':addText('\u201D');break;
          case'u':if(np!==null){addText(String.fromCodePoint(np<0?np+65536:np));if(i<len&&rtf[i]==='?')i++;}break;
          case'pard':flushText();bold=false;italic=false;underline=false;prevBold=false;prevItalic=false;prevUnderline=false;break;
          default:break;
        }
        continue;
      }
      if(ch==='\n'||ch==='\r'){i++;continue;}
      addText(ch);i++;
    }
    flushText();
    var result='',inP=false;
    for(var s=0;s<segments.length;s++){
      var seg=segments[s];
      if(seg.par){if(inP){result+='</p>';inP=false;}result+='\n';continue;}
      if(seg.text){
        if(!inP&&!seg.text.trim())continue;
        if(!inP){result+='<p>';inP=true;}
        var esc=seg.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        if(seg.bold)esc='<strong>'+esc+'</strong>';
        if(seg.italic)esc='<em>'+esc+'</em>';
        if(seg.underline)esc='<u>'+esc+'</u>';
        result+=esc;
      }
    }
    if(inP)result+='</p>';
    return result.trim()||'<p></p>';
  }

  // ============================
  // RTF GENERATOR (HTML -> RTF)
  // ============================
  function htmlToRtf(html) {
    var header='{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}{\\f1 Courier New;}}\\f0\\fs24\n';
    var rtfBody='';
    var doc=new DOMParser().parseFromString(html,'text/html');
    function esc(text){var o='';for(var i=0;i<text.length;i++){var c=text.charCodeAt(i);if(c===0x5C)o+='\\\\';else if(c===0x7B)o+='\\{';else if(c===0x7D)o+='\\}';else if(c===0x0A||c===0x0D)o+='';else if(c>127)o+='\\u'+c+'?';else o+=text[i];}return o;}
    function pn(node){
      if(node.nodeType===3){var t=node.textContent;if(!t.trim())return;rtfBody+=esc(t.replace(/\s+/g,' '));return;}
      if(node.nodeType!==1)return;
      var tag=node.tagName.toLowerCase();
      switch(tag){
        case'h1':rtfBody+='{\\pard\\sb240\\sa120{\\b\\fs48 ';pc(node);rtfBody+='}\\par}\n';return;
        case'h2':rtfBody+='{\\pard\\sb200\\sa100{\\b\\fs40 ';pc(node);rtfBody+='}\\par}\n';return;
        case'h3':rtfBody+='{\\pard\\sb160\\sa80{\\b\\fs32 ';pc(node);rtfBody+='}\\par}\n';return;
        case'h4':case'h5':case'h6':rtfBody+='{\\pard\\sb120\\sa60{\\b\\fs28 ';pc(node);rtfBody+='}\\par}\n';return;
        case'p':rtfBody+='{\\pard\\sa120 ';pc(node);rtfBody+='\\par}\n';return;
        case'br':rtfBody+='\\line ';return;
        case'strong':case'b':rtfBody+='{\\b ';pc(node);rtfBody+='}';return;
        case'em':case'i':rtfBody+='{\\i ';pc(node);rtfBody+='}';return;
        case'u':rtfBody+='{\\ul ';pc(node);rtfBody+='}';return;
        case'ul':case'ol':pc(node);return;
        case'li':rtfBody+='{\\pard\\li720\\fi-360\\sa60 \\u8226? ';pc(node);rtfBody+='\\par}\n';return;
        case'blockquote':rtfBody+='{\\pard\\li720\\ri720\\sa120 ';pc(node);rtfBody+='\\par}\n';return;
        case'pre':
          rtfBody+='{\\pard\\sa120{\\f1\\fs20 ';
          var lines=node.textContent.split('\n');
          for(var li=0;li<lines.length;li++){rtfBody+=esc(lines[li]);if(li<lines.length-1)rtfBody+='\\line ';}
          rtfBody+='}\\par}\n';return;
        case'code':
          if(node.parentNode&&node.parentNode.tagName&&node.parentNode.tagName.toLowerCase()==='pre')pc(node);
          else{rtfBody+='{\\f1\\fs20 ';pc(node);rtfBody+='}';}return;
        case'hr':rtfBody+='{\\pard\\brdrb\\brdrs\\brdrw10\\brsp40 \\par}\n';return;
        case'a':pc(node);return;
        case'del':case's':case'strike':rtfBody+='{\\strike ';pc(node);rtfBody+='}';return;
        case'table':
          var rows=node.querySelectorAll('tr');
          for(var r=0;r<rows.length;r++){var cells=rows[r].querySelectorAll('th,td');rtfBody+='{\\pard ';for(var c=0;c<cells.length;c++){if(c>0)rtfBody+='\\tab ';if(cells[c].tagName.toLowerCase()==='th')rtfBody+='{\\b ';pc(cells[c]);if(cells[c].tagName.toLowerCase()==='th')rtfBody+='}';}rtfBody+='\\par}\n';}return;
        case'input':if(node.type==='checkbox')rtfBody+=node.checked?'[x] ':'[ ] ';return;
        default:pc(node);if(['div','section','article','header','footer','main','aside','nav'].indexOf(tag)!==-1)rtfBody+='\\par\n';return;
      }
    }
    function pc(node){for(var i=0;i<node.childNodes.length;i++)pn(node.childNodes[i]);}
    pc(doc.body);
    return header+rtfBody.trim()+'\n}';
  }

  function rtfToText(rtf){return htmlToText(parseRtfToHtml(rtf));}

  function htmlToText(html){
    var doc=new DOMParser().parseFromString(html,'text/html');var result='';
    var blocks=new Set(['p','div','h1','h2','h3','h4','h5','h6','li','blockquote','pre','tr','section','article','header','footer','main','aside','nav','hr']);
    var dbls=['p','div','h1','h2','h3','h4','h5','h6','blockquote','section','article'];
    function walk(n){
      if(n.nodeType===3){result+=n.textContent;return;}
      if(n.nodeType!==1)return;
      var tag=n.tagName.toLowerCase();
      if(blocks.has(tag)&&result.length>0&&!result.endsWith('\n')){result+='\n';if(dbls.indexOf(tag)!==-1&&!result.endsWith('\n\n'))result+='\n';}
      if(tag==='br'){result+='\n';return;}
      if(tag==='li')result+='  ';
      for(var i=0;i<n.childNodes.length;i++)walk(n.childNodes[i]);
      if(blocks.has(tag)&&!result.endsWith('\n'))result+='\n';
    }
    walk(doc.body);
    return result.replace(/\n{3,}/g,'\n\n').trim();
  }

  function mdToText(md){return htmlToText(marked.parse(md));}

  function textToHtml(text){
    return text.split(/\n\n+/).map(function(p){
      return '<p>'+p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>\n')+'</p>';
    }).join('\n');
  }

  function textToMd(text){
    return text.replace(/^(#{1,6})\s/gm,'\\$1 ').replace(/^(\d+)\./gm,'$1\\.').replace(/^([-*+])\s/gm,'\\$1 ').replace(/^(>)/gm,'\\$1');
  }

  function textToRtf(text){
    var h='{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 ',r='';
    text.split(/\n\n+/).forEach(function(p){
      var e='';for(var i=0;i<p.length;i++){var c=p.charCodeAt(i);if(p[i]==='\\')e+='\\\\';else if(p[i]==='{')e+='\\{';else if(p[i]==='}')e+='\\}';else if(p[i]==='\n')e+='\\line\n';else if(c>127)e+='\\u'+c+'?';else e+=p[i];}
      r+='\\pard '+e+'\\par\n';
    });
    return h+r.trim()+'}';
  }

  function stripFrontmatter(md){return md.replace(/^---\n[\s\S]*?\n---\n?/,'');}

  function convert(text, fromFmt, toFmt) {
    if (fromFmt === toFmt) return text;
    if (fromFmt === 'md') text = stripFrontmatter(text);
    switch (fromFmt + '-' + toFmt) {
      case 'md-html': return marked.parse(text);
      case 'md-txt': return mdToText(text);
      case 'md-rtf': return htmlToRtf(marked.parse(text));
      case 'html-md': return turndownService.turndown(text);
      case 'html-txt': return htmlToText(text);
      case 'html-rtf': return htmlToRtf(text);
      case 'txt-html': return textToHtml(text);
      case 'txt-md': return textToMd(text);
      case 'txt-rtf': return textToRtf(text);
      case 'rtf-html': return parseRtfToHtml(text);
      case 'rtf-md': return turndownService.turndown(parseRtfToHtml(text));
      case 'rtf-txt': return rtfToText(text);
      default: return text;
    }
  }

  // ============================
  // UI HELPERS
  // ============================
  function updateConvertState() {
    convertBtn.disabled = !inputArea.value.trim();
  }

  // #17: Toggle labels for RTF vs HTML
  function updateToggle() {
    var fmt = outputFormat.value;
    var canRender = (fmt === 'html' || fmt === 'rtf');
    htmlToggle.hidden = !canRender;
    if (fmt === 'rtf') {
      toggleRaw.textContent = 'Code';
      toggleRendered.textContent = 'Preview';
    } else {
      toggleRaw.textContent = 'Raw';
      toggleRendered.textContent = 'Rendered';
    }
    if (!canRender) {
      showRendered = false;
      outputArea.hidden = false;
      renderedView.hidden = true;
      toggleRaw.classList.add('active');
      toggleRendered.classList.remove('active');
    }
  }

  // #9: Character/line count
  function updateStats() {
    var inText = inputArea.value;
    if (inText) {
      var inLines = inText.split('\n').length;
      var inChars = inText.length;
      inputStats.textContent = inLines + (inLines === 1 ? ' line' : ' lines') + ' \u00B7 ' + inChars.toLocaleString() + (inChars === 1 ? ' char' : ' chars');
    } else {
      inputStats.textContent = '';
    }

    if (currentOutput) {
      var outLines = currentOutput.split('\n').length;
      var outChars = currentOutput.length;
      outputStats.textContent = outLines + (outLines === 1 ? ' line' : ' lines') + ' \u00B7 ' + outChars.toLocaleString() + (outChars === 1 ? ' char' : ' chars');
    } else {
      outputStats.textContent = '';
    }
  }

  function updateOutputActions() {
    var has = currentOutput.length > 0;
    copyBtn.disabled = !has;
    downloadBtn.disabled = !has;
    swapBtn.disabled = !has;
  }

  function getFileExtension() { return outputFormat.value; }
  function getMimeType() {
    switch(outputFormat.value){
      case'html':return'text/html';case'md':return'text/markdown';case'rtf':return'application/rtf';default:return'text/plain';
    }
  }

  // #3: Flash output panel on success
  function flashOutput() {
    panelOutput.classList.add('flash');
    setTimeout(function () { panelOutput.classList.remove('flash'); }, 600);
  }

  // #16: Error styling
  function setError(on) {
    if (on) outputWrapper.classList.add('error');
    else outputWrapper.classList.remove('error');
  }

  // Render output preview (HTML or RTF)
  function updateRenderedView(toFmt) {
    if (toFmt === 'html') {
      renderedView.innerHTML = DOMPurify.sanitize(currentOutput);
    } else if (toFmt === 'rtf') {
      renderedView.innerHTML = DOMPurify.sanitize(parseRtfToHtml(currentOutput));
    }
  }

  // ============================
  // CORE: RUN CONVERSION
  // ============================
  function runConversion() {
    var text = inputArea.value;
    if (!text.trim()) return;

    var fromFmt = getEffectiveInputFormat();
    preventSameFormat();
    var toFmt = outputFormat.value;

    convertBtn.classList.add('loading');
    setError(false);

    requestAnimationFrame(function () {
      setTimeout(function () {
        try {
          currentOutput = convert(text, fromFmt, toFmt);
          outputArea.value = currentOutput;
          updateRenderedView(toFmt);

          var canRender = (toFmt === 'html' || toFmt === 'rtf');
          if (canRender && showRendered) {
            outputArea.hidden = true;
            renderedView.hidden = false;
          } else {
            outputArea.hidden = false;
            renderedView.hidden = true;
          }

          updateOutputActions();
          updateToggle();
          updateStats();
          flashOutput(); // #3

          // #25: Focus management
          if (showRendered && renderedView && !renderedView.hidden) {
            renderedView.focus();
          } else {
            outputArea.focus();
          }
        } catch (err) {
          outputArea.value = 'Error during conversion: ' + err.message;
          currentOutput = '';
          setError(true); // #16
          updateOutputActions();
          updateStats();
        }
        convertBtn.classList.remove('loading');
      }, 10);
    });
  }

  // ============================
  // FILE HANDLING
  // ============================
  var extToFormat = {md:'md',markdown:'md',html:'html',htm:'html',txt:'txt',rtf:'rtf'};

  function handleFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    var fmt = extToFormat[ext];
    // #15: Store source filename (without extension)
    sourceFilename = file.name.replace(/\.[^.]+$/, '');

    var reader = new FileReader();
    reader.onload = function (e) {
      inputArea.value = e.target.result;
      if (fmt) { inputFormat.value = fmt; detectedLabel.textContent = ''; }
      else { inputFormat.value = 'auto'; updateDetectedLabel(); }
      preventSameFormat();
      updateConvertState();
      updateLossyWarning();
      updateStats();
      // #14: Show filename in upload button briefly
      uploadBtnText.textContent = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
      setTimeout(function () { uploadBtnText.textContent = 'Upload File'; }, 3000);
    };
    reader.readAsText(file);
  }

  // ============================
  // EVENT LISTENERS
  // ============================

  // Input typing
  inputArea.addEventListener('input', function () {
    updateDetectedLabel();
    updateConvertState();
    preventSameFormat();
    updateLossyWarning();
    updateStats();
  });

  // Input format change
  inputFormat.addEventListener('change', function () {
    updateDetectedLabel();
    preventSameFormat();
    updateLossyWarning();
    updateToggle();
  });

  // #7: Output format change — auto-reconvert
  outputFormat.addEventListener('change', function () {
    preventSameFormat();
    updateLossyWarning();
    updateToggle();
    // Auto-reconvert if there's existing input
    if (inputArea.value.trim() && currentOutput) {
      runConversion();
    }
  });

  // Clear button
  clearBtn.addEventListener('click', function () {
    // #21: Store state for undo
    if (inputArea.value.trim() || currentOutput) {
      lastState = {
        input: inputArea.value,
        output: currentOutput,
        inputFmt: inputFormat.value,
        outputFmt: outputFormat.value
      };
      undoBanner.hidden = false;
      if (undoTimer) clearTimeout(undoTimer);
      undoTimer = setTimeout(function () { undoBanner.hidden = true; lastState = null; }, 5000);
    }

    inputArea.value = '';
    outputArea.value = '';
    renderedView.innerHTML = '';
    renderedView.hidden = true;
    outputArea.hidden = false;
    currentOutput = '';
    sourceFilename = '';
    detectedLabel.textContent = '';
    lossyWarning.hidden = true;
    showRendered = false;
    setError(false);
    toggleRaw.classList.add('active');
    toggleRendered.classList.remove('active');
    updateConvertState();
    updateOutputActions();
    updateToggle();
    updateStats();
  });

  // #21: Undo
  undoBtn.addEventListener('click', function () {
    if (!lastState) return;
    inputArea.value = lastState.input;
    currentOutput = lastState.output;
    outputArea.value = currentOutput;
    inputFormat.value = lastState.inputFmt;
    outputFormat.value = lastState.outputFmt;
    undoBanner.hidden = true;
    if (undoTimer) clearTimeout(undoTimer);
    lastState = null;
    updateDetectedLabel();
    updateConvertState();
    updateOutputActions();
    updateLossyWarning();
    updateToggle();
    updateStats();
  });

  // Upload
  uploadBtn.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  // #13: Paste button
  pasteBtn.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        inputArea.value = text;
        sourceFilename = '';
        updateDetectedLabel();
        updateConvertState();
        preventSameFormat();
        updateLossyWarning();
        updateStats();
      }).catch(function () { /* permission denied — user can Ctrl+V */ });
    }
  });

  // Drag & drop
  var dragCounter = 0;
  inputWrapper.addEventListener('dragenter', function (e) { e.preventDefault(); e.stopPropagation(); dragCounter++; inputWrapper.classList.add('dragover'); });
  inputWrapper.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
  inputWrapper.addEventListener('dragleave', function (e) { e.preventDefault(); e.stopPropagation(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; inputWrapper.classList.remove('dragover'); } });
  inputWrapper.addEventListener('drop', function (e) { e.preventDefault(); e.stopPropagation(); dragCounter = 0; inputWrapper.classList.remove('dragover'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });

  // Convert button
  convertBtn.addEventListener('click', function () { runConversion(); });

  // #1: Keyboard shortcut Ctrl/Cmd+Enter
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!convertBtn.disabled) runConversion();
    }
  });

  // Toggle: Raw
  toggleRaw.addEventListener('click', function () {
    showRendered = false;
    toggleRaw.classList.add('active');
    toggleRaw.setAttribute('aria-pressed', 'true');
    toggleRendered.classList.remove('active');
    toggleRendered.setAttribute('aria-pressed', 'false');
    outputArea.hidden = false;
    renderedView.hidden = true;
  });

  // Toggle: Rendered/Preview
  toggleRendered.addEventListener('click', function () {
    showRendered = true;
    toggleRendered.classList.add('active');
    toggleRendered.setAttribute('aria-pressed', 'true');
    toggleRaw.classList.remove('active');
    toggleRaw.setAttribute('aria-pressed', 'false');
    outputArea.hidden = true;
    renderedView.hidden = false;
    if (currentOutput && !renderedView.innerHTML.trim()) {
      updateRenderedView(outputFormat.value);
    }
  });

  // Copy
  function showCopied() {
    copyBtnText.textContent = 'Copied!';
    copyBtn.disabled = true;
    setTimeout(function () { copyBtnText.textContent = 'Copy'; copyBtn.disabled = false; }, 2000);
  }
  copyBtn.addEventListener('click', function () {
    if (!currentOutput) return;
    navigator.clipboard.writeText(currentOutput).then(showCopied).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = currentOutput; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      showCopied();
    });
  });

  // #15: Download with smart filename
  downloadBtn.addEventListener('click', function () {
    if (!currentOutput) return;
    var ext = getFileExtension();
    var mime = getMimeType();
    var name = (sourceFilename || 'converted') + '.' + ext;
    var blob = new Blob([currentOutput], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // #8: Swap / Use as Input
  swapBtn.addEventListener('click', function () {
    if (!currentOutput) return;
    inputArea.value = currentOutput;
    inputFormat.value = outputFormat.value;
    sourceFilename = '';
    currentOutput = '';
    outputArea.value = '';
    renderedView.innerHTML = '';
    renderedView.hidden = true;
    outputArea.hidden = false;
    showRendered = false;
    setError(false);
    toggleRaw.classList.add('active');
    toggleRendered.classList.remove('active');
    updateDetectedLabel();
    preventSameFormat();
    updateConvertState();
    updateOutputActions();
    updateLossyWarning();
    updateToggle();
    updateStats();
  });

  // === INIT ===
  updateConvertState();
  updateToggle();
  updateLossyWarning();
  updateStats();

})();
