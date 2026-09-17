// VLearn Grounded Tutor — giao diện prototype (Taxonomy shadcn-ui/taxonomy Light Style).
// Mọi dữ liệu lấy từ server.py (data pack thật + OpenAI/Gemini REST).
'use strict';

const $ = (sel) => document.querySelector(sel);
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const CITE_RE = /\[(D\d-p\d{1,3}|T\d{2}-\d{3})\]/g;

const state = {
  lecture: 'day1',
  lectures: {},            // id → {title, decks, transcripts, sections}
  transcriptTitles: {},    // file → tên buổi
  sources: {},             // mã nguồn → thông tin đoạn (gom từ mọi lượt)
  runs: {},                // run_id → {run, raw, section}
  currentTurn: null,
  history: [],
  busy: false,
  pdf: { deck: null, doc: null, page: 1, task: null, docs: {} },
  transcript: { file: null, paras: [] },
  goldenCases: [],
  goldenResults: {},
  currentGoldenCase: null,
  verifiedQuotes: {},
};

// ------------------------------------------------------------------ visual pinning state
const pinState = {
  enabled: false,
  isDragging: false,
  startX: 0,
  startY: 0,
};

// ------------------------------------------------------------------ floating chat widget state
const chatState = {
  isOpen: false,
  isDocked: false,
};

function openChat() {
  const panel = $('#chat-panel');
  const hint = $('#chatbot-hint');
  if (!panel) return;
  chatState.isOpen = true;
  panel.classList.remove('chat-closed');
  panel.classList.add('chat-open');
  if (hint) hint.classList.add('opacity-0', 'pointer-events-none');
  setTimeout(() => $('#user-input')?.focus(), 120);
}

function closeChat() {
  const panel = $('#chat-panel');
  const hint = $('#chatbot-hint');
  if (!panel) return;
  chatState.isOpen = false;
  panel.classList.remove('chat-open');
  panel.classList.add('chat-closed');
  if (hint) hint.classList.remove('opacity-0', 'pointer-events-none');
}

function toggleChat() {
  if (chatState.isOpen) closeChat();
  else openChat();
}

function toggleExpandChat() {
  const panel = $('#chat-panel');
  const icon = $('#chat-expand-btn i');
  if (!panel) return;
  chatState.isDocked = !chatState.isDocked;
  panel.classList.toggle('chat-docked', chatState.isDocked);
  if (icon) {
    icon.className = chatState.isDocked ? 'ph ph-arrows-in-simple' : 'ph ph-arrows-out-simple';
  }
}

// ------------------------------------------------------------------ tiện ích

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, body) {
  const opts = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

function citeLabel(id) {
  const m = id.match(/^D(\d)-p(\d+)$/);
  return m ? `Slide D${m[1]} · tr.${m[2]}` : id;
}

function citeChip(id, extraClass = '') {
  const s = state.sources[id];
  const qText = state.verifiedQuotes?.[id];
  let title = s ? `${s.label} — ${s.title}` : id;
  if (qText) {
    title += `\nTrích dẫn: “${qText}”`;
  }
  return `<button type="button" class="cite ${extraClass}" data-cite="${id}" title="${escapeHtml(title)}">${escapeHtml(citeLabel(id))}</button>`;
}

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>')
    .replace(CITE_RE, (_, id) => citeChip(id));
}

// Markdown tối giản; luôn escape trước khi chèn HTML (nội dung từ model và chatlog là dữ liệu).
function renderMd(text) {
  const out = [];
  let list = null;
  let code = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of escapeHtml(text).split('\n')) {
    if (line.trim().startsWith('```')) {
      if (code) { out.push(`<pre>${code.join('\n')}</pre>`); code = null; } else { closeList(); code = []; }
      continue;
    }
    if (code) { code.push(line); continue; }
    let m;
    if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inlineMd(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inlineMd(m[1])}</li>`);
    } else {
      closeList();
      if ((m = line.match(/^#{1,4}\s+(.*)$/))) out.push(`<p class="font-semibold text-zinc-900 mt-2 mb-1">${inlineMd(m[1])}</p>`);
      else if (line.trim()) out.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  if (code) out.push(`<pre>${code.join('\n')}</pre>`);
  closeList();
  return `<div class="md">${out.join('')}</div>`;
}

// ------------------------------------------------------------------ tab điều hướng chính

function switchTab(name) {
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.id !== `panel-${name}`));
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('text-zinc-900', on);
    t.classList.toggle('bg-white', on);
    t.classList.toggle('shadow-sm', on);
    t.classList.toggle('text-zinc-500', !on);
    t.classList.toggle('bg-transparent', !on);
  });
  if (name === 'slide' && state.pdf.doc) renderPage();
  if (name === 'transcript' && !state.transcript.file && $('#transcript-file')?.value) {
    loadTranscript($('#transcript-file').value).catch((e) => toast(e.message));
  }
}

function flash(el) {
  if (!el) return;
  el.classList.remove('highlight-active');
  void el.offsetWidth;
  el.classList.add('highlight-active');
}

async function loadDeck(deck) {
  const file = allDecks()[deck];
  if (!file) return;
  if (!state.pdf.docs[deck]) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    state.pdf.docs[deck] = pdfjsLib.getDocument(`/files/slides/${encodeURIComponent(file)}`).promise;
  }
  state.pdf.doc = await state.pdf.docs[deck];
  state.pdf.deck = deck;
  $('#deck').value = deck;
  $('#page-count').textContent = state.pdf.doc.numPages;
}

// Render slide fit completely inside stage (contain scale, no vertical or horizontal scrollbar)
async function renderPage() {
  const { doc } = state.pdf;
  if (!doc) return;
  const page = Math.min(Math.max(1, state.pdf.page), doc.numPages);
  state.pdf.page = page;
  $('#page-input').value = page;
  const pdfPage = await doc.getPage(page);
  const stage = $('#slide-stage');
  if (!stage) return;

  const base = pdfPage.getViewport({ scale: 1 });
  // Chừa khoảng trống 110px cho 2 nút mũi tên trái phải và padding
  const padX = stage.clientWidth > 768 ? 120 : 64;
  const padY = 24;
  const availWidth = Math.max(200, stage.clientWidth - padX);
  const availHeight = Math.max(150, stage.clientHeight - padY);

  // Contain scaling: vừa khít cả chiều rộng lẫn chiều cao màn hình mà không bao giờ bị tràn (không cần cuộn)
  const scaleW = availWidth / base.width;
  const scaleH = availHeight / base.height;
  const fitScale = Math.min(scaleW, scaleH);

  const dpr = window.devicePixelRatio || 1;
  const viewport = pdfPage.getViewport({ scale: fitScale * dpr });
  const canvas = $('#slide-canvas');
  if (state.pdf.task) state.pdf.task.cancel();
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${Math.floor(base.width * fitScale)}px`;
  canvas.style.height = `${Math.floor(base.height * fitScale)}px`;

  // Cập nhật trạng thái disabled của các nút chuyển trang
  const prevBtn = $('#slide-arrow-prev');
  const nextBtn = $('#slide-arrow-next');
  if (prevBtn) prevBtn.disabled = (page <= 1);
  if (nextBtn) nextBtn.disabled = (page >= doc.numPages);
  if ($('#prev-page')) $('#prev-page').disabled = (page <= 1);
  if ($('#next-page')) $('#next-page').disabled = (page >= doc.numPages);

  state.pdf.task = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport });
  try { await state.pdf.task.promise; } catch (e) { if (e?.name !== 'RenderingCancelledException') throw e; }
  try {
    await state.pdf.task.promise;
    const textContent = await pdfPage.getTextContent();
    state.pdf.currentTextItems = textContent?.items || [];
    state.pdf.baseViewport = base;
  } catch (e) {
    if (e?.name !== 'RenderingCancelledException') console.warn(e);
  }
  clearActivePin();
}

function prevSlide() {
  if (state.pdf.page > 1) {
    state.pdf.page -= 1;
    clearActivePin();
    renderPage();
    $('#slide-quote')?.classList.add('hidden');
  }
}

function nextSlide() {
  if (state.pdf.doc && state.pdf.page < state.pdf.doc.numPages) {
    state.pdf.page += 1;
    clearActivePin();
    renderPage();
    $('#slide-quote')?.classList.add('hidden');
  }
}

async function showSlide(deck, page, quote, quoteText = '') {
  switchTab('slide');
  clearActivePin();
  try {
    if (state.pdf.deck !== deck) await loadDeck(deck);
    state.pdf.page = page;
    await renderPage();
  } catch (e) {
    toast(`Không mở được slide: ${e.message}`);
    return;
  }
  const qText = quoteText || quote?.quoteText || (quote?.id && state.verifiedQuotes?.[quote.id]) || '';
  const box = $('#slide-quote');
  if (quote) {
    const quoteSuffix = qText ? ` — <span class="bg-amber-100/80 text-amber-950 px-1 py-0.5 rounded font-semibold italic">“${escapeHtml(qText)}”</span>` : '';
    box.querySelector('span').innerHTML = `Trợ giảng dẫn <strong>${escapeHtml(quote.label || quote.id || '')}</strong> — ${escapeHtml(quote.title || '')}${quoteSuffix}`;
    box.classList.remove('hidden');
    flash($('#slide-frame'));
    if (qText) {
      highlightQuoteOnSlide(qText);
    }
  } else {
    box.classList.add('hidden');
  }
}

function highlightQuoteOnSlide(quoteText) {
  const box = $('#quote-line-highlight');
  if (!box || !quoteText || !state.pdf.currentTextItems || !state.pdf.baseViewport) {
    box?.classList.add('hidden');
    return;
  }
  const items = state.pdf.currentTextItems;
  const base = state.pdf.baseViewport;

  const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const qNorm = norm(quoteText);
  const qWords = qNorm.split(' ').filter((w) => w.length >= 2);
  if (!qWords.length) {
    box.classList.add('hidden');
    return;
  }

  // 1. Tìm các text items có chứa từ trong câu trích
  const candidates = [];
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!it.str || !it.str.trim()) continue;
    const itNorm = norm(it.str);
    const hitWords = qWords.filter((w) => itNorm.includes(w));
    if (hitWords.length > 0) {
      const tx = it.transform[4];
      const ty = it.transform[5];
      const w = Math.max(10, it.width || 40);
      const h = Math.max(10, it.height || 14);
      const nx = tx / base.width;
      const ny = (base.height - ty) / base.height;
      const nw = w / base.width;
      const nh = h / base.height;
      candidates.push({ idx, it, nx, ny, nw, nh, hitWords, hitScore: hitWords.length });
    }
  }

  if (!candidates.length) {
    box.classList.add('hidden');
    return;
  }

  // 2. Gom cụm các item nằm gần nhau theo chiều dọc (cùng đoạn / dòng)
  const clusters = [];
  for (const item of candidates) {
    let placed = false;
    for (const cl of clusters) {
      const avgY = cl.items.reduce((s, x) => s + x.ny, 0) / cl.items.length;
      if (Math.abs(item.ny - avgY) < 0.10) {
        cl.items.push(item);
        item.hitWords.forEach((w) => cl.uniqueWords.add(w));
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({ items: [item], uniqueWords: new Set(item.hitWords) });
    }
  }

  // 3. Chọn cụm có độ phủ số từ trích dẫn cao nhất
  clusters.sort((a, b) => b.uniqueWords.size - a.uniqueWords.size || b.items.length - a.items.length);
  const bestCluster = clusters[0];
  if (!bestCluster || !bestCluster.items.length) {
    box.classList.add('hidden');
    return;
  }

  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const m of bestCluster.items) {
    minX = Math.min(minX, m.nx);
    minY = Math.min(minY, m.ny - m.nh);
    maxX = Math.max(maxX, m.nx + m.nw);
    maxY = Math.max(maxY, m.ny);
  }

  // Thêm padding cho khung highlight viền vàng
  minX = Math.max(0.005, minX - 0.015);
  minY = Math.max(0.005, minY - 0.008);
  maxX = Math.min(0.995, maxX + 0.015);
  maxY = Math.min(0.995, maxY + 0.012);

  box.style.left = `${(minX * 100).toFixed(2)}%`;
  box.style.top = `${(minY * 100).toFixed(2)}%`;
  box.style.width = `${((maxX - minX) * 100).toFixed(2)}%`;
  box.style.height = `${((maxY - minY) * 100).toFixed(2)}%`;
  box.classList.remove('hidden');

  box.classList.remove('animate-pulse');
  void box.offsetWidth;
  box.classList.add('animate-pulse');
}

// ------------------------------------------------------------------ smart visual pinning
function clearActivePin() {
  $('#pin-spotlight-box')?.classList.add('hidden');
  $('#smart-pin-card')?.classList.add('hidden');
  $('#pin-drag-box')?.classList.add('hidden');
  $('#quote-line-highlight')?.classList.add('hidden');
}

function togglePinMode(force) {
  pinState.enabled = typeof force === 'boolean' ? force : !pinState.enabled;
  const btn = $('#btn-toggle-pin');
  const hint = $('#pin-hint-bar');
  const overlay = $('#slide-overlay');

  if (btn) {
    btn.classList.toggle('bg-blue-50', pinState.enabled);
    btn.classList.toggle('border-blue-300', pinState.enabled);
    btn.classList.toggle('text-blue-700', pinState.enabled);
    btn.classList.toggle('font-semibold', pinState.enabled);
  }
  if (hint) hint.classList.toggle('hidden', !pinState.enabled);
  if (overlay) {
    overlay.classList.toggle('pointer-events-none', !pinState.enabled);
    overlay.classList.toggle('pointer-events-auto', pinState.enabled);
    overlay.classList.toggle('cursor-crosshair', pinState.enabled);
  }
  if (!pinState.enabled) {
    clearActivePin();
  }
}

function extractTextInBox(normBox, items, base) {
  if (!items || !items.length || !base) return '';
  const hits = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const tx = item.transform[4];
    const ty = item.transform[5];
    const nx = tx / base.width;
    const ny = (base.height - ty) / base.height;
    if (nx >= normBox.x1 - 0.03 && nx <= normBox.x2 + 0.03 &&
        ny >= normBox.y1 - 0.04 && ny <= normBox.y2 + 0.04) {
      hits.push({ str: item.str, y: ny, x: nx });
    }
  }
  hits.sort((a, b) => Math.abs(a.y - b.y) > 0.02 ? a.y - b.y : a.x - b.x);
  return hits.map((h) => h.str).join(' ').replace(/\s+/g, ' ').trim();
}

function positionPinCard(x, y, w, h, frameRect) {
  const card = $('#smart-pin-card');
  if (!card) return;

  card.classList.remove('hidden');
  const cardWidth = Math.min(320, frameRect.width - 24);
  card.style.width = `${cardWidth}px`;

  let left = x + w + 12;
  let top = y;

  if (left + cardWidth > frameRect.width - 12) {
    left = x - cardWidth - 12;
    if (left < 10) {
      left = Math.max(10, Math.min(frameRect.width - cardWidth - 10, x));
      top = y + h + 12;
      if (top + 180 > frameRect.height - 10) {
        top = Math.max(10, y - 180);
      }
    }
  }

  card.style.left = `${Math.max(10, Math.floor(left))}px`;
  card.style.top = `${Math.max(10, Math.floor(top))}px`;
  $('#pin-card-title').textContent = 'Đang phân tích...';
  $('#pin-card-body').innerHTML = '<div class="flex items-center gap-2 text-zinc-500 py-2"><i class="ph ph-spinner animate-spin text-blue-600"></i> Đang trích xuất và giải thích...</div>';
  $('#pin-card-cite').textContent = '';
}

async function handlePinAsk(extracted) {
  const deck = state.pdf.deck || 'D1';
  const page = state.pdf.page || 1;
  const truncated = extracted.length > 80 ? extracted.slice(0, 80) + '…' : extracted;
  $('#pin-card-title').textContent = truncated;
  $('#pin-card-title').title = extracted;

  const rawQuestion = `(Trang ${page}, đoạn được chọn: "${extracted}") Giải thích trọng tâm phần này`;

  try {
    const res = await api('/api/ask', {
      question: rawQuestion,
      lecture: state.lecture,
      section: state.lectures[state.lecture]?.title || '',
    });

    if (res) {
      $('#pin-card-body').innerHTML = renderMd(res.answer || 'Chưa có câu trả lời.');
      const cite = res.citations?.[0] ? citeLabel(res.citations[0]) : (res.status === 'not_found' ? 'Ngoài bài học' : `Slide ${deck} · tr.${page}`);
      $('#pin-card-cite').textContent = cite;

      const askMoreBtn = $('#pin-card-ask-more');
      if (askMoreBtn) {
        askMoreBtn.onclick = () => {
          openChat();
          $('#user-input').value = `Nói rõ hơn về phần "${truncated}": `;
          $('#user-input')?.focus();
        };
      }

      updateComparison(res, null);
    }
  } catch (e) {
    $('#pin-card-body').innerHTML = `<span class="text-rose-600">Lỗi: ${escapeHtml(e.message)}</span>`;
  }
}

function setupPinEvents() {
  const overlay = $('#slide-overlay');
  const dragBox = $('#pin-drag-box');
  const spotBox = $('#pin-spotlight-box');
  if (!overlay) return;

  overlay.addEventListener('mousedown', (ev) => {
    if (!pinState.enabled || ev.button !== 0) return;
    if (ev.target.closest('#smart-pin-card')) return;

    ev.preventDefault();
    const rect = overlay.getBoundingClientRect();
    pinState.isDragging = true;
    pinState.startX = ev.clientX - rect.left;
    pinState.startY = ev.clientY - rect.top;

    if (dragBox) {
      dragBox.style.left = `${pinState.startX}px`;
      dragBox.style.top = `${pinState.startY}px`;
      dragBox.style.width = '0px';
      dragBox.style.height = '0px';
      dragBox.classList.remove('hidden');
    }
  });

  window.addEventListener('mousemove', (ev) => {
    if (!pinState.isDragging || !overlay) return;
    const rect = overlay.getBoundingClientRect();
    const curX = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
    const curY = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));

    const x = Math.min(pinState.startX, curX);
    const y = Math.min(pinState.startY, curY);
    const w = Math.abs(curX - pinState.startX);
    const h = Math.abs(curY - pinState.startY);

    if (dragBox) {
      dragBox.style.left = `${x}px`;
      dragBox.style.top = `${y}px`;
      dragBox.style.width = `${w}px`;
      dragBox.style.height = `${h}px`;
    }
  });

  window.addEventListener('mouseup', async (ev) => {
    if (!pinState.isDragging || !overlay) return;
    pinState.isDragging = false;
    dragBox?.classList.add('hidden');

    const rect = overlay.getBoundingClientRect();
    const curX = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
    const curY = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));

    const x = Math.min(pinState.startX, curX);
    const y = Math.min(pinState.startY, curY);
    const w = Math.abs(curX - pinState.startX);
    const h = Math.abs(curY - pinState.startY);

    if (w < 15 && h < 15) return;

    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;
    const pctW = (w / rect.width) * 100;
    const pctH = (h / rect.height) * 100;

    const normBox = {
      x1: x / rect.width,
      y1: y / rect.height,
      x2: (x + w) / rect.width,
      y2: (y + h) / rect.height,
    };

    let extracted = extractTextInBox(normBox, state.pdf.currentTextItems, state.pdf.baseViewport);
    if (!extracted) extracted = `Vùng sơ đồ/nội dung tại trang ${state.pdf.page}`;

    if (spotBox) {
      spotBox.style.left = `${pctX}%`;
      spotBox.style.top = `${pctY}%`;
      spotBox.style.width = `${pctW}%`;
      spotBox.style.height = `${pctH}%`;
      spotBox.classList.remove('hidden');
    }

    positionPinCard(x, y, w, h, rect);
    await handlePinAsk(extracted);
  });

  $('#pin-card-close')?.addEventListener('click', clearActivePin);
  $('#btn-toggle-pin')?.addEventListener('click', () => togglePinMode());
  $('#pin-hint-close')?.addEventListener('click', () => togglePinMode(false));
}

async function loadTranscript(file) {
  if (state.transcript.file === file) return;
  const data = await api(`/api/transcript/${encodeURIComponent(file)}`);
  state.transcript = { file, paras: data.paragraphs };
  $('#transcript-file').value = file;
  $('#transcript-filter').value = '';
  renderTranscript();
}

async function showTranscript(file, highlightId, quoteText = '') {
  $('#transcript-file').value = file;
  switchTab('transcript');
  await loadTranscript(file);
  const qText = quoteText || (highlightId && state.verifiedQuotes?.[highlightId]) || '';
  if (highlightId) {
    const el = document.getElementById(`para-${highlightId}`);
    if (el) {
      el.classList.remove('hidden');
      document.querySelectorAll('.transcript-active-card').forEach((c) => c.classList.remove('transcript-active-card'));
      el.classList.add('transcript-active-card');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      flash(el);
      highlightQuoteInTranscript(el, qText);
    }
  }
}

function highlightQuoteInTranscript(el, quoteText) {
  if (!el) return;
  const textDiv = el.querySelector('.whitespace-pre-line') || el.querySelector('.text-zinc-700');
  if (!textDiv) return;

  if (!el.dataset.origText) {
    el.dataset.origText = textDiv.textContent;
  }
  const raw = el.dataset.origText;

  // Xoá badge cũ nếu có
  el.querySelector('.transcript-quote-badge')?.remove();

  if (!quoteText || !quoteText.trim()) {
    textDiv.textContent = raw;
    const badge = document.createElement('div');
    badge.className = 'transcript-quote-badge mb-2.5 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-100 to-amber-50/80 border-2 border-amber-400 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs';
    badge.innerHTML = '<i class="ph-fill ph-map-pin text-amber-600 text-base shrink-0 animate-bounce"></i><span class="flex-1">Vị trí đoạn văn bản AI đang chỉ dẫn</span><span class="text-[10.5px] font-mono font-medium text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded">Điểm tham chiếu</span>';
    textDiv.parentNode.insertBefore(badge, textDiv);
    return;
  }

  // Thêm badge nổi bật trên đoạn văn khi có câu trích dẫn xác thực
  const badge = document.createElement('div');
  badge.className = 'transcript-quote-badge mb-2.5 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-100 to-amber-50/80 border-2 border-amber-400 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs';
  badge.innerHTML = '<i class="ph-fill ph-seal-check text-amber-600 text-base shrink-0 animate-bounce"></i><span class="flex-1">Đoạn thông tin AI trích dẫn làm căn cứ</span><span class="text-[10.5px] font-mono font-medium text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded">Trùng khớp cao</span>';
  textDiv.parentNode.insertBefore(badge, textDiv);

  // Tìm câu hoặc đoạn khớp nhất trong raw
  const norm = (s) => (s || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const qNorm = norm(quoteText);
  const qWords = qNorm.split(' ').filter((w) => w.length >= 2);

  const sentences = raw.split(/(?<=[.!?\n])\s+/);
  let bestSent = '';
  let bestScore = 0;

  for (const sent of sentences) {
    if (!sent.trim()) continue;
    const sNorm = norm(sent);
    let score = 0;
    for (const w of qWords) {
      if (sNorm.includes(w)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSent = sent;
    }
  }

  if (bestScore >= 1 && bestSent) {
    const safeRaw = escapeHtml(raw);
    const safeSent = escapeHtml(bestSent);
    const idx = safeRaw.indexOf(safeSent);
    if (idx !== -1) {
      const before = safeRaw.slice(0, idx);
      const after = safeRaw.slice(idx + safeSent.length);
      textDiv.innerHTML = `${before}<mark class="bg-amber-300 text-amber-950 px-2 py-0.5 rounded font-bold ring-2 ring-amber-500 shadow-sm inline-block my-0.5">${safeSent}</mark>${after}`;
    } else {
      textDiv.textContent = raw;
    }
  } else {
    textDiv.textContent = raw;
  }
}

function renderTranscript() {
  const filter = $('#transcript-filter').value.trim().toLowerCase();
  let lastHeading = null;
  const html = state.transcript.paras.map((p) => {
    const hidden = filter && !p.text.toLowerCase().includes(filter) && !p.id.toLowerCase().includes(filter);
    const heading = p.title !== lastHeading ? `<div class="pt-4 pb-1 font-semibold text-xs text-zinc-900 flex items-center gap-2 ${hidden ? 'hidden' : ''}"><span class="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>${escapeHtml(p.title.split(' · ').slice(1).join(' · ') || p.title)}</div>` : '';
    if (!hidden) lastHeading = p.title;
    return `${heading}<div id="para-${p.id}" class="bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-3 shadow-sm ${hidden ? 'hidden' : ''} group transition">
      <div class="flex items-center justify-between mb-1.5">
        <span class="transcript-id-badge font-mono text-[11px] font-medium text-zinc-800 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded transition">[${p.id}]</span>
        <button type="button" data-ask="Giải thích đoạn transcript ${p.id}" class="opacity-0 group-hover:opacity-100 text-[10.5px] text-zinc-600 hover:text-zinc-900 px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 transition">Hỏi AI đoạn này</button>
      </div>
      <div class="text-zinc-700 whitespace-pre-line leading-relaxed text-xs">${escapeHtml(p.text)}</div></div>`;
  }).join('');
  $('#transcript-list').innerHTML = html || '<p class="text-zinc-400 text-xs">Không có đoạn nào khớp.</p>';
}

async function openSource(id, quoteText = '') {
  const s = state.sources[id];
  if (!s) { toast(`Chưa có thông tin nguồn ${id}`); return; }
  const qText = quoteText || state.verifiedQuotes?.[id] || '';
  if (s.kind === 'slide') await showSlide(s.deck, s.page, s, qText);
  else await showTranscript(s.source, id, qText);
}

function renderEvidence(run) {
  const cited = new Set([...(run.citations || []), ...(run.where_ids || [])]);
  const rows = run.retrieved.map((r) => {
    const s = state.sources[r.id] || {};
    const scope = r.scope === 'lecture'
      ? '<span class="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-mono font-medium">bài đang học</span>'
      : '<span class="px-2 py-0.5 rounded bg-zinc-50 text-zinc-500 border border-zinc-200 text-[10px] font-mono">bài khác · chỉ để chỉ đường</span>';
    const vq = (run.verified_quotes || []).find((v) => v.id === r.id && v.verified);
    const quoteHtml = vq ? `<div class="mt-2 text-xs bg-amber-50/90 border border-amber-300/80 text-amber-950 rounded-md p-2 italic flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span><span>✨ Câu trích AI làm căn cứ: “${escapeHtml(vq.quote)}”</span></div>` : '';
    const mark = cited.has(r.id) ? '<span class="px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-mono font-semibold shadow-xs">được trích dẫn</span>' : '';
    return `<div class="bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg p-3.5 mb-2.5 shadow-sm transition">
      <div class="flex items-center gap-2 flex-wrap">${citeChip(r.id)} ${scope} ${mark}
        <span class="ml-auto text-zinc-500 font-mono text-xs">BM25: ${r.score}</span></div>
      <div class="font-medium text-zinc-900 mt-1.5 text-xs">${escapeHtml(s.title || '')}</div>
      <div class="text-zinc-600 mt-0.5 text-xs leading-relaxed">${escapeHtml((s.snippet || '').replace(/\s*\n\s*/g, ' · '))}</div>
      ${quoteHtml}</div>`;
  }).join('');
  const excluded = run.excluded?.length ? `<p class="mb-3 text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-lg p-2.5 text-xs">Đã loại theo phản hồi: ${run.excluded.map(escapeHtml).join(', ')}</p>` : '';
  $('#panel-evidence').innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="bg-white rounded-xl p-3.5 mb-3.5 border border-zinc-200 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[11px] text-zinc-500 font-mono uppercase font-medium">Câu hỏi:</span>
          <h3 class="text-xs font-semibold text-zinc-900 mt-0.5">${escapeHtml(run.question)}</h3>
        </div>
        <div class="text-right text-xs font-mono text-zinc-500">
          Tra <span class="text-zinc-900 font-bold">${run.retrieved.length}</span> đoạn trong <span class="text-emerald-600 font-bold">${run.latency_ms.retrieval} ms</span>
        </div>
      </div>
      ${excluded}${rows || '<p class="text-zinc-400 text-xs">Không tìm thấy đoạn nào có từ khoá khớp.</p>'}
    </div>`;
  $('#evidence-count').textContent = `(${run.retrieved.length})`;
}

// Cập nhật tab so sánh đối chiếu Taxonomy style
function updateComparison(run, turn) {
  const qEl = $('#compare-question');
  const oldEl = $('#compare-old-reply');
  const aiEl = $('#compare-ai-reply');
  const badgeEl = $('#compare-status-badge');
  const citeEl = $('#compare-citations');
  const modelEl = $('#compare-model');
  const latEl = $('#compare-latency');

  if (qEl && run) qEl.textContent = run.question;
  if (turn && oldEl) {
    oldEl.textContent = turn.original_reply || 'Không có dữ liệu câu trả lời cũ.';
  }

  if (run && aiEl) {
    aiEl.innerHTML = renderMd(run.answer);
  }

  if (run && badgeEl) {
    const [cls, icon, label] = statusOf(run);
    badgeEl.innerHTML = `<span class="inline-flex items-center gap-1 border rounded-md px-2 py-0.5 text-xs font-medium ${cls}"><i class="ph-bold ${icon}"></i> ${escapeHtml(label(run))}</span>`;
  }

  if (run && citeEl) {
    const allCites = [...(run.citations || []), ...(run.where_ids || [])];
    if (allCites.length) {
      citeEl.innerHTML = allCites.map((id) => citeChip(id)).join(' ');
    } else {
      citeEl.innerHTML = '<span class="text-xs text-rose-600">Không có mã nguồn xác thực</span>';
    }
  }

  if (run && modelEl) modelEl.textContent = `Model: ${run.model || 'Không dùng AI'}`;
  if (run && latEl) {
    const totalMs = run.latency_ms?.total;
    latEl.textContent = `Độ trễ: ${totalMs >= 1000 ? (totalMs / 1000).toFixed(1) + ' s' : totalMs + ' ms'}`;
  }
}

// ------------------------------------------------------------------ chat

function scrollChat() {
  const c = $('#chat-messages');
  if (c) c.scrollTop = c.scrollHeight;
}

function aiBubble(inner) {
  const div = document.createElement('div');
  div.className = 'flex items-start gap-2.5';
  div.innerHTML = `<div class="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm"><i class="ph-bold ph-robot"></i></div>
    <div class="bubble bg-zinc-50 text-zinc-800 text-xs rounded-2xl rounded-tl-sm p-3.5 max-w-[92%] shadow-sm border border-zinc-200 min-w-0">${inner}</div>`;
  $('#chat-messages').appendChild(div);
  scrollChat();
  return div.querySelector('.bubble');
}

function welcome() {
  const lec = state.lectures[state.lecture];
  aiBubble(`
    <p class="font-semibold mb-1 text-zinc-900 text-xs flex items-center gap-1.5">
      <span>Chào bạn! Mình là Trợ Giảng VLearn.</span>
    </p>
    <p class="text-zinc-600 mb-2 leading-relaxed text-xs">Mình hỗ trợ trả lời dựa trên <strong>slide &amp; transcript của ${escapeHtml(lec?.title || 'bài đang học')}</strong>.
    Mỗi ý đều có mã nguồn xác thực — bấm để mở đúng trang slide hoặc đoạn transcript.</p>
    <div class="text-[11px] text-zinc-500 border-t border-zinc-200 pt-2 space-y-1">
      <div class="flex items-center gap-2"><i class="ph-bold ph-shield-check text-emerald-600"></i> Không có trong bài → Nói rõ và chỉ chỗ nên tìm.</div>
      <div class="flex items-center gap-2"><i class="ph-bold ph-question text-amber-600"></i> Câu hỏi mơ hồ → Hỏi lại kèm gợi ý.</div>
      <div class="flex items-center gap-2"><i class="ph-bold ph-flag text-rose-600"></i> Nguồn không khớp → Bấm ⚑ để tìm lại.</div>
    </div>`);
}

function addUser(text, turn) {
  state.currentTurn = turn;
  const div = document.createElement('div');
  div.className = 'flex items-start justify-end gap-2.5';
  let meta = '';
  if (turn) {
    const oldBadge = turn.original_has_citation
      ? '<span class="text-emerald-700 font-medium">có trích dẫn</span>'
      : '<span class="text-rose-600 font-medium">không trích dẫn</span>';
    meta = `<div class="mb-1 text-[10.5px] text-zinc-300 flex flex-wrap gap-x-2 font-mono">
        <span>${escapeHtml(turn.turn_id)} · ${escapeHtml(turn.cohort)}</span>
        ${turn.section ? `<span>[${escapeHtml(turn.section)}]</span>` : ''}</div>`;
    const old = `<details class="mt-2 bg-zinc-800 text-zinc-200 rounded-lg p-2.5 border border-zinc-700 text-xs">
        <summary class="cursor-pointer text-[11px] font-medium text-zinc-300 hover:text-white flex items-center justify-between">
          <span>Tutor cũ (${oldBadge})</span>
          <i class="ph ph-caret-down text-xs"></i>
        </summary>
        <div class="mt-1.5 max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-line text-[11px] leading-relaxed text-zinc-300 border-t border-zinc-700 pt-1.5">${escapeHtml(turn.original_reply)}</div>
      </details>`;
    div.innerHTML = `<div class="bg-zinc-900 text-white text-xs rounded-2xl rounded-tr-sm p-3 max-w-[88%] shadow-sm min-w-0">
        ${meta}<div class="whitespace-pre-line leading-relaxed">${escapeHtml(text)}</div>${turn.selected ? `<div class="mt-1 text-[11px] text-zinc-300 bg-zinc-800 p-1.5 rounded border border-zinc-700 font-mono">“${escapeHtml(turn.selected.slice(0, 160))}”</div>` : ''}${old}</div>
      <div class="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 text-[10px] font-bold">HV</div>`;
  } else {
    div.innerHTML = `<div class="bg-zinc-900 text-white text-xs rounded-2xl rounded-tr-sm p-3 max-w-[85%] shadow-sm whitespace-pre-line leading-relaxed">${escapeHtml(text)}</div>
      <div class="w-6 h-6 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 text-[10px] font-bold">Tôi</div>`;
  }
  $('#chat-messages').appendChild(div);
  scrollChat();
}

function systemNote(html) {
  const div = document.createElement('div');
  div.className = 'text-center text-[11px] text-zinc-500 my-2';
  div.innerHTML = `<span class="inline-block bg-zinc-100 border border-zinc-200 rounded-md px-3 py-0.5 text-zinc-700">${html}</span>`;
  $('#chat-messages').appendChild(div);
  scrollChat();
}

const STATUS = {
  answer: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'ph-seal-check', (r) => `Có căn cứ · ${r.citations.length} nguồn`],
  clarify: ['bg-amber-50 text-amber-700 border-amber-200', 'ph-question', () => 'Cần hỏi lại cho rõ'],
  not_found: ['bg-rose-50 text-rose-700 border-rose-200', 'ph-shield-warning', () => 'Không có trong bài'],
  ungrounded: ['bg-orange-50 text-orange-700 border-orange-200', 'ph-warning', () => 'Không đủ căn cứ'],
  search_only: ['bg-zinc-100 text-zinc-700 border-zinc-200', 'ph-magnifying-glass', () => 'Chỉ tìm kiếm từ khoá'],
  blocked: ['bg-rose-50 text-rose-700 border-rose-200', 'ph-shield', () => 'Chặn prompt lạ — không gửi tới AI'],
};

// Câu bị luật injection chặn vẫn có status not_found (để chấm eval), nhưng hiển thị là "bị chặn".
function statusOf(r) {
  const key = (r.flags || []).includes('injection') ? 'blocked' : (r.status || r.actual_status);
  return STATUS[key] || STATUS.not_found;
}

function renderRun(bubble, run) {
  const [cls, icon, label] = statusOf(run);
  const badges = [`<span class="inline-flex items-center gap-1 border rounded-md px-2 py-0.5 text-[10.5px] font-medium ${cls}"><i class="ph-bold ${icon}"></i> ${escapeHtml(label(run))}</span>`];
  if (run.mode === 'retrieval-only' && run.status !== 'search_only') badges.push('<span class="border rounded-md px-2 py-0.5 bg-zinc-100 text-zinc-600 border-zinc-200">Chưa qua AI</span>');
  if (run.flags.includes('section_mismatch')) badges.push('<span class="border rounded-md px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200"><i class="ph ph-link-break"></i> Thuộc phần khác</span>');
  if (run.flags.includes('catalog_policy')) badges.push('<span class="border rounded-md px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"><i class="ph ph-shield-check"></i> Bảng ánh xạ tài liệu</span>');
  if (run.excluded.length) badges.push(`<span class="border rounded-md px-2 py-0.5 bg-zinc-100 text-zinc-600 border-zinc-200">Bỏ nguồn ${run.excluded.map(escapeHtml).join(', ')}</span>`);
  if (run.verified_quotes?.length && run.citations?.length) {
    // Đếm theo mã nguồn riêng biệt: mỗi nguồn được dẫn có ít nhất một câu trích khớp nguyên văn.
    const cited = new Set(run.citations);
    const verifiedCount = new Set(run.verified_quotes.filter(v => v.verified && cited.has(v.id)).map(v => v.id)).size;
    if (verifiedCount > 0) {
      badges.push(`<span class="border rounded-md px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200"><i class="ph-bold ph-seal-check"></i> Nguồn có câu trích khớp nguyên văn: ${verifiedCount}/${cited.size}</span>`);
    }
  }

  let body = run.status === 'ungrounded'
    ? `<p class="text-amber-700 mb-1 font-medium">Trợ giảng viết được câu trả lời nhưng không gắn được vào đoạn tài liệu nào, nên đã ẩn để tránh đoán sai.</p>
       <details class="bg-zinc-100 rounded-lg p-2 border border-zinc-200"><summary class="cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-900">Xem bản nháp chưa có căn cứ</summary><div class="mt-1.5 opacity-70">${renderMd(run.answer)}</div></details>`
    : renderMd(run.answer);

  if (run.clarify_options?.length) {
    body += `<div class="mt-2.5 space-y-1.5">${run.clarify_options.map((o) => `
      <button type="button" data-ask="${escapeHtml(o)}" data-run="${run.run_id}" class="w-full text-left bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 p-2.5 rounded-lg text-xs text-zinc-800 flex items-center justify-between gap-2 shadow-sm transition">
        <span>${escapeHtml(o)}</span><i class="ph ph-caret-right text-zinc-400"></i></button>`).join('')}</div>`;
  }
  if (run.where_to_look) {
    body += `<div class="mt-2.5 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200"><div class="font-medium text-zinc-800 mb-1 flex items-center gap-1.5"><i class="ph ph-compass"></i> Gợi ý chỗ tìm</div>${renderMd(run.where_to_look)}</div>`;
  }
  if (run.removed_citations?.length) {
    body += `<p class="mt-2 text-[11px] text-amber-700"><i class="ph ph-eraser"></i> Đã gỡ ${run.removed_citations.length} mã nguồn bịa: ${run.removed_citations.map(escapeHtml).join(', ')}</p>`;
  }
  if (run.error) body += `<p class="mt-2 text-[11px] text-rose-600"><i class="ph ph-plug"></i> Không gọi được AI: ${escapeHtml(run.error)}</p>`;
  if (run.model_fallback_errors?.length) body += `<p class="mt-2 text-[10.5px] text-zinc-500"><i class="ph ph-arrows-left-right"></i> Chuyển sang ${escapeHtml(run.model)}: ${escapeHtml(run.model_fallback_errors.join(' · '))}</p>`;

  const sources = run.citations.map((id) => `<span class="inline-flex items-center">${citeChip(id)}<button type="button" data-report="${id}" data-run="${run.run_id}" title="Nguồn không khớp — tìm lại" class="text-zinc-400 hover:text-rose-600 px-0.5 text-xs">⚑</button></span>`).join(' ');
  const ms = run.latency_ms.total >= 1000 ? `${(run.latency_ms.total / 1000).toFixed(1)} s` : `${run.latency_ms.total} ms`;

  const quotesHtml = (run.verified_quotes || []).filter((v) => v.verified && v.quote).map((vq) => `
    <div class="mt-2.5 bg-amber-50/90 border border-amber-300/90 rounded-lg p-2.5 text-xs text-amber-950 shadow-xs">
      <div class="font-bold flex items-center justify-between text-amber-900 mb-1">
        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span>Đoạn tài liệu gốc AI lấy làm căn cứ:</span>
        <button type="button" data-cite="${escapeHtml(vq.id)}" class="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-800 hover:text-amber-950 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded cursor-pointer transition">
          <i class="ph-bold ph-arrow-square-out"></i> Xem & tô sáng trên ${escapeHtml(citeLabel(vq.id))}
        </button>
      </div>
      <div class="italic text-amber-900 leading-relaxed pl-2.5 border-l-2 border-amber-400">
        “${escapeHtml(vq.quote)}”
      </div>
    </div>
  `).join('');

  bubble.innerHTML = `
    <div class="flex flex-wrap gap-1 mb-2 text-[10.5px]">${badges.join('')}</div>
    ${body}
    ${quotesHtml}
    ${run.reason ? `<p class="mt-2.5 text-[11px] text-zinc-500 italic flex items-center gap-1.5"><i class="ph ph-lightbulb text-amber-600"></i> Vì sao: ${escapeHtml(run.reason)}</p>` : ''}
    <div class="mt-2.5 pt-2 border-t border-zinc-200 flex items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-1 min-w-0">${sources ? `<span class="text-[10.5px] text-zinc-500">Nguồn:</span> ${sources}` : ''}</div>
      <div class="flex items-center gap-2 text-zinc-400 shrink-0">
        <button type="button" data-vote="up" data-run="${run.run_id}" title="Hữu ích" class="hover:text-zinc-800 transition"><i class="ph ph-thumbs-up"></i></button>
        <button type="button" data-vote="down" data-run="${run.run_id}" title="Chưa đúng" class="hover:text-rose-600 transition"><i class="ph ph-thumbs-down"></i></button>
      </div>
    </div>
    <div class="mt-1.5 text-[10px] text-zinc-400 flex flex-wrap items-center justify-between font-mono">
      <div class="flex items-center gap-2">
        <span class="text-zinc-600 font-medium">${escapeHtml(run.model || (run.mode === 'rule' ? 'luật chặn · không gọi AI' : 'không gọi AI'))}</span>
        <span>•</span>
        <span>${ms}</span>
      </div>
      ${run.retrieved.length ? `<button type="button" data-evidence="${run.run_id}" class="text-zinc-600 hover:underline">xem ${run.retrieved.length} đoạn đã tra</button>` : ''}
    </div>`;
  scrollChat();
  updateComparison(run, state.currentTurn);
}

async function ask(raw, { display, turn = null, exclude = [], section = null, then = null } = {}) {
  if (state.busy) { toast('Đang chờ câu trả lời trước…'); return; }
  state.busy = true;
  $('#send-btn').disabled = true;
  openChat(); // Tự động mở khung chat
  if (display !== null) addUser(display ?? raw, turn);
  const sec = section ?? (turn ? '' : $('#section').value);
  const bubble = aiBubble('<span class="text-zinc-500 flex items-center gap-1.5"><i class="ph ph-spinner animate-spin"></i> Đang tra cứu tài liệu… <span class="elapsed font-mono">0</span>s</span>');
  const started = Date.now();
  const timer = setInterval(() => { const e = bubble.querySelector('.elapsed'); if (e) e.textContent = Math.round((Date.now() - started) / 1000); }, 500);
  try {
    const run = await api('/api/ask', { question: raw, lecture: state.lecture, section: sec, history: state.history.slice(-4), exclude });
    Object.assign(state.sources, run.sources);
    if (run.verified_quotes && Array.isArray(run.verified_quotes)) {
      run.verified_quotes.forEach((vq) => {
        if (vq.id && vq.quote && vq.verified) {
          state.verifiedQuotes[vq.id] = vq.quote;
        }
      });
    }
    if (run.model) {
      $('#ai-status').innerHTML = `<i class="ph-bold ph-lightning text-emerald-600"></i> AI: ${escapeHtml(run.model)}`;
    }
    state.runs[run.run_id] = { run, raw, section: sec };
    renderRun(bubble, run);
    renderEvidence(run);
    // Lượt bị chặn không vào lịch sử, để chỉ dẫn lạ không theo các câu hỏi sau gửi tới AI.
    if (!run.flags.includes('injection')) {
      state.history.push({ role: 'user', text: run.question }, { role: 'assistant', text: run.answer });
    }
    const first = run.citations[0] || run.where_ids?.[0];
    if (first) {
      const qText = state.verifiedQuotes?.[first] || '';
      openSource(first, qText);
    }
    if (then === 'report_first_citation' && run.citations.length) {
      setTimeout(() => reportSource(run.run_id, run.citations[0]), 1500);
    }
  } catch (e) {
    bubble.innerHTML = `<p class="text-rose-600">Không nhận được câu trả lời: ${escapeHtml(e.message)}</p>`;
  } finally {
    clearInterval(timer);
    state.busy = false;
    $('#send-btn').disabled = false;
  }
}

async function reportSource(runId, citation) {
  const entry = state.runs[runId];
  if (!entry) return;
  document.querySelectorAll(`[data-run="${runId}"][data-report="${citation}"]`).forEach((b) => b.previousElementSibling?.classList.add('reported'));
  api('/api/feedback', { run_id: runId, kind: 'wrong_source', citation, question: entry.raw, lecture: state.lecture }).catch(() => {});
  systemNote(`Bạn báo nguồn <strong>${escapeHtml(citeLabel(citation))}</strong> không khớp — trợ giảng tìm lại mà không dùng nguồn này.`);
  const exclude = [...new Set([...entry.run.excluded, citation])];
  await ask(entry.raw, { display: null, exclude, section: entry.section });
}

// ------------------------------------------------------------------ bài học

function allDecks() {
  return state.lectures.all?.decks || {};
}

async function setLecture(id, { announce = true } = {}) {
  state.lecture = id;
  state.history = [];
  $('#lecture').value = id;
  const lec = state.lectures[id];
  $('#section').innerHTML = '<option value="">(không chọn — hỏi chung về bài)</option>' +
    lec.sections.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

  const decks = Object.keys(lec.decks);
  $('#deck').innerHTML = Object.entries(allDecks()).map(([d, f]) => `<option value="${d}">${d} · ${escapeHtml(f)}</option>`).join('');
  const own = lec.transcripts;
  const others = Object.keys(state.transcriptTitles).filter((f) => !own.includes(f));
  const opt = (f) => `<option value="${f}">${escapeHtml(f.replace('-clean.md', ''))} — ${escapeHtml(state.transcriptTitles[f])}</option>`;
  $('#transcript-file').innerHTML = `<optgroup label="Bài đang học">${own.map(opt).join('')}</optgroup>` +
    (others.length ? `<optgroup label="Bài khác">${others.map(opt).join('')}</optgroup>` : '');

  const suggestions = id === 'day2'
    ? ['Double Diamond gồm những bước nào?', 'Khi nào không nên dùng AI?', 'Hướng dẫn nộp bài lab ở đâu?']
    : ['Attention hoạt động thế nào?', 'Temperature và top_p khác nhau ra sao?', 'LangGraph dùng để làm gì?'];
  $('#suggestions').innerHTML = '<span class="text-[10px] text-zinc-500 py-0.5 font-mono uppercase font-medium">Gợi ý:</span>' + suggestions.map((s) =>
    `<button type="button" data-ask="${escapeHtml(s)}" class="text-[11px] bg-white hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200 px-2.5 py-0.5 rounded-md text-zinc-700 shadow-sm transition">${escapeHtml(s)}</button>`).join('');

  if (announce) systemNote(`Đang học: <strong>${escapeHtml(lec.title)}</strong>`);
  state.transcript.file = null;
  if (decks.length) {
    state.pdf.page = 1;
    showSlide(decks[0], 1).catch(() => {});
  }
}

async function loadScenarios() {
  const { scenarios } = await api('/api/scenarios');
  const color = {
    happy: 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
    'low-confidence': 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100',
    failure: 'text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100',
    correction: 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100',
  };
  const pathName = { happy: 'chuẩn', 'low-confidence': 'mơ hồ', failure: 'khó', correction: 'sửa nguồn' };
  $('#scenarios').innerHTML = scenarios.map((s, i) => `
    <button type="button" data-scenario="${i}" title="${escapeHtml(s.turn.question)}"
      class="shrink-0 text-xs px-2.5 py-1 rounded-md border transition-all ${color[s.path] || 'text-zinc-700 border-zinc-200 bg-white'} hover:scale-105 whitespace-nowrap flex items-center gap-1.5 font-medium shadow-sm">
      <span class="opacity-70 font-semibold">${escapeHtml(pathName[s.path] || s.path)} ·</span> ${escapeHtml(s.label)}</button>`).join('');
  state.scenarios = scenarios;
}

async function loadGoldenSet() {
  try {
    const cases = await api('/api/eval/golden_set');
    state.goldenCases = cases || [];

    let resData = null;
    try {
      resData = await api('/api/eval/results');
    } catch {
      // Kết quả kiểm thử chưa có hoặc đang chạy
    }

    if (resData && resData.cases) {
      for (const c of resData.cases) {
        state.goldenResults[c.id] = c;
      }
      if (resData.summary) {
        const badge = $('#cp3-summary-badge');
        if (badge) {
          const s = resData.summary;
          badge.innerHTML = `<i class="ph-bold ph-seal-check text-emerald-600"></i> ${escapeHtml(resData.label || 'Lượt đo')}: ${s.passed}/${s.total} Đạt (${s.pass_rate}%)`;
          badge.className = 'text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-medium flex items-center gap-1.5 shadow-xs';
          badge.title = `Chạy lúc ${resData.timestamp || '?'} · commit ${resData.git_commit || '?'} · model ${(s.models || []).join(', ')}`;
        }
      }
    } else {
      const badge = $('#cp3-summary-badge');
      if (badge) badge.textContent = 'Chưa có số đo — chạy python eval/run_eval.py';
    }

    const select = $('#golden-set-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Chọn 1 trong 20 ca kiểm thử Golden Set để đối chiếu --</option>' +
      state.goldenCases.map((c) => {
        const res = state.goldenResults[c.id];
        const mark = res ? (res.passed ? '✅' : '❌') : '';
        const turnLabel = c.turn_id ? `[${c.turn_id}]` : `[Mẫu nhóm]`;
        return `<option value="${c.id}">${escapeHtml(`${c.id} · ${turnLabel} ${c.question.slice(0, 48)}... ${mark}`)}</option>`;
      }).join('');

    select.addEventListener('change', async (ev) => {
      const id = ev.target.value;
      if (!id) {
        $('#golden-meta-layer')?.classList.add('hidden');
        $('#golden-meta-result')?.classList.add('hidden');
        $('#golden-run-btn')?.classList.add('hidden');
        return;
      }
      const c = state.goldenCases.find((x) => x.id === id);
      if (!c) return;
      state.currentGoldenCase = c;

      const layerTag = $('#golden-meta-layer');
      const resTag = $('#golden-meta-result');
      const runBtn = $('#golden-run-btn');

      if (layerTag) {
        layerTag.textContent = c.difficulty_layer;
        layerTag.classList.remove('hidden');
      }

      const res = state.goldenResults[c.id];
      if (resTag) {
        if (res) {
          resTag.textContent = res.passed ? 'CP3: ĐẠT' : 'CP3: CHƯA ĐẠT';
          resTag.className = res.passed
            ? 'px-2 py-0.5 rounded font-mono text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'px-2 py-0.5 rounded font-mono text-[11px] font-semibold border bg-rose-50 text-rose-700 border-rose-200';
          if (res.failure_reason) resTag.title = res.failure_reason;
        } else {
          resTag.textContent = 'Chưa đo';
          resTag.className = 'px-2 py-0.5 rounded font-mono text-[11px] font-semibold border bg-zinc-100 text-zinc-600 border-zinc-200';
        }
        resTag.classList.remove('hidden');
      }

      if (runBtn) {
        runBtn.classList.remove('hidden');
        runBtn.classList.add('flex');
      }

      // Cập nhật khung so sánh
      const qEl = $('#compare-question');
      const oldEl = $('#compare-old-reply');
      const aiEl = $('#compare-ai-reply');
      const badgeEl = $('#compare-status-badge');
      const citeEl = $('#compare-citations');
      const modelEl = $('#compare-model');
      const latEl = $('#compare-latency');

      if (qEl) qEl.textContent = c.question;

      let oldTurn = null;
      if (c.turn_id && c.turn_id.startsWith('T')) {
        try {
          const { turn } = await api(`/api/turns/${c.turn_id}`);
          oldTurn = turn;
          if (turn && oldEl) {
            oldEl.textContent = turn.original_reply || '(Không có câu trả lời cũ của tutor)';
          }
        } catch {
          if (oldEl) oldEl.textContent = '(Không tìm thấy lượt tương ứng trong chatlog)';
        }
      } else {
        if (oldEl) oldEl.textContent = '(Ca kiểm thử mẫu độc lập do nhóm biên soạn để kiểm thử chỗ khó)';
      }
      state.currentTurn = oldTurn;

      if (res) {
        const [cls, icon, label] = statusOf(res);
        if (badgeEl) {
          badgeEl.innerHTML = `<span class="inline-flex items-center gap-1 border rounded-md px-2 py-0.5 text-xs font-medium ${cls}"><i class="ph-bold ${icon}"></i> ${escapeHtml(label({ citations: res.citations || [] }))}</span>`;
        }
        if (citeEl) {
          if (res.citations && res.citations.length) {
            citeEl.innerHTML = res.citations.map((citeId) => citeChip(citeId)).join(' ');
          } else {
            citeEl.innerHTML = '<span class="text-xs text-zinc-400">Không có trích dẫn</span>';
          }
        }
        if (modelEl) modelEl.textContent = `Model: ${res.model || '--'}`;
        if (latEl) latEl.textContent = `Độ trễ: ${res.latency_ms ? (res.latency_ms / 1000).toFixed(2) + ' s' : '--'}`;

        if (aiEl) {
          const runName = escapeHtml(resData?.label || 'lượt đo gần nhất');
          const expected = escapeHtml((res.accepted_status || [c.expected_status]).join(' / '));
          const verdict = res.passed
            ? `<div class="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 mb-2 text-emerald-800 text-xs flex items-center gap-1.5"><i class="ph-bold ph-check-circle text-sm text-emerald-600 shrink-0"></i> <span><strong>${runName}: Đạt</strong> (Kỳ vọng: <code>${expected}</code>).</span></div>`
            : `<div class="p-2.5 bg-rose-50/70 rounded-lg border border-rose-200 mb-2 text-rose-800 text-xs"><p class="font-medium flex items-center gap-1.5"><i class="ph-bold ph-x-circle text-sm text-rose-600 shrink-0"></i> <span><strong>${runName}: Chưa đạt</strong> (Kỳ vọng: <code>${expected}</code> · Thực tế: <code>${escapeHtml(res.actual_status)}</code>).</span></p><p class="mt-1 text-[11px] text-rose-700 leading-relaxed">${escapeHtml(res.failure_reason || '')}</p></div>`;
          const answer = res.answer ? `<div class="text-xs text-zinc-700">${renderMd(res.answer)}</div>` : '';
          aiEl.innerHTML = `${verdict}${answer}<p class="mt-2 text-zinc-500 text-[11px] italic">Câu trả lời lưu từ lượt đo. Bấm "Thử với AI thật" để chạy lại ngay.</p>`;
        }
      }
    });

    $('#golden-run-btn')?.addEventListener('click', async () => {
      const c = state.currentGoldenCase;
      if (!c) return;
      if (c.lecture && c.lecture !== state.lecture) await setLecture(c.lecture);
      openChat();
      // Ca thật: gửi nguyên văn từ chatlog (golden set chỉ lưu turn_id + câu rút gọn).
      const raw = state.currentTurn?.question || c.raw_input || c.question;
      await ask(raw, { display: state.currentTurn?.question_core || c.question, turn: state.currentTurn,
                       section: c.section, exclude: c.exclude_citations || [] });
    });

  } catch (e) {
    console.warn('Could not load golden set:', e);
  }
}

async function runTurn(turn, lecture, then) {
  if (lecture && lecture !== state.lecture) await setLecture(lecture);
  openChat();
  await ask(turn.question, { display: turn.question_core || turn.question, turn, then });
}

// ------------------------------------------------------------------ sự kiện

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('button, [data-tab]');
  if (!t) return;
  if (t.dataset.cite) openSource(t.dataset.cite, state.verifiedQuotes?.[t.dataset.cite] || '');
  else if (t.dataset.report) reportSource(t.dataset.run, t.dataset.report);
  else if (t.dataset.ask) {
    const origin = state.runs[t.dataset.run];
    openChat();
    ask(t.dataset.ask, origin ? { section: origin.run.context.section || origin.section } : {});
  }
  else if (t.dataset.tab) switchTab(t.dataset.tab);
  else if (t.dataset.evidence) { renderEvidence(state.runs[t.dataset.evidence].run); switchTab('evidence'); }
  else if (t.dataset.vote) {
    const entry = state.runs[t.dataset.run];
    api('/api/feedback', { run_id: t.dataset.run, kind: t.dataset.vote, question: entry?.raw, lecture: state.lecture }).catch(() => {});
    t.classList.add(t.dataset.vote === 'up' ? 'text-emerald-600' : 'text-rose-600');
    toast('Đã ghi nhận đánh giá — cảm ơn bạn!');
  } else if (t.dataset.scenario !== undefined) {
    const s = state.scenarios[Number(t.dataset.scenario)];
    runTurn(s.turn, s.lecture, s.then);
  }
});

// Floating Chatbot Widget Button Listeners
$('#chatbot-toggle-btn')?.addEventListener('click', toggleChat);
$('#chatbot-hint')?.addEventListener('click', openChat);
$('#header-chat-btn')?.addEventListener('click', openChat);
$('#chat-close-btn')?.addEventListener('click', closeChat);
$('#chat-expand-btn')?.addEventListener('click', toggleExpandChat);

// Slide Navigation Listeners (Cả nút mũi tên nổi và nút trên thanh công cụ)
$('#slide-arrow-prev')?.addEventListener('click', prevSlide);
$('#slide-arrow-next')?.addEventListener('click', nextSlide);
$('#prev-page')?.addEventListener('click', prevSlide);
$('#next-page')?.addEventListener('click', nextSlide);

// Hỗ trợ phím mũi tên trái/phải bàn phím khi đang xem slide
window.addEventListener('keydown', (ev) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const slideTabActive = !$('#panel-slide')?.classList.contains('hidden');
  if (!slideTabActive) return;
  if (ev.key === 'ArrowLeft') {
    ev.preventDefault();
    prevSlide();
  } else if (ev.key === 'ArrowRight') {
    ev.preventDefault();
    nextSlide();
  }
});

$('#ask-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const val = $('#user-input').value.trim();
  if (!val) return;
  $('#user-input').value = '';
  ask(val);
});

$('#random-turn').addEventListener('click', async () => {
  try {
    const { turn } = await api(`/api/turns/random?lecture=${encodeURIComponent(state.lecture)}&uncited=1`);
    runTurn(turn);
  } catch (e) { toast(e.message); }
});

$('#lecture').addEventListener('change', (ev) => setLecture(ev.target.value));
$('#reset-chat').addEventListener('click', () => { $('#chat-messages').innerHTML = ''; state.history = []; welcome(); });
$('#deck').addEventListener('change', (ev) => showSlide(ev.target.value, 1));
$('#page-input').addEventListener('change', (ev) => { state.pdf.page = Number(ev.target.value) || 1; renderPage(); });
$('#transcript-file').addEventListener('change', (ev) => showTranscript(ev.target.value));
$('#transcript-filter').addEventListener('input', renderTranscript);
$('#transcript-list')?.addEventListener('click', (ev) => {
  const card = ev.target.closest('[id^="para-"]');
  if (card && !ev.target.closest('button')) {
    document.querySelectorAll('.transcript-active-card').forEach((c) => c.classList.remove('transcript-active-card'));
    card.classList.add('transcript-active-card');
    flash(card);
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderPage, 150);
});

// ------------------------------------------------------------------ khởi động

(async function init() {
  switchTab('slide');
  let health;
  try {
    health = await api('/api/health');
  } catch {
    $('#offline').classList.remove('hidden');
    return;
  }
  const pill = $('#ai-status');
  if (health.llm) {
    pill.innerHTML = `<i class="ph-bold ph-lightning text-emerald-600"></i> AI: ${escapeHtml(health.model)}`;
    pill.className = 'text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-100 text-zinc-800 font-mono font-medium';
  } else {
    pill.textContent = 'Chưa có API key — chỉ tìm kiếm';
    pill.className = 'text-[11px] px-2.5 py-1 rounded-md border border-zinc-200 bg-zinc-100 text-zinc-500 font-mono';
  }
  pill.title = `Thứ tự model: ${(health.models || []).join(' → ')}
${health.slide_pages} trang slide · ${health.transcript_paragraphs} đoạn transcript · ${health.chat_turns} lượt chatlog`;

  const data = await api('/api/lectures');
  state.transcriptTitles = data.transcripts;
  for (const l of data.lectures) state.lectures[l.id] = l;
  $('#lecture').innerHTML = data.lectures.map((l) => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('');
  await setLecture('day1', { announce: false });
  setupPinEvents();
  welcome();
  loadScenarios().catch((e) => toast(`Không tải được kịch bản: ${e.message}`));
  loadGoldenSet().catch((e) => console.warn('Lỗi tải golden set:', e));

  // Link chia sẻ một lượt chatlog: index.html#turn=T10472
  const m = location.hash.match(/turn=(T\d{5})/);
  if (m) {
    try {
      const { turn, lecture } = await api(`/api/turns/${m[1]}`);
      await runTurn(turn, lecture);
    } catch (e) { toast(e.message); }
  }
})();
