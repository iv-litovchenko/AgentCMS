/* ═══════════════════════════════════════════════════════════════
   JARVIS UI KIT — рендерер.  Глобальный объект: JV

   JV.render(spec)      JSON-описание  →  DOM-элемент  (div.jv)
   JV.md(text)          markdown       →  безопасная HTML-строка
   JV.mdEl(text)        markdown       →  DOM-элемент  (div.jv.jv-md)
   JV.sanitize(html)    чистит произвольный HTML (оставляет только jv-вёрстку)
   JV.extract(text)     вытаскивает ```jv {json}``` блоки из ответа модели
   JV.prompt()          системный промпт для модели (как отдавать UI)
   JV.schema            список блоков и их полей
   JV.examples          галерея примеров (jarvis-examples.js)
   JV.hooks.submit      вызывается при отправке формы
   JV.hooks.action      вызывается по клику на кнопку/элемент с data-say
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ───────── utils ───────── */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const isNum = v => typeof v === 'number' && isFinite(v);
  const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const cf = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
  const fnum = v => (v !== '' && v != null && isFinite(+v)) ? nf.format(+v) : esc(v);
  const short = v => cf.format(v);
  const C = i => `var(--jv-c${((i | 0) % 8) + 1})`;
  const arr = v => Array.isArray(v) ? v : (v == null ? [] : [v]);
  const trunc = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const JV = { hooks: {}, blocks: {}, charts: {}, examples: [], schema: [] };
  const fire = (name, p) => { try { JV.hooks[name] && JV.hooks[name](p); } catch (e) { console.error('[JV hook]', e); } };
  const safeUrl = (u, img) => {
    u = String(u || '').trim();
    if (!u || /[\s\u0000-\u001f\u007f]/.test(u)) return false;                       // пробелы/управляющие символы → нельзя (java\tscript:)
    if (/^(https?:\/\/|mailto:|#)/i.test(u)) return true;
    if (/^(\/(?!\/)|\.\.?\/)/.test(u)) return true;                                    // /path, ./path, ../path
    if (/^(?!\/\/)(?![a-z][a-z0-9+.-]*:)/i.test(u)) return true;                       // относительный: media/a.mp4
    return !!img && /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(u);
  };
  const LEVEL = { info: 'info', ok: 'ok', success: 'ok', good: 'ok', warn: 'warn', warning: 'warn', err: 'err', error: 'err', danger: 'err', bad: 'err', muted: 'muted' };
  const lvl = v => LEVEL[String(v || 'info').toLowerCase()] || 'info';

  /* ───────── markdown ───────── */
  function inline(src) {
    const codes = [];
    let s = esc(src).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => safeUrl(u, true) ? `<img src="${u}" alt="${a}" data-zoom loading="lazy">` : a);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => safeUrl(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
    s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`);
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }
  const codeHtml = (text, lang) => `<div class="jv-code"><div class="jv-code-h"><span>${esc(lang || 'text')}</span><button type="button" class="jv-copy" data-copy>Копировать</button></div><pre><code>${esc(text)}</code></pre></div>`;

  function md(src) {
    const lines = String(src ?? '').replace(/\r/g, '').split('\n');
    const out = []; let i = 0;
    const isSep = l => l != null && l.includes('-') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l);
    const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const LI = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
    const startsTable = k => lines[k] && lines[k].includes('|') && isSep(lines[k + 1]);
    while (i < lines.length) {
      const l = lines[i]; let m;
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(/^```\s*([\w+-]*)/))) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++; out.push(codeHtml(buf.join('\n'), m[1])); continue;
      }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^\s*>/.test(l)) {
        const buf = []; while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push(`<blockquote>${md(buf.join('\n'))}</blockquote>`); continue;
      }
      if (startsTable(i)) {
        const head = cells(l), al = cells(lines[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : '');
        i += 2; const rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(cells(lines[i++]));
        const td = (t, c, k) => `<${t}${al[k] ? ` class="jv-${al[k] === 'right' ? 'num' : 'center'}"` : ''}>${inline(c || '')}</${t}>`;
        out.push(`<div class="jv-table-wrap"><table class="jv-table jv-striped"><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map(r => '<tr>' + head.map((_, k) => td('td', r[k], k)).join('') + '</tr>').join('')}</tbody></table></div>`);
        continue;
      }
      if (LI.test(l)) {
        const items = [];
        while (i < lines.length && LI.test(lines[i])) {
          const mm = lines[i].match(LI); items.push({ indent: mm[1].replace(/\t/g, '    ').length, ordered: /\d/.test(mm[2]), text: mm[3] }); i++;
        }
        const build = (start, indent) => {
          let k = start; const tag = items[k].ordered ? 'ol' : 'ul'; let html = `<${tag}>`;
          while (k < items.length && items[k].indent === indent) {
            let li = items[k].text, cls = ''; const t = li.match(/^\[( |x|X)\]\s+(.*)/);
            if (t) { li = `<input type="checkbox" disabled ${t[1] !== ' ' ? 'checked' : ''}>${inline(t[2])}`; cls = ' class="task"'; } else li = inline(li);
            k++;
            if (k < items.length && items[k].indent > indent) { const r = build(k, items[k].indent); li += r[0]; k = r[1]; }
            html += `<li${cls}>${li}</li>`;
          }
          return [html + `</${tag}>`, k];
        };
        let k = 0;
        while (k < items.length) { const r = build(k, items[k].indent); out.push(r[0]); if (r[1] === k) k++; else k = r[1]; }
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !(buf.length && (/^(```|#{1,6}\s|\s*>|\s*([-*+]|\d+\.)\s+)/.test(lines[i]) || startsTable(i)))) buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`);
    }
    return out.join('\n');
  }

  /* ───────── HTML sanitizer ───────── */
  const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'noscript', 'template', 'frame', 'frameset', 'audio', 'video', 'foreignobject']);
  const OK_TAGS = new Set('a abbr b blockquote br caption code col colgroup dd del details div dl dt em figure figcaption h1 h2 h3 h4 h5 h6 hr i img kbd li mark ol p pre s small span strong sub summary sup table tbody td tfoot th thead tr u ul button input label select option textarea form progress meter output svg g path rect circle ellipse line polyline polygon text tspan title defs lineargradient stop'.split(' '));
  const OK_ATTR = new Set('class id href src alt title colspan rowspan type name value placeholder checked disabled min max step rows cols for selected open style data-say data-zoom data-cols viewbox d x y cx cy r rx ry width height fill stroke stroke-width stroke-dasharray stroke-linecap stroke-linejoin points x1 x2 y1 y2 transform text-anchor opacity fill-opacity offset stop-color stop-opacity font-size dominant-baseline preserveaspectratio required readonly low high optimum'.split(' '));
  function sanitize(html) {
    const doc = new DOMParser().parseFromString('<body>' + String(html ?? '') + '</body>', 'text/html');
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 8) { ch.remove(); return; }
        if (ch.nodeType !== 1) return;
        const tag = ch.localName.toLowerCase();
        if (DROP.has(tag)) { ch.remove(); return; }
        walk(ch);
        if (!OK_TAGS.has(tag)) { while (ch.firstChild) ch.parentNode.insertBefore(ch.firstChild, ch); ch.remove(); return; }
        Array.from(ch.attributes).forEach(a => {
          const n = a.name.toLowerCase(), v = a.value;
          if (n.startsWith('on') || !OK_ATTR.has(n)) { ch.removeAttribute(a.name); return; }
          if ((n === 'href' || n === 'src') && !safeUrl(v.trim(), tag === 'img')) ch.removeAttribute(a.name);
          if (n === 'style' && /url\s*\(|expression|javascript:|@import|position\s*:\s*(fixed|sticky)/i.test(v)) ch.removeAttribute(a.name);
        });
        if (tag === 'a') { ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener'); }
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

  /* ───────── interactivity binding ───────── */
  /* лайтбокс: клик по картинке с data-zoom, стрелки для переключения внутри галереи */
  function lightbox(img) {
    const scope = img.closest('.jv-gallery') || img.parentNode;
    const list = [...scope.querySelectorAll('img[data-zoom]')]; let i = Math.max(0, list.indexOf(img));
    const ov = el('div', 'jv-lightbox'), big = el('img'), cap = el('div', 'jv-lb-cap');
    ov.append(big, cap);
    const show = () => { big.src = list[i].currentSrc || list[i].src; cap.textContent = list[i].alt || (list[i].closest('figure') && (list[i].closest('figure').querySelector('figcaption') || {}).textContent) || ''; };
    const close = () => { ov.remove(); document.removeEventListener('keydown', key); };
    const go = d => { i = (i + d + list.length) % list.length; show(); };
    const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    if (list.length > 1) {
      const p = el('button', 'jv-lb-prev', '‹'), n = el('button', 'jv-lb-next', '›');
      p.onclick = e => { e.stopPropagation(); go(-1); }; n.onclick = e => { e.stopPropagation(); go(1); }; ov.append(p, n);
    }
    ov.onclick = close; document.addEventListener('keydown', key); show(); document.body.appendChild(ov);
  }

  function bind(root) {
    if (root.__jvBound) return root; root.__jvBound = true;
    root.addEventListener('click', e => {
      const zoom = e.target.closest('img[data-zoom]');
      if (zoom && root.contains(zoom) && !zoom.closest('a')) { lightbox(zoom); return; }
      const say = e.target.closest('[data-say]');
      if (say && root.contains(say)) { e.preventDefault(); fire('action', { say: say.getAttribute('data-say') }); return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) { const pre = cp.closest('.jv-code').querySelector('code'); navigator.clipboard && navigator.clipboard.writeText(pre.textContent); cp.textContent = 'Скопировано ✓'; setTimeout(() => cp.textContent = 'Копировать', 1400); }
    });
    root.addEventListener('submit', e => e.preventDefault());
    return root;
  }
  const mdEl = text => bind(el('div', 'jv jv-md', md(text)));

  /* ═════════════════ BLOCKS ═════════════════ */
  const B = JV.blocks;
  function kids(list, parent, ctx) { arr(list).forEach(b => parent.appendChild(renderBlock(b, ctx))); return parent; }
  function renderBlock(spec, ctx) {
    try {
      if (spec == null) return el('span');
      if (typeof spec === 'string') return el('div', 'jv-md', md(spec));
      if (Array.isArray(spec)) return kids(spec, el('div', 'jv-stack'), ctx);
      const t = spec.type || (spec.blocks ? 'stack' : spec.kind ? 'chart' : spec.columns || spec.rows ? 'table' : spec.fields ? 'form' : spec.text != null ? 'md' : null);
      const fn = B[t];
      if (!fn) return el('div', 'jv-alert jv-warn', `<b>Неизвестный блок: ${esc(t)}</b><div class="jv-hint">Доступно: ${Object.keys(B).map(esc).join(', ')}</div>`);
      return fn(spec, ctx || {});
    } catch (err) {
      console.error('[JV]', err, spec);
      return el('div', 'jv-alert jv-err', `<b>Ошибка блока «${esc(spec && spec.type)}»</b><div>${esc(err.message)}</div>`);
    }
  }
  function render(spec) {
    const root = el('div', 'jv');
    if (Array.isArray(spec)) spec = { blocks: spec };
    if (spec && spec.type && !spec.blocks) spec = { blocks: [spec] };
    spec = spec || {};
    if (spec.title) root.appendChild(el('div', 'jv-title', esc(spec.title)));
    const body = el('div', 'jv-stack'); kids(spec.blocks, body); root.appendChild(body);
    return bind(root);
  }

  /* ── layout ── */
  B.stack = (s, c) => { const e = kids(s.blocks, el('div', 'jv-stack'), c); if (s.gap != null) e.style.setProperty('--jv-gap', s.gap + 'px'); return e; };
  B.row = (s, c) => kids(s.blocks, el('div', 'jv-row'), c);
  B.grid = (s, c) => { const e = kids(s.blocks, el('div', 'jv-grid'), c); if (s.cols) { e.dataset.cols = s.cols; e.style.setProperty('--cols', s.cols); } return e; };
  B.card = (s, c) => {
    const e = el('div', 'jv-card');
    if (s.title || s.subtitle) e.appendChild(el('div', 'jv-card-h', `<span class="jv-card-title">${esc(s.title)}</span><span class="jv-card-sub">${esc(s.subtitle || '')}</span>`));
    kids(s.blocks, e.appendChild(el('div', 'jv-stack')), c);
    if (s.footer) e.appendChild(el('div', 'jv-card-f', inline(s.footer)));
    return e;
  };
  B.tabs = (s, c) => {
    const box = el('div', 'jv-tabs'), bar = el('div', 'jv-tabs-bar'), panes = [];
    arr(s.tabs).forEach((t, i) => {
      const b = el('button', 'jv-tab' + (i === 0 ? ' on' : '')); b.type = 'button'; b.textContent = t.label || 'Вкладка ' + (i + 1);
      const p = kids(t.blocks, el('div', 'jv-stack'), c); p.style.display = i === 0 ? '' : 'none'; panes.push(p);
      b.onclick = () => { bar.querySelectorAll('.jv-tab').forEach((x, k) => { x.classList.toggle('on', k === i); panes[k].style.display = k === i ? '' : 'none'; }); };
      bar.appendChild(b);
    });
    box.appendChild(bar); panes.forEach(p => box.appendChild(p)); return box;
  };
  B.details = (s, c) => {
    const d = el('details', 'jv-details'); if (s.open) d.open = true;
    d.appendChild(el('summary', '', esc(s.summary || s.title || 'Подробнее')));
    kids(s.blocks, d.appendChild(el('div', 'jv-stack')), c); return d;
  };
  B.divider = () => el('hr', 'jv-divider');

  /* ── text ── */
  B.md = s => el('div', 'jv-md', md(s.text ?? s.content ?? ''));
  B.text = B.md;
  B.alert = s => el('div', `jv-alert jv-${lvl(s.level)}`, (s.title ? `<b>${esc(s.title)}</b>` : '') + `<div>${inline(s.text || '')}</div>`);
  B.badges = s => el('div', 'jv-badges', arr(s.items).map(x => typeof x === 'string' ? `<span class="jv-badge">${esc(x)}</span>` : `<span class="jv-badge jv-${lvl(x.variant || x.level)}">${esc(x.text)}</span>`).join(''));
  B.buttons = s => {
    const box = el('div', 'jv-btns');
    arr(s.items).forEach(x => {
      const b = el(x.href ? 'a' : 'button', 'jv-btn' + (x.variant ? ' jv-' + x.variant : '')); b.textContent = x.label || x.say;
      if (x.href && safeUrl(x.href)) { b.href = x.href; b.target = '_blank'; b.rel = 'noopener'; } else { b.type = 'button'; if (x.say) b.setAttribute('data-say', x.say); }
      box.appendChild(b);
    });
    return box;
  };
  /* ── media ── */
  const fail = (url, label) => el('div', 'jv-imgfail', `<div>${label || 'Не удалось загрузить'}<br><span style="opacity:.7">${esc(trunc(url, 80))}</span></div>`);
  function imgEl(src, alt) {
    if (!safeUrl(src, true)) return fail(src, 'Недопустимая ссылка на картинку');
    const i = el('img'); i.alt = alt || ''; i.loading = 'lazy'; i.setAttribute('data-zoom', ''); i.referrerPolicy = 'no-referrer';
    i.addEventListener('error', () => i.replaceWith(fail(src)), { once: true }); i.src = src; return i;
  }
  B.image = s => {
    const f = el('figure', 'jv-figure');
    if (s.width) { f.classList.add('jv-narrow'); f.style.setProperty('--w', (+s.width || 400) + 'px'); }
    const i = imgEl(s.src, s.alt);
    if (s.href && safeUrl(s.href) && i.tagName === 'IMG') { const a = el('a'); a.href = s.href; a.target = '_blank'; a.rel = 'noopener'; a.appendChild(i); f.appendChild(a); } else f.appendChild(i);
    if (s.caption) f.appendChild(el('figcaption', '', esc(s.caption))); return f;
  };
  B.gallery = s => {
    const g = el('div', 'jv-gallery');
    if (s.cols) { g.dataset.cols = s.cols; g.style.setProperty('--cols', s.cols); }
    if (s.ratio) g.style.setProperty('--ratio', String(s.ratio).replace(/\s*[:/]\s*/, ' / '));
    if (s.fit) g.style.setProperty('--fit', s.fit === 'contain' ? 'contain' : 'cover');
    arr(s.items).forEach(x => {
      if (typeof x === 'string') x = { src: x };
      const f = el('figure'); f.appendChild(imgEl(x.src, x.alt || x.caption));
      if (x.caption) f.appendChild(el('figcaption', '', esc(x.caption))); g.appendChild(f);
    });
    return g;
  };
  const mediaWrap = (s, inner) => { const w = el('div', 'jv-media'); if (s.title) w.appendChild(el('div', 'jv-media-title', esc(s.title))); w.appendChild(inner); if (s.caption) w.appendChild(el('div', 'jv-hint', inline(s.caption))); return w; };
  const ratioBox = ratio => { const r = el('div', 'jv-ratio'); if (ratio) r.style.setProperty('--ratio', String(ratio).replace(/\s*[:/]\s*/, ' / ')); return r; };
  B.video = s => {
    if (!safeUrl(s.src)) return el('div', 'jv-alert jv-err', '<b>Недопустимая ссылка на видео</b>');
    const v = el('video', 'jv-video'); v.src = s.src; v.controls = s.controls !== false; v.preload = 'metadata'; v.playsInline = true;
    if (s.poster && safeUrl(s.poster, true)) v.poster = s.poster;
    ['loop', 'muted', 'autoplay'].forEach(k => { if (s[k]) v[k] = true; });
    const w = mediaWrap(s, v); v.addEventListener('error', () => v.replaceWith(fail(s.src, 'Видео не загрузилось')), { once: true }); return w;
  };
  B.audio = s => {
    if (!safeUrl(s.src)) return el('div', 'jv-alert jv-err', '<b>Недопустимая ссылка на аудио</b>');
    const a = el('audio', 'jv-audio'); a.src = s.src; a.controls = true; a.preload = 'metadata'; return mediaWrap(s, a);
  };
  const ytId = v => {
    v = String(v || '').trim();
    const m = v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
    return m ? m[1] : (/^[\w-]{11}$/.test(v) ? v : null);
  };
  const ytStart = s => { if (s.start != null) return Math.max(0, parseInt(s.start, 10) || 0); const t = String(s.url || '').match(/[?&#]t=(\d+)/); return t ? +t[1] : 0; };
  const FRAME_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
  const frame = (src, title) => {
    const f = el('iframe'); f.src = src; f.title = title || 'Встроенный ролик'; f.loading = 'lazy'; f.allow = FRAME_ALLOW; f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin'; f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox'); return f;
  };
  B.youtube = s => {
    const id = ytId(s.id || s.url || s.src);
    if (!id) return el('div', 'jv-alert jv-warn', '<b>YouTube: не удалось определить id видео</b><div class="jv-hint">Передайте "id" (11 символов) или "url".</div>');
    const st = ytStart(s), box = ratioBox(s.ratio);
    const emb = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${st ? '&start=' + st : ''}`;
    const face = el('button', 'jv-yt'); face.type = 'button'; face.setAttribute('aria-label', 'Воспроизвести: ' + (s.title || id));
    face.style.backgroundImage = `url("https://i.ytimg.com/vi/${id}/hqdefault.jpg")`;
    face.innerHTML = '<span class="jv-yt-play"></span>' + (s.title ? `<span class="jv-yt-cap">${esc(s.title)}</span>` : '');
    face.onclick = () => { const f = frame(emb + '&autoplay=1', s.title); face.replaceWith(f); };
    box.appendChild(face);
    const w = el('div', 'jv-media'); w.appendChild(box);
    w.appendChild(el('div', 'jv-media-links', `<a href="https://www.youtube.com/watch?v=${id}${st ? '&t=' + st : ''}" target="_blank" rel="noopener">Открыть на YouTube ↗</a>${s.caption ? `<span>${esc(s.caption)}</span>` : ''}`));
    return w;
  };
  const EMBED_OK = [
    [/^player\.vimeo\.com$/, /^\/video\//], [/^rutube\.ru$/, /^\/play\/embed\//], [/^open\.spotify\.com$/, /^\/embed\//], [/^w\.soundcloud\.com$/, /^\/player/],
    [/^www\.openstreetmap\.org$/, /^\/export\/embed\.html/], [/^www\.google\.com$/, /^\/maps\/embed/], [/^(www\.)?youtube(-nocookie)?\.com$/, /^\/embed\//], [/^vk\.com$/, /^\/video_ext\.php/],
  ];
  B.embed = s => {
    let u; try { u = new URL(String(s.url || '')); } catch { u = null; }
    if (!u || u.protocol !== 'https:' || !EMBED_OK.some(([h, p]) => h.test(u.hostname) && p.test(u.pathname)))
      return el('div', 'jv-alert jv-warn', `<b>Встраивание запрещено для этого адреса</b><div class="jv-hint">Разрешены: YouTube, Vimeo, RuTube, VK Video, Spotify, SoundCloud, OpenStreetMap, Google Maps (embed). Для остальных используйте блок link.</div>`);
    const box = ratioBox(s.ratio || '16:9'); if (s.height) { box.style.aspectRatio = 'auto'; box.style.height = (+s.height || 360) + 'px'; }
    box.appendChild(frame(u.href, s.title)); return mediaWrap({ title: s.title, caption: s.caption }, box);
  };
  B.link = s => {
    const ok = safeUrl(s.url || '') && !/^mailto:|^#/.test(s.url);
    const a = el(ok ? 'a' : 'div', 'jv-linkcard'); if (ok) { a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; }
    let host = ''; try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch {}
    if (s.image && safeUrl(s.image, true)) { const im = el('img'); im.alt = ''; im.loading = 'lazy'; im.referrerPolicy = 'no-referrer'; im.addEventListener('error', () => im.remove(), { once: true }); im.src = s.image; a.appendChild(im); }
    a.appendChild(el('div', '', `<small>${esc(s.site || host)}</small><b>${esc(s.title || s.url)}</b>${s.text ? `<p>${esc(s.text)}</p>` : ''}`));
    return a;
  };
  B.code = s => { const w = el('div', '', codeHtml(s.text ?? s.code ?? '', s.lang || s.title)); return w.firstChild; };
  B.html = s => el('div', 'jv-html', sanitize(s.html));

  /* ── kpi ── */
  function sparkSvg(data, ci) {
    const d = arr(data).map(Number).filter(isFinite); if (d.length < 2) return '';
    const lo = Math.min(...d), hi = Math.max(...d), rng = hi - lo || 1;
    const pts = d.map((v, i) => `${(i / (d.length - 1) * 100).toFixed(1)},${(25 - (v - lo) / rng * 22).toFixed(1)}`);
    return `<svg viewBox="0 0 100 28" preserveAspectRatio="none"><polygon points="0,28 ${pts.join(' ')} 100,28" style="fill:${C(ci)};fill-opacity:.15"/><polyline points="${pts.join(' ')}" fill="none" style="stroke:${C(ci)}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }
  B.stat = s => {
    const d = s.delta; let tr = s.trend;
    if (!tr && d != null) tr = (isNum(d) ? d < 0 : /^\s*[-−–]/.test(String(d))) ? 'down' : 'up';
    const good = tr && ((s.goodWhen || 'up') === tr) ? 'good' : tr ? 'bad' : '';
    return el('div', 'jv-stat',
      `<div class="jv-stat-l">${esc(s.label)}</div>` +
      `<div class="jv-stat-v"${s.color ? ` style="color:${C(s.color)}"` : ''}>${isNum(s.value) ? fnum(s.value) : esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</div>` +
      (d != null ? `<div class="jv-delta ${good}">${tr === 'up' ? '▲' : tr === 'down' ? '▼' : ''} ${esc(d)}</div>` : '') +
      (s.hint ? `<div class="jv-hint">${esc(s.hint)}</div>` : '') +
      (s.spark ? `<div class="jv-spark">${sparkSvg(s.spark, s.sparkColor || 0)}</div>` : ''));
  };
  B.stats = (s, c) => { const g = el('div', 'jv-grid'); if (s.cols) { g.dataset.cols = s.cols; g.style.setProperty('--cols', s.cols); } arr(s.items).forEach(x => g.appendChild(B.stat(x, c))); return g; };

  B.progress = s => {
    const items = s.items || [s]; const box = el('div', 'jv-progress-list');
    items.forEach((x, i) => {
      const max = x.max || 100, pct = Math.max(0, Math.min(100, (+x.value || 0) / max * 100));
      box.appendChild(el('div', 'jv-progress-item', `<div class="jv-progress-top"><span>${esc(x.label || '')}</span><b>${x.text != null ? esc(x.text) : Math.round(pct) + '%'}</b></div><div class="jv-progress"><i style="width:${pct}%;background:${C(x.color != null ? x.color : i)};color:${C(x.color != null ? x.color : i)}"></i></div>${x.hint ? `<div class="jv-hint">${esc(x.hint)}</div>` : ''}`));
    });
    return box;
  };

  B.list = s => {
    const ul = el(s.ordered ? 'ol' : 'ul', 'jv-list');
    arr(s.items).forEach((x, i) => {
      if (typeof x === 'string') x = { title: x };
      const li = el('li', '', (s.ordered ? `<span class="jv-idx">${i + 1}.</span>` : '') + (x.icon ? `<span class="jv-ic">${esc(x.icon)}</span>` : '') +
        `<div class="jv-main"><b>${esc(x.title)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</div>` +
        (x.badge ? `<span class="jv-badge jv-${lvl(x.badgeLevel || x.level)}">${esc(x.badge)}</span>` : '') + (x.value != null ? `<b>${esc(x.value)}</b>` : ''));
      if (x.say) li.setAttribute('data-say', x.say);
      ul.appendChild(li);
    });
    return ul;
  };
  B.kv = s => {
    const dl = el('dl', 'jv-kv');
    arr(s.items).forEach(x => { const [k, v] = Array.isArray(x) ? x : [x.k ?? x.key ?? x.label, x.v ?? x.value]; dl.appendChild(el('dt', '', esc(k))); dl.appendChild(el('dd', '', esc(v))); });
    return dl;
  };
  B.timeline = s => el('ul', 'jv-timeline', arr(s.items).map(x => `<li class="${esc(x.status || '')}">${x.time ? `<time>${esc(x.time)}</time>` : ''}<b>${esc(x.title)}</b>${x.text ? `<p>${inline(x.text)}</p>` : ''}</li>`).join(''));
  B.steps = s => {
    const ic = { done: '✓', run: '●', wait: '○', err: '✕' };
    return el('ul', 'jv-steps', arr(s.items).map(x => { const st = x.status || 'wait'; return `<li class="${st}"><span class="jv-si">${ic[st] || '○'}</span><div>${esc(x.label || x.title)}${x.text ? `<small>${esc(x.text)}</small>` : ''}</div></li>`; }).join(''));
  };
  B.kanban = s => el('div', 'jv-kanban', arr(s.columns).map(col =>
    `<div class="jv-col"><div class="jv-col-h">${esc(col.title)}<span>${arr(col.cards).length}</span></div>` +
    arr(col.cards).map(k => (typeof k === 'string' ? { title: k } : k)).map(k => `<div class="jv-kcard"><div>${esc(k.title)}</div>${k.text ? `<p>${esc(k.text)}</p>` : ''}${k.tag ? `<div><span class="jv-badge jv-${lvl(k.level)}">${esc(k.tag)}</span></div>` : ''}</div>`).join('') + '</div>').join(''));

  /* ── table ── */
  const autoBadge = v => { const t = String(v).toLowerCase(); return /ok|успе|готов|актив|done|online|рабоч|норм|да$|passed/.test(t) ? 'ok' : /warn|ожид|внимани|medium|средн|pending|wait/.test(t) ? 'warn' : /err|ошиб|fail|упал|offline|crit|крит|нет$|high|высок/.test(t) ? 'err' : 'info'; };
  B.table = s => {
    let cols = s.columns, rows = arr(s.rows);
    if (!cols && rows.length && Array.isArray(rows[0])) { cols = rows[0]; rows = rows.slice(1); }
    if (!cols) cols = rows.length ? Object.keys(rows[0]) : [];
    cols = cols.map(c => typeof c === 'string' ? { key: c, label: c } : { label: c.key, ...c });
    rows = rows.map(r => Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c.key, r[i]])) : r);
    cols.forEach(c => { if (!c.type) { const vals = rows.map(r => r[c.key]).filter(v => v != null); if (vals.length && vals.every(isNum)) c.type = 'number'; } });
    const numeric = c => ['number', 'money', 'percent', 'bar'].includes(c.type);
    const st = { key: s.sortBy || null, dir: s.sortDir === 'desc' ? -1 : 1, q: '', page: 0 };
    const pageSize = s.pageSize || 0, wantSearch = s.search != null ? s.search : rows.length > 8;
    const box = el('div', 'jv-table-box'), tb = el('div', 'jv-toolbar');
    const info = el('span', 'jv-hint');
    if (s.title) tb.appendChild(el('span', 'jv-card-title', esc(s.title)));
    tb.appendChild(el('span', 'jv-grow'));
    let inp = null; if (wantSearch) { inp = el('input', 'jv-input'); inp.placeholder = 'Поиск…'; inp.oninput = () => { st.q = inp.value.toLowerCase(); st.page = 0; draw(); }; tb.appendChild(inp); }
    tb.appendChild(info);
    const wrap = el('div', 'jv-table-wrap'), table = el('table', 'jv-table' + (s.striped !== false ? ' jv-striped' : '') + (s.compact ? ' jv-compact' : ''));
    const thead = el('thead'), tbody = el('tbody'), tfoot = el('tfoot'), pager = el('div', 'jv-pager');
    table.append(thead, tbody, tfoot); wrap.appendChild(table);
    const maxOf = c => Math.max(...rows.map(r => +r[c.key] || 0), 1);
    const cell = (c, v) => {
      if (v == null || v === '') return '<span class="jv-muted">—</span>';
      switch (c.type) {
        case 'money': return fnum(v) + ' ' + esc(c.currency || '₽');
        case 'percent': return fnum(v) + '%';
        case 'number': return fnum(v) + (c.unit ? ' ' + esc(c.unit) : '');
        case 'badge': return `<span class="jv-badge jv-${(c.colors && c.colors[v]) ? lvl(c.colors[v]) : autoBadge(v)}">${esc(v)}</span>`;
        case 'bar': { const m = c.max || maxOf(c), p = Math.max(0, Math.min(100, v / m * 100)); return `<div class="jv-cellbar"><div class="jv-progress"><i style="width:${p}%"></i></div><span>${fnum(v)}</span></div>`; }
        case 'link': return safeUrl(String(v)) ? `<a href="${esc(v)}" target="_blank" rel="noopener" style="color:var(--jv-accent-soft)">${esc(c.text || v)}</a>` : esc(v);
        case 'code': return `<code>${esc(v)}</code>`;
        default: return esc(v);
      }
    };
    function draw() {
      thead.innerHTML = ''; const trh = el('tr');
      cols.forEach(c => {
        const th = el('th', (numeric(c) ? 'jv-num ' : '') + (s.sortable !== false ? 'jv-sortable' : ''), esc(c.label));
        if (st.key === c.key) th.setAttribute('aria-sort', st.dir > 0 ? 'ascending' : 'descending');
        if (s.sortable !== false) th.onclick = () => { if (st.key === c.key) st.dir *= -1; else { st.key = c.key; st.dir = 1; } draw(); };
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      let list = rows.filter(r => !st.q || cols.some(c => String(r[c.key] ?? '').toLowerCase().includes(st.q)));
      if (st.key) list = list.slice().sort((a, b) => { const x = a[st.key], y = b[st.key]; return (isNum(x) && isNum(y) ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'ru', { numeric: true })) * st.dir; });
      const total = list.length, pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      st.page = Math.min(st.page, pages - 1);
      const shown = pageSize ? list.slice(st.page * pageSize, st.page * pageSize + pageSize) : list;
      tbody.innerHTML = '';
      if (!shown.length) tbody.innerHTML = `<tr><td colspan="${cols.length}" class="jv-muted jv-center">Ничего не найдено</td></tr>`;
      shown.forEach(r => tbody.appendChild(el('tr', '', cols.map(c => `<td class="${numeric(c) ? 'jv-num' : c.align === 'center' ? 'jv-center' : ''}">${cell(c, r[c.key])}</td>`).join(''))));
      tfoot.innerHTML = '';
      if (s.totals) tfoot.appendChild(el('tr', '', cols.map((c, i) => `<td class="${numeric(c) ? 'jv-num' : ''}">${i === 0 ? 'Итого' : (['number', 'money', 'percent'].includes(c.type) ? cell(c, list.reduce((a, r) => a + (+r[c.key] || 0), 0)) : '')}</td>`).join('')));
      info.textContent = total === rows.length ? `${total} строк` : `${total} из ${rows.length}`;
      pager.innerHTML = '';
      if (pages > 1) {
        const prev = el('button', 'jv-btn jv-ghost', '‹'), next = el('button', 'jv-btn jv-ghost', '›'); prev.type = next.type = 'button';
        prev.disabled = st.page === 0; next.disabled = st.page >= pages - 1;
        prev.onclick = () => { st.page--; draw(); }; next.onclick = () => { st.page++; draw(); };
        pager.append(prev, el('span', '', `${st.page + 1} / ${pages}`), next);
      }
    }
    draw(); box.append(tb, wrap, pager);
    if (s.caption) box.appendChild(el('div', 'jv-hint', inline(s.caption)));
    return box;
  };

  /* ── form ── */
  const normOpt = o => (o && typeof o === 'object') ? { value: o.value ?? o.label, label: o.label ?? o.value } : { value: o, label: o };
  function fieldEl(fd, idx) {
    const type = fd.type || 'text', name = fd.name || ('field' + idx);
    const wrap = el('div', 'jv-field'); if (fd.span) wrap.style.gridColumn = 'span ' + fd.span;
    const label = `<label class="jv-label">${esc(fd.label || name)}${fd.required ? '<i class="jv-req">*</i>' : ''}</label>`;
    const help = fd.help ? `<div class="jv-hint">${esc(fd.help)}</div>` : '';
    let get, input, validate = () => true, inlineLabel = false;
    const opts = arr(fd.options).map(normOpt);
    if (type === 'textarea') { input = el('textarea', 'jv-textarea'); input.rows = fd.rows || 3; input.value = fd.value ?? ''; input.placeholder = fd.placeholder || ''; get = () => input.value; }
    else if (type === 'select') {
      input = el('select', 'jv-select'); if (fd.placeholder) input.appendChild(new Option(fd.placeholder, '')); opts.forEach(o => input.appendChild(new Option(o.label, o.value)));
      if (fd.value != null) input.value = fd.value; get = () => input.value;
    } else if (type === 'radio') {
      input = el('div', 'jv-options'); const g = 'r' + Math.random().toString(36).slice(2);
      opts.forEach(o => { const l = el('label', 'jv-check'); const r = el('input'); r.type = 'radio'; r.name = g; r.value = o.value; r.checked = o.value === fd.value; l.append(r, document.createTextNode(o.label)); input.appendChild(l); });
      get = () => { const r = input.querySelector('input:checked'); return r ? r.value : ''; }; validate = () => !fd.required || !!get();
    } else if (type === 'checkboxes') {
      input = el('div', 'jv-options'); const init = arr(fd.value);
      opts.forEach(o => { const l = el('label', 'jv-check'); const r = el('input'); r.type = 'checkbox'; r.value = o.value; r.checked = init.includes(o.value); l.append(r, document.createTextNode(o.label)); input.appendChild(l); });
      get = () => [...input.querySelectorAll('input:checked')].map(i => i.value); validate = () => !fd.required || get().length > 0;
    } else if (type === 'checkbox' || type === 'switch') {
      const l = el('label', type === 'switch' ? 'jv-switch' : 'jv-check'); input = el('input'); input.type = 'checkbox'; input.checked = !!fd.value;
      l.append(input, document.createTextNode(fd.label || name)); inlineLabel = true; get = () => input.checked; wrap.appendChild(l); input = l;
      validate = () => !fd.required || get();
    } else if (type === 'range') {
      const box = el('div', 'jv-rangebox'); const r = el('input', 'jv-range'); r.type = 'range'; r.min = fd.min ?? 0; r.max = fd.max ?? 100; r.step = fd.step ?? 1; r.value = fd.value ?? r.min; r.style.flex = '1';
      const out = el('output', '', esc(r.value + (fd.unit || ''))); r.oninput = () => out.textContent = r.value + (fd.unit || ''); box.append(r, out); input = box; get = () => +r.value;
    } else if (type === 'rating') {
      input = el('div', 'jv-rating'); let v = +fd.value || 0; const max = fd.max || 5;
      const paint = () => [...input.children].forEach((b, i) => b.classList.toggle('on', i < v));
      for (let i = 1; i <= max; i++) { const b = el('button', '', '★'); b.type = 'button'; b.onclick = () => { v = (v === i ? 0 : i); paint(); wrap.classList.remove('jv-invalid'); }; input.appendChild(b); }
      paint(); get = () => v; validate = () => !fd.required || v > 0;
    } else {
      input = el('input', 'jv-input'); input.type = type; input.placeholder = fd.placeholder || '';
      if (fd.value != null) input.value = fd.value; ['min', 'max', 'step', 'pattern', 'maxlength'].forEach(k => fd[k] != null && input.setAttribute(k, fd[k]));
      get = () => type === 'number' ? (input.value === '' ? null : +input.value) : input.value;
    }
    if (fd.required && input.setAttribute && ['INPUT', 'SELECT', 'TEXTAREA'].includes(input.tagName) && !['checkbox', 'radio'].includes(input.type)) input.required = true;
    if (fd.disabled && input.setAttribute) input.disabled = true;
    if (!inlineLabel) wrap.insertAdjacentHTML('beforeend', label);
    if (!inlineLabel) wrap.appendChild(input);
    if (help) wrap.insertAdjacentHTML('beforeend', help);
    return { node: wrap, name, get, validate };
  }
  B.form = s => {
    const f = el('form', 'jv-form'), fields = arr(s.fields).map(fieldEl);
    if (s.title) f.appendChild(el('div', 'jv-card-title', esc(s.title)));
    if (s.description) f.appendChild(el('div', 'jv-hint', inline(s.description)));
    const grid = el('div', 'jv-fields'); grid.style.setProperty('--cols', s.cols || 1); fields.forEach(x => grid.appendChild(x.node)); f.appendChild(grid);
    const act = el('div', 'jv-actions'), ok = el('button', 'jv-btn'); ok.type = 'submit'; ok.textContent = s.submit || 'Отправить'; act.appendChild(ok);
    if (s.reset) { const r = el('button', 'jv-btn jv-ghost'); r.type = 'reset'; r.textContent = typeof s.reset === 'string' ? s.reset : 'Сбросить'; act.appendChild(r); }
    f.appendChild(act); const res = el('div', 'jv-result'); f.appendChild(res);
    f.addEventListener('submit', ev => {
      ev.preventDefault(); let bad = false;
      fields.forEach(x => { const okv = x.validate(); x.node.classList.toggle('jv-invalid', !okv); if (!okv) bad = true; });
      if (bad) { res.innerHTML = '<div class="jv-alert jv-err">Заполните обязательные поля</div>'; return; }
      const values = {}; fields.forEach(x => values[x.name] = x.get());
      res.innerHTML = `<div class="jv-alert jv-ok"><b>${esc(s.successText || 'Отправлено')}</b><div class="jv-hint">${esc(JSON.stringify(values))}</div></div>`;
      fire('submit', { id: s.id || s.title || 'form', title: s.title, values });
    });
    return f;
  };

  /* ═════════════════ CHARTS ═════════════════ */
  function niceScale(min, max, n, zero) {
    if (zero !== false) { min = Math.min(0, min); max = Math.max(0, max); }
    if (min === max) max = min + 1;
    const raw = (max - min) / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step, ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toPrecision(12));
    return { lo, hi, ticks };
  }
  function normalize(s) {
    let labels = arr(s.labels), series;
    if (s.series) series = arr(s.series).map((x, i) => Array.isArray(x) ? { name: 'Серия ' + (i + 1), data: x } : x);
    else if (s.data && s.data.length && typeof s.data[0] === 'object' && !Array.isArray(s.data[0]) && ('value' in s.data[0])) { labels = s.data.map(d => d.label); series = [{ name: s.name || s.title || 'Значение', data: s.data.map(d => d.value) }]; }
    else series = [{ name: s.name || s.title || 'Значение', data: arr(s.data) }];
    if (!labels.length && series[0]) labels = series[0].data.map((_, i) => String(i + 1));
    return { labels, series };
  }
  const tip = (label, name, v, unit) => `<title>${esc(label)}${name ? ' · ' + esc(name) : ''}: ${nf.format(v)}${unit ? ' ' + esc(unit) : ''}</title>`;
  const every = (L, pw, w) => Math.max(1, Math.ceil(L / Math.max(1, Math.floor(pw / w))));
  const legendHtml = (items) => `<div class="jv-legend">${items.map(x => `<span><i style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}</div>`;
  const yAxis = (sc, y, m, W) => sc.ticks.map(t => `<line class="jv-gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 6}" y="${y(t) + 3}" text-anchor="end">${short(t)}</text>`).join('');

  const CH = JV.charts;
  CH.bar = (n, o) => {
    const W = 600, H = o.height || 280, m = { l: 46, r: 12, t: 12, b: 30 }, pw = W - m.l - m.r, ph = H - m.t - m.b, L = n.labels.length, S = n.series.length, stk = !!o.stacked;
    let max = -Infinity, min = Infinity;
    for (let i = 0; i < L; i++) {
      if (stk) { let p = 0, q = 0; n.series.forEach(s => { const v = +s.data[i] || 0; v >= 0 ? p += v : q += v; }); max = Math.max(max, p); min = Math.min(min, q); }
      else n.series.forEach(s => { const v = +s.data[i] || 0; max = Math.max(max, v); min = Math.min(min, v); });
    }
    const sc = niceScale(min, max, 5, true), y = v => m.t + ph * (1 - (v - sc.lo) / (sc.hi - sc.lo));
    let g = yAxis(sc, y, m, W); const band = pw / L, gw = band * .72, bw = stk ? gw : gw / S, k = every(L, pw, 56);
    for (let i = 0; i < L; i++) {
      const x0 = m.l + band * i + (band - gw) / 2; let pos = 0, neg = 0;
      if (i % k === 0) g += `<text x="${x0 + gw / 2}" y="${H - 10}" text-anchor="middle">${esc(trunc(n.labels[i], 10))}</text>`;
      n.series.forEach((s, si) => {
        const v = +s.data[i] || 0; let ya, yb;
        if (stk) { const base = v >= 0 ? pos : neg; ya = y(base + v); yb = y(base); v >= 0 ? pos += v : neg += v; } else { ya = y(v); yb = y(0); }
        const x = stk ? x0 : x0 + si * bw + 1;
        g += `<rect class="jv-bar" x="${x}" y="${Math.min(ya, yb)}" width="${Math.max(1, (stk ? bw : bw - 2))}" height="${Math.max(1, Math.abs(yb - ya))}" rx="3" style="fill:${s.color != null ? C(s.color) : C(si)}">${tip(n.labels[i], s.name, v, o.unit)}</rect>`;
      });
    }
    g += `<line class="jv-axisline" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    return { svg: `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`, legend: S > 1 ? n.series.map((s, i) => ({ name: s.name, color: C(i) })) : null };
  };
  CH.hbar = (n, o) => {
    const L = n.labels.length, S = n.series.length, W = 600, ml = Math.min(150, Math.max(60, Math.max(...n.labels.map(l => String(l).length)) * 6.2 + 10)), m = { l: ml, r: 56, t: 6, b: 6 };
    const rowH = S * 16 + 12, H = o.height || (m.t + m.b + L * rowH), pw = W - m.l - m.r;
    let max = 0; n.series.forEach(s => s.data.forEach(v => max = Math.max(max, +v || 0)));
    const sc = niceScale(0, max, 5, true); let g = '';
    sc.ticks.forEach(t => { const x = m.l + pw * (t - sc.lo) / (sc.hi - sc.lo); g += `<line class="jv-gridline" x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}"/>`; });
    for (let i = 0; i < L; i++) {
      const y0 = m.t + i * rowH + 6; g += `<text x="${m.l - 8}" y="${y0 + (S * 16) / 2 + 3}" text-anchor="end">${esc(trunc(n.labels[i], 22))}</text>`;
      n.series.forEach((s, si) => {
        const v = +s.data[i] || 0, w = pw * v / (sc.hi - sc.lo);
        g += `<rect class="jv-bar" x="${m.l}" y="${y0 + si * 16}" width="${Math.max(1, w)}" height="13" rx="3" style="fill:${C(S > 1 ? si : (o.color != null ? o.color : 0))}">${tip(n.labels[i], s.name, v, o.unit)}</rect><text class="jv-val" x="${m.l + w + 6}" y="${y0 + si * 16 + 10}">${short(v)}${o.unit ? ' ' + esc(o.unit) : ''}</text>`;
      });
    }
    return { svg: `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`, legend: S > 1 ? n.series.map((s, i) => ({ name: s.name, color: C(i) })) : null };
  };
  const smoothPath = pts => {
    if (pts.length < 3) return 'M' + pts.map(p => p.join(',')).join('L');
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
  };
  const lineChart = (n, o, area) => {
    const W = 600, H = o.height || 280, m = { l: 46, r: 14, t: 12, b: 30 }, pw = W - m.l - m.r, ph = H - m.t - m.b, L = n.labels.length;
    let max = -Infinity, min = Infinity; n.series.forEach(s => s.data.forEach(v => { v = +v; if (isFinite(v)) { max = Math.max(max, v); min = Math.min(min, v); } }));
    const zero = o.zero != null ? o.zero : !!area, sc = niceScale(min, max, 5, zero), y = v => m.t + ph * (1 - (v - sc.lo) / (sc.hi - sc.lo)), x = i => m.l + (L > 1 ? pw * i / (L - 1) : pw / 2);
    let g = yAxis(sc, y, m, W); const k = every(L, pw, 52);
    for (let i = 0; i < L; i += k) g += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(trunc(n.labels[i], 10))}</text>`;
    n.series.forEach((s, si) => {
      const col = C(s.color != null ? s.color : si), pts = s.data.map((v, i) => [+x(i).toFixed(1), +y(+v).toFixed(1)]);
      const d = o.smooth ? smoothPath(pts) : 'M' + pts.map(p => p.join(',')).join('L');
      if (area) g += `<path d="${d}L${pts[pts.length - 1][0]},${y(Math.max(sc.lo, 0))}L${pts[0][0]},${y(Math.max(sc.lo, 0))}Z" style="fill:${col};fill-opacity:.16"/>`;
      g += `<path d="${d}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" style="stroke:${col}"/>`;
      if (L <= 60) pts.forEach((p, i) => g += `<circle class="jv-dot" cx="${p[0]}" cy="${p[1]}" r="3" style="fill:#07131f;stroke:${col}" stroke-width="2">${tip(n.labels[i], s.name, s.data[i], o.unit)}</circle>`);
    });
    return { svg: `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`, legend: n.series.length > 1 ? n.series.map((s, i) => ({ name: s.name, color: C(s.color != null ? s.color : i) })) : null };
  };
  CH.line = (n, o) => lineChart(n, o, false);
  CH.area = (n, o) => lineChart(n, o, true);

  const pieChart = (n, o, donut) => {
    const data = n.series[0].data.map(v => Math.max(0, +v || 0)), total = data.reduce((a, b) => a + b, 0) || 1;
    const cx = 120, cy = 120, R = 112, r = donut ? 68 : 0; let a0 = -Math.PI / 2, g = '';
    const pt = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
    data.forEach((v, i) => {
      if (!v) return; const a1 = a0 + v / total * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0; let d;
      if (v / total > .9999) d = donut ? `M${cx},${cy - R}A${R},${R} 0 1 1 ${cx - .01},${cy - R}ZM${cx},${cy - r}A${r},${r} 0 1 0 ${cx - .01},${cy - r}Z` : `M${cx},${cy - R}A${R},${R} 0 1 1 ${cx - .01},${cy - R}Z`;
      else d = donut ? `M${pt(R, a0)}A${R},${R} 0 ${big} 1 ${pt(R, a1)}L${pt(r, a1)}A${r},${r} 0 ${big} 0 ${pt(r, a0)}Z` : `M${cx},${cy}L${pt(R, a0)}A${R},${R} 0 ${big} 1 ${pt(R, a1)}Z`;
      g += `<path class="jv-slice" d="${d}" fill-rule="evenodd" stroke="#07131f" stroke-width="2" style="fill:${C(i)}">${tip(n.labels[i], '', v, o.unit)}</path>`; a0 = a1;
    });
    if (donut) g += `<text class="jv-big" x="${cx}" y="${cy + 2}" text-anchor="middle">${esc(o.center != null ? o.center : short(total))}</text><text x="${cx}" y="${cy + 18}" text-anchor="middle">${esc(o.centerLabel || 'всего')}</text>`;
    const leg = data.map((v, i) => `<div><span><i style="background:${C(i)}"></i>${esc(n.labels[i])}</span><b>${nf.format(v)}${o.unit ? ' ' + esc(o.unit) : ''}</b><em>${Math.round(v / total * 100)}%</em></div>`).join('');
    return { pie: true, svg: `<svg viewBox="0 0 240 240">${g}</svg>`, legendHtml: `<div class="jv-legend">${leg}</div>` };
  };
  CH.pie = (n, o) => pieChart(n, o, false);
  CH.donut = (n, o) => pieChart(n, o, true);

  CH.scatter = (n, o) => {
    const W = 600, H = o.height || 300, m = { l: 46, r: 14, t: 12, b: 34 }, pw = W - m.l - m.r, ph = H - m.t - m.b;
    const series = n.series.map(s => ({ ...s, pts: s.data.map(p => Array.isArray(p) ? { x: +p[0], y: +p[1], r: p[2] } : { x: +p.x, y: +p.y, r: p.r, label: p.label }) }));
    const xs = series.flatMap(s => s.pts.map(p => p.x)), ys = series.flatMap(s => s.pts.map(p => p.y));
    const sx = niceScale(Math.min(...xs), Math.max(...xs), 6, false), sy = niceScale(Math.min(...ys), Math.max(...ys), 5, false);
    const X = v => m.l + pw * (v - sx.lo) / (sx.hi - sx.lo), Y = v => m.t + ph * (1 - (v - sy.lo) / (sy.hi - sy.lo));
    let g = yAxis(sy, Y, m, W);
    sx.ticks.forEach(t => g += `<line class="jv-gridline" x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}"/><text x="${X(t)}" y="${H - m.b + 14}" text-anchor="middle">${short(t)}</text>`);
    if (o.xLabel) g += `<text x="${m.l + pw / 2}" y="${H - 2}" text-anchor="middle">${esc(o.xLabel)}</text>`;
    if (o.yLabel) g += `<text x="10" y="${m.t + 8}" text-anchor="start">${esc(o.yLabel)}</text>`;
    series.forEach((s, si) => s.pts.forEach(p => g += `<circle class="jv-dot" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.r || 5}" style="fill:${C(si)};fill-opacity:.55;stroke:${C(si)}" stroke-width="1.5">${tip(p.label || `${nf.format(p.x)} ; ${nf.format(p.y)}`, s.name, p.y, o.unit)}</circle>`));
    return { svg: `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`, legend: series.length > 1 ? series.map((s, i) => ({ name: s.name, color: C(i) })) : null };
  };

  CH.radar = (n, o) => {
    const W = 360, H = o.height || 300, cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 44, L = n.labels.length;
    let max = o.max || 0; if (!max) n.series.forEach(s => s.data.forEach(v => max = Math.max(max, +v || 0))); max = niceScale(0, max, 4, true).hi;
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / L, P = (i, v) => [cx + R * (v / max) * Math.cos(ang(i)), cy + R * (v / max) * Math.sin(ang(i))];
    let g = '';
    for (let k = 1; k <= 4; k++) g += `<polygon points="${n.labels.map((_, i) => P(i, max * k / 4).map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" class="jv-gridline"/>`;
    n.labels.forEach((l, i) => { const [x, y] = P(i, max), [lx, ly] = P(i, max * 1.17); g += `<line class="jv-gridline" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text x="${lx}" y="${ly + 3}" text-anchor="${Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'}">${esc(trunc(l, 14))}</text>`; });
    n.series.forEach((s, si) => {
      const pts = s.data.map((v, i) => P(i, +v || 0)); const col = C(si);
      g += `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" style="fill:${col};fill-opacity:.18;stroke:${col}" stroke-width="2"/>`;
      pts.forEach((p, i) => g += `<circle class="jv-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" style="fill:${col}">${tip(n.labels[i], s.name, s.data[i], o.unit)}</circle>`);
    });
    return { svg: `<svg viewBox="0 0 ${W} ${H}" style="max-width:420px;margin:0 auto">${g}</svg>`, legend: n.series.length > 1 ? n.series.map((s, i) => ({ name: s.name, color: C(i) })) : null };
  };

  CH.heatmap = (n, o) => {
    const rows = arr(o.rows), cols = arr(o.cols), M = o.matrix || [], W = 600, ml = Math.min(110, Math.max(30, Math.max(...rows.map(r => String(r).length)) * 6.5 + 10)), m = { l: ml, r: 8, t: 22, b: 8 };
    const cw = (W - m.l - m.r) / cols.length, ch = Math.min(34, Math.max(20, cw * .8)), H = m.t + m.b + rows.length * ch;
    const flat = M.flat().map(Number); const lo = o.min != null ? o.min : Math.min(...flat), hi = o.max != null ? o.max : Math.max(...flat), col = C(o.color || 0); let g = '';
    cols.forEach((c, j) => g += `<text x="${m.l + cw * j + cw / 2}" y="${m.t - 8}" text-anchor="middle">${esc(trunc(c, 8))}</text>`);
    rows.forEach((r, i) => {
      g += `<text x="${m.l - 8}" y="${m.t + ch * i + ch / 2 + 3}" text-anchor="end">${esc(r)}</text>`;
      cols.forEach((c, j) => { const v = +(M[i] || [])[j] || 0, t = hi === lo ? 1 : (v - lo) / (hi - lo);
        g += `<rect class="jv-cell" x="${m.l + cw * j + 1}" y="${m.t + ch * i + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" style="fill:${col};fill-opacity:${(.06 + .94 * t).toFixed(2)}">${tip(r + ' / ' + c, '', v, o.unit)}</rect>`;
        if (o.values && cw > 34) g += `<text class="${t > .55 ? 'jv-in' : 'jv-val'}" x="${m.l + cw * j + cw / 2}" y="${m.t + ch * i + ch / 2 + 3}" text-anchor="middle">${short(v)}</text>`; });
    });
    return { svg: `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`, legend: null, note: `<div class="jv-hint" style="margin-top:6px">от ${nf.format(lo)} до ${nf.format(hi)}${o.unit ? ' ' + esc(o.unit) : ''}</div>` };
  };

  CH.gauge = (n, o) => {
    const max = o.max || 100, v = +(o.value ?? n.series[0].data[0]) || 0, p = Math.max(0, Math.min(1, v / max)), cx = 120, cy = 110, R = 90;
    const pt = a => `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`, a1 = Math.PI + p * Math.PI;
    const bands = o.bands || [{ to: .6, color: 2 }, { to: .85, color: 5 }, { to: 1, color: 1 }]; // c3 зелёный, c6 жёлтый, c2 оранж
    const auto = o.color != null ? o.color : (bands.find(b => p <= b.to) || bands[bands.length - 1]).color;
    const col = o.invert ? C((bands.slice().reverse().find(b => (1 - p) <= b.to) || bands[0]).color) : C(auto);
    const g = `<path d="M${pt(Math.PI)}A${R},${R} 0 0 1 ${pt(2 * Math.PI)}" fill="none" stroke-width="16" stroke-linecap="round" style="stroke:var(--jv-surface2)"/>` +
      (p > 0 ? `<path d="M${pt(Math.PI)}A${R},${R} 0 0 1 ${pt(a1)}" fill="none" stroke-width="16" stroke-linecap="round" style="stroke:${col}"/>` : '') +
      `<text class="jv-big" x="${cx}" y="${cy - 6}" text-anchor="middle">${nf.format(v)}${esc(o.unit || '')}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle">${esc(o.label || '')}</text><text x="${cx - R}" y="${cy + 26}" text-anchor="middle">0</text><text x="${cx + R}" y="${cy + 26}" text-anchor="middle">${short(max)}</text>`;
    return { svg: `<svg viewBox="0 0 240 140">${g}</svg>`, legend: null, cls: 'jv-gauge' };
  };

  CH.funnel = (n, o) => {
    const data = n.series[0].data.map(Number), L = data.length, W = 600, rowH = 42, H = L * rowH, max = Math.max(...data) || 1; let g = '';
    data.forEach((v, i) => {
      const w = Math.max(40, (W - 20) * v / max), x = (W - w) / 2;
      g += `<rect class="jv-bar" x="${x}" y="${i * rowH + 3}" width="${w}" height="${rowH - 8}" rx="6" style="fill:${C(i)};fill-opacity:.85">${tip(n.labels[i], '', v, o.unit)}</rect><text class="jv-in" x="${W / 2}" y="${i * rowH + rowH / 2 + 1}" text-anchor="middle" style="font-size:12px">${esc(n.labels[i])} · ${nf.format(v)}${i ? ' (' + Math.round(v / data[0] * 100) + '%)' : ''}</text>`;
    });
    return { svg: `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`, legend: null };
  };

  B.chart = s => {
    const kind = s.kind || 'bar', fn = CH[kind];
    if (!fn) return el('div', 'jv-alert jv-warn', `<b>Неизвестный график: ${esc(kind)}</b><div class="jv-hint">Доступно: ${Object.keys(CH).join(', ')}</div>`);
    const box = el('div', 'jv-chart');
    if (s.title) box.appendChild(el('div', 'jv-chart-title', esc(s.title) + (s.subtitle ? `<span>${esc(s.subtitle)}</span>` : '')));
    const r = fn(normalize(s), s);
    if (r.pie) { const p = el('div', 'jv-pie', r.svg + r.legendHtml); box.appendChild(p); }
    else { const w = el('div', r.cls || '', r.svg); box.appendChild(w); if (r.legend) box.insertAdjacentHTML('beforeend', legendHtml(r.legend)); if (r.note) box.insertAdjacentHTML('beforeend', r.note); }
    return box;
  };

  /* ═════════════════ extract / schema / prompt ═════════════════ */
  function extract(text) {
    const blocks = []; let ok = true;
    const clean = String(text ?? '').replace(/```jv\s*\n([\s\S]*?)```/g, (_, j) => {
      try { const o = JSON.parse(j); Array.isArray(o) ? blocks.push(...o) : (o.blocks ? blocks.push(...(o.title ? [{ type: 'md', text: '### ' + o.title }] : []), ...o.blocks) : blocks.push(o)); } catch (e) { ok = false; blocks.push({ type: 'alert', level: 'err', title: 'Некорректный JSON в блоке jv', text: e.message }); }
      return '';
    }).trim();
    return { text: clean, ui: blocks.length ? { blocks } : null, ok };
  }

  JV.schema = [
    { type: 'md', group: 'Текст', desc: 'Markdown: заголовки, списки, таблицы, код, цитаты, [ ] задачи', props: 'text' },
    { type: 'alert', group: 'Текст', desc: 'Плашка со статусом', props: 'level(info|ok|warn|err), title?, text' },
    { type: 'badges', group: 'Текст', desc: 'Ряд меток', props: 'items:[текст | {text, variant}]' },
    { type: 'buttons', group: 'Действия', desc: 'Кнопки; клик отправляет фразу ассистенту', props: 'items:[{label, say, variant?(ghost|danger|ok), href?}]' },
    { type: 'stat', group: 'Данные', desc: 'KPI-карточка с дельтой и мини-графиком', props: 'label, value, unit?, delta?, goodWhen?(up|down), hint?, spark?:[чисел]' },
    { type: 'stats', group: 'Данные', desc: 'Сетка KPI-карточек', props: 'items:[stat…], cols?' },
    { type: 'table', group: 'Данные', desc: 'Таблица: сортировка, поиск, страницы, итоги', props: 'columns:[строка | {key,label,type(number|money|percent|badge|bar|link|code),currency?,max?,colors?}], rows:[объекты | массивы], title?, search?, pageSize?, totals?, sortBy?, sortDir?, compact?' },
    { type: 'chart', group: 'Графики', desc: 'SVG-график. kind: bar, hbar, line, area, pie, donut, scatter, radar, heatmap, gauge, funnel', props: 'kind, title?, labels, series:[{name,data:[…]}] | data:[{label,value}], unit?, stacked?(bar), smooth?(line), height?; heatmap: rows, cols, matrix, values?; gauge: value, max, label; scatter: series data:[[x,y]], xLabel?, yLabel?' },
    { type: 'progress', group: 'Данные', desc: 'Полосы прогресса', props: 'items:[{label, value, max?, text?, hint?}]' },
    { type: 'form', group: 'Ввод', desc: 'Форма. При отправке ассистент получает значения', props: 'id, title?, description?, fields:[{name,label,type,options?,value?,required?,help?,span?}], cols?(1|2|3), submit?, reset?' },
    { type: 'list', group: 'Данные', desc: 'Список с иконками, бейджами и кликом', props: 'items:[строка | {title, sub?, icon?, badge?, value?, say?}], ordered?' },
    { type: 'kv', group: 'Данные', desc: 'Пары «ключ — значение»', props: 'items:[[ключ, значение]]' },
    { type: 'timeline', group: 'Данные', desc: 'Хронология', props: 'items:[{time?, title, text?, status?(ok|now|todo)}]' },
    { type: 'steps', group: 'Данные', desc: 'Шаги/прогресс работы агента', props: 'items:[{label, text?, status(done|run|wait|err)}]' },
    { type: 'kanban', group: 'Данные', desc: 'Колонки с карточками', props: 'columns:[{title, cards:[строка | {title,text?,tag?,level?}]}]' },
    { type: 'code', group: 'Текст', desc: 'Блок кода с кнопкой копирования', props: 'text, lang?' },
    { type: 'image', group: 'Медиа', desc: 'Картинка; клик открывает на весь экран', props: 'src, alt?, caption?, width?(px), href?' },
    { type: 'gallery', group: 'Медиа', desc: 'Сетка картинок с просмотром на весь экран и стрелками', props: 'items:[url | {src, caption?}], cols?, ratio?("4:3"|"1:1"|"16:9"), fit?(cover|contain)' },
    { type: 'youtube', group: 'Медиа', desc: 'Видео YouTube (плеер загружается по клику)', props: 'id | url, title?, start?(сек), caption?' },
    { type: 'video', group: 'Медиа', desc: 'Видеофайл mp4/webm по ссылке', props: 'src, poster?, title?, caption?, loop?, muted?, autoplay?' },
    { type: 'audio', group: 'Медиа', desc: 'Аудиоплеер', props: 'src, title?' },
    { type: 'embed', group: 'Медиа', desc: 'Встраивание: Vimeo, RuTube, VK Video, Spotify, SoundCloud, OpenStreetMap, Google Maps (только https embed-ссылки)', props: 'url, title?, ratio?("16:9"), height?(px)' },
    { type: 'link', group: 'Медиа', desc: 'Карточка-превью ссылки', props: 'url, title, text?, image?, site?' },
    { type: 'card', group: 'Компоновка', desc: 'Карточка с заголовком, внутри блоки', props: 'title?, subtitle?, blocks, footer?' },
    { type: 'grid', group: 'Компоновка', desc: 'Сетка колонок', props: 'cols?(1-6), blocks' },
    { type: 'row', group: 'Компоновка', desc: 'Горизонтальный ряд, переносится', props: 'blocks' },
    { type: 'stack', group: 'Компоновка', desc: 'Вертикальный стек', props: 'blocks, gap?' },
    { type: 'tabs', group: 'Компоновка', desc: 'Вкладки', props: 'tabs:[{label, blocks}]' },
    { type: 'details', group: 'Компоновка', desc: 'Раскрывающийся блок', props: 'summary, open?, blocks' },
    { type: 'divider', group: 'Компоновка', desc: 'Разделитель', props: '' },
    { type: 'html', group: 'Свободная вёрстка', desc: 'Свой HTML с классами jv-* (очищается от скриптов; data-say="фраза" — клик)', props: 'html' },
  ];

  JV.classes = [
    ['jv', 'корневой контейнер (обязателен)'], ['jv-stack / jv-row / jv-grid', 'раскладка; у grid задай style="--cols:3" и data-cols="3"'],
    ['jv-card', 'карточка; внутри jv-card-h > jv-card-title + jv-card-sub'], ['jv-stat', 'KPI: jv-stat-l, jv-stat-v, jv-delta(.good/.bad), jv-hint'],
    ['jv-badge', 'метка; + jv-ok | jv-warn | jv-err | jv-muted'], ['jv-btn', 'кнопка; + jv-ghost | jv-danger | jv-ok; data-say="фраза" отправит команду'],
    ['jv-alert', 'плашка; + jv-ok | jv-warn | jv-err; внутри <b>заголовок</b>'], ['jv-progress', 'полоса: <div class="jv-progress"><i style="width:60%"></i></div>'],
    ['jv-table-wrap > jv-table', 'таблица; + jv-striped, jv-compact; ячейки чисел — класс jv-num'],
    ['jv-form / jv-fields / jv-field', 'форма; jv-label, jv-input, jv-select, jv-textarea, jv-check, jv-switch'],
    ['jv-md', 'типографика для markdown-HTML'], ['jv-code', 'блок кода (jv-code-h + pre>code)'], ['jv-list / jv-kv / jv-timeline / jv-steps / jv-kanban', 'структуры данных'],
    ['jv-chart / jv-legend / jv-gridline', 'контейнер SVG-графика и его элементы'],
    ['jv-gallery', 'сетка картинок: <div class="jv-gallery"><figure><img data-zoom src="…"></figure>…</div>; img[data-zoom] открывается на весь экран'],
    ['jv-ratio', 'контейнер с пропорцией (по умолчанию 16/9) для video/iframe; --ratio: 4 / 3'], ['jv-video / jv-audio', 'нативные плееры'], ['jv-linkcard', 'карточка ссылки: <a class="jv-linkcard" href>[img]<div><small/><b/><p/></div></a>'],
    ['--jv-c1 … --jv-c8', 'палитра серий: style="fill:var(--jv-c2)"'], ['--jv-ok / warn / err / info / muted / accent', 'цвета статусов'],
  ];

  function prompt() {
    const sch = JV.schema.map(b => `• ${b.type} — ${b.desc}${b.props ? `\n    поля: ${b.props}` : ''}`).join('\n');
    return `Ты — голосовой ассистент Джарвис. Когда ответ лучше показать, чем сказать (таблица, график, форма, отчёт, список), добавь в ответ блок кода с языком "jv" — внутри валидный JSON. Текст вне блока — короткий комментарий (поддерживает markdown).

Формат:
\`\`\`jv
{ "title": "Заголовок (необязательно)", "blocks": [ …блоки… ] }
\`\`\`

Блоки (у каждого поле "type"):
${sch}

Правила:
1. Только валидный JSON: двойные кавычки, без комментариев и хвостовых запятых. Числа — числами, не строками.
2. Для данных, найденных инструментами, сначала дай stats (главные цифры), затем chart или table, в конце alert/markdown с выводом.
3. Подбирай график под задачу: динамика во времени — line/area; сравнение категорий — bar/hbar; доли — donut/pie; связь двух величин — scatter; несколько критериев — radar; день×час — heatmap; одно значение от нормы — gauge; этапы — funnel.
4. Если нужны данные от пользователя — не спрашивай текстом, а отдай form; ответ придёт сообщением вида «Форма <id>: {json}».
5. Чтобы предложить следующий шаг — buttons с "say": фраза, которую Джарвис получит от пользователя при клике.
6. Цвета серий назначаются автоматически (до 8). Для статусов используй level/variant: ok, warn, err, info.
7. Не выдумывай данные: если данных нет — скажи об этом через alert.
8. Нужна нестандартная вёрстка — блок html с классами jv-* (скрипты и on*-атрибуты удаляются).
9. Медиа: ссылки на картинки/видео бери только из результатов инструментов, не выдумывай URL. Для YouTube передавай id или ссылку в блок youtube; для нескольких картинок — gallery; для найденных статей — link. Если ссылка не открывается, интерфейс покажет заглушку — это нормально.

Пример (агент нашёл расходы и показывает итог):
\`\`\`jv
{"title":"Расходы за месяц","blocks":[
 {"type":"stats","items":[{"label":"Всего","value":84500,"unit":"₽","delta":"-6%","goodWhen":"down"},{"label":"Транзакций","value":132}]},
 {"type":"chart","kind":"donut","title":"По категориям","labels":["Еда","Транспорт","Дом"],"series":[{"name":"₽","data":[32000,12500,40000]}],"unit":"₽"},
 {"type":"alert","level":"warn","title":"Внимание","text":"Категория **Дом** выросла на 18%."},
 {"type":"buttons","items":[{"label":"Детализировать","say":"Покажи таблицу расходов на дом"}]}
]}
\`\`\``;
  }

  Object.assign(JV, { render, renderBlock, md, mdEl, inline, sanitize, bind, extract, prompt, esc });
  global.JV = JV;
})(window);
