// VLearn Grounded Tutor — giao diện prototype. Mọi dữ liệu lấy từ server.py (data pack thật + OpenAI/Gemini).
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
  history: [],
  busy: false,
  pdf: { deck: null, doc: null, page: 1, task: null, docs: {} },
  transcript: { file: null, paras: [] },
};

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
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

function citeLabel(id) {
  const m = id.match(/^D(\d)-p(\d+)$/);
  return m ? `Slide D${m[1]} · tr.${m[2]}` : id;
}

function citeChip(id, extraClass = '') {
  const s = state.sources[id];
  const title = s ? `${s.label} — ${s.title}` : id;
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
      if ((m = line.match(/^#{1,4}\s+(.*)$/))) out.push(`<p class="font-semibold text-slate-900">${inlineMd(m[1])}</p>`);
      else if (line.trim()) out.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  if (code) out.push(`<pre>${code.join('\n')}</pre>`);
  closeList();
  return `<div class="md">${out.join('')}</div>`;
}

// ------------------------------------------------------------------ tab trái

function switchTab(name) {
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.id !== `panel-${name}`));
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('bg-white', on);
    t.classList.toggle('text-slate-900', on);
    t.classList.toggle('text-slate-500', !on);
  });
  if (name === 'slide' && state.pdf.doc) renderPage();
  if (name === 'transcript' && !state.transcript.file && $('#transcript-file').value) {
    loadTranscript($('#transcript-file').value).catch((e) => toast(e.message));
  }
}

function flash(el) {
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

async function renderPage() {
  const { doc } = state.pdf;
  if (!doc) return;
  const page = Math.min(Math.max(1, state.pdf.page), doc.numPages);
  state.pdf.page = page;
  $('#page-input').value = page;
  const pdfPage = await doc.getPage(page);
  const stage = $('#slide-stage');
  const base = pdfPage.getViewport({ scale: 1 });
  const cssWidth = Math.max(320, stage.clientWidth - 32);
  const dpr = window.devicePixelRatio || 1;
  const viewport = pdfPage.getViewport({ scale: (cssWidth / base.width) * dpr });
  const canvas = $('#slide-canvas');
  if (state.pdf.task) state.pdf.task.cancel();
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${viewport.height / dpr}px`;
  state.pdf.task = pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport });
  try { await state.pdf.task.promise; } catch (e) { if (e?.name !== 'RenderingCancelledException') throw e; }
}

async function showSlide(deck, page, quote) {
  switchTab('slide');
  try {
    if (state.pdf.deck !== deck) await loadDeck(deck);
    state.pdf.page = page;
    await renderPage();
  } catch (e) {
    toast(`Không mở được slide: ${e.message}`);
    return;
  }
  const box = $('#slide-quote');
  if (quote) {
    box.innerHTML = `<i class="ph-bold ph-quotes"></i> Trợ giảng dẫn <strong>${escapeHtml(quote.label)}</strong> — ${escapeHtml(quote.title)}`;
    box.classList.remove('hidden');
    flash($('#slide-frame'));
  } else {
    box.classList.add('hidden');
  }
}

async function loadTranscript(file) {
  if (state.transcript.file === file) return;
  const data = await api(`/api/transcript/${encodeURIComponent(file)}`);
  state.transcript = { file, paras: data.paragraphs };
  $('#transcript-file').value = file;
  $('#transcript-filter').value = '';
  renderTranscript();
}

async function showTranscript(file, highlightId) {
  $('#transcript-file').value = file;  // để switchTab (nếu có tải) cũng tải đúng file này
  switchTab('transcript');
  await loadTranscript(file);
  if (highlightId) {
    const el = document.getElementById(`para-${highlightId}`);
    if (el) {
      el.classList.remove('hidden');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      flash(el);
    }
  }
}

function renderTranscript() {
  const filter = $('#transcript-filter').value.trim().toLowerCase();
  let lastHeading = null;
  const html = state.transcript.paras.map((p) => {
    const hidden = filter && !p.text.toLowerCase().includes(filter) && !p.id.toLowerCase().includes(filter);
    const heading = p.title !== lastHeading ? `<div class="pt-2 font-bold text-indigo-900 ${hidden ? 'hidden' : ''}">${escapeHtml(p.title.split(' · ').slice(1).join(' · ') || p.title)}</div>` : '';
    if (!hidden) lastHeading = p.title;
    return `${heading}<div id="para-${p.id}" class="rounded-md border border-slate-200 p-2.5 ${hidden ? 'hidden' : ''}">
      <span class="font-mono text-[10.5px] font-bold text-indigo-700">[${p.id}]</span>
      <span class="text-slate-700 whitespace-pre-line leading-relaxed">${escapeHtml(p.text)}</span></div>`;
  }).join('');
  $('#transcript-list').innerHTML = html || '<p class="text-slate-500">Không có đoạn nào khớp.</p>';
}

async function openSource(id) {
  const s = state.sources[id];
  if (!s) { toast(`Chưa có thông tin nguồn ${id}`); return; }
  if (s.kind === 'slide') await showSlide(s.deck, s.page, s);
  else await showTranscript(s.source, id);
}

function renderEvidence(run) {
  const cited = new Set([...(run.citations || []), ...(run.where_ids || [])]);
  const rows = run.retrieved.map((r) => {
    const s = state.sources[r.id] || {};
    const scope = r.scope === 'lecture'
      ? '<span class="px-1.5 rounded bg-indigo-100 text-indigo-700">bài đang học</span>'
      : '<span class="px-1.5 rounded bg-slate-200 text-slate-600">bài khác · chỉ để chỉ đường</span>';
    const mark = cited.has(r.id) ? '<span class="px-1.5 rounded bg-emerald-100 text-emerald-700 font-semibold">được dẫn</span>' : '';
    return `<div class="border border-slate-200 rounded-md p-2.5 mb-2">
      <div class="flex items-center gap-1.5 flex-wrap">${citeChip(r.id)} ${scope} ${mark}
        <span class="ml-auto text-slate-400 font-mono">BM25 ${r.score}</span></div>
      <div class="font-semibold text-slate-800 mt-1">${escapeHtml(s.title || '')}</div>
      <div class="text-slate-500 mt-0.5">${escapeHtml((s.snippet || '').replace(/\s*\n\s*/g, ' · '))}</div></div>`;
  }).join('');
  const excluded = run.excluded?.length ? `<p class="mb-2 text-purple-700">Đã loại theo phản hồi của bạn: ${run.excluded.map(escapeHtml).join(', ')}</p>` : '';
  $('#panel-evidence').innerHTML = `
    <p class="text-slate-500 mb-2">Câu hỏi: <strong class="text-slate-800">${escapeHtml(run.question)}</strong>
    — tra ${run.retrieved.length} đoạn trong ${run.latency_ms.retrieval} ms. Chỉ đoạn "bài đang học" được dùng làm căn cứ.</p>
    ${excluded}${rows || '<p class="text-slate-500">Không tìm thấy đoạn nào có từ khoá khớp.</p>'}`;
  $('#evidence-count').textContent = `(${run.retrieved.length})`;
}

// ------------------------------------------------------------------ chat

function scrollChat() {
  const c = $('#chat-messages');
  c.scrollTop = c.scrollHeight;
}

function aiBubble(inner) {
  const div = document.createElement('div');
  div.className = 'flex items-start gap-2.5';
  div.innerHTML = `<div class="w-7 h-7 rounded-full bg-indigo-700 text-white flex items-center justify-center shrink-0 text-xs font-bold">AI</div>
    <div class="bubble bg-slate-100 text-slate-800 text-xs rounded-2xl rounded-tl-sm p-3.5 max-w-[92%] shadow-sm border border-slate-200 min-w-0">${inner}</div>`;
  $('#chat-messages').appendChild(div);
  scrollChat();
  return div.querySelector('.bubble');
}

function welcome() {
  const lec = state.lectures[state.lecture];
  aiBubble(`
    <p class="font-semibold mb-1 text-indigo-900">Chào bạn! Mình là trợ giảng VLearn ở chế độ "có căn cứ".</p>
    <p class="text-slate-600 mb-2 leading-relaxed">Mình trả lời dựa trên <strong>slide và transcript của ${escapeHtml(lec?.title || 'bài đang học')}</strong>.
    Mỗi ý có thẻ nguồn — bấm vào để mở đúng trang slide hoặc đoạn transcript mà kiểm lại.</p>
    <ul class="text-[11px] text-slate-500 border-t border-slate-200 pt-2 space-y-0.5">
      <li><i class="ph ph-shield-check text-indigo-600"></i> Không có trong tài liệu bài này → mình nói rõ và chỉ chỗ nên tìm, không đoán.</li>
      <li><i class="ph ph-question text-amber-600"></i> Câu hỏi quá ngắn/mơ hồ → mình hỏi lại, bạn bấm chọn.</li>
      <li><i class="ph ph-flag text-rose-600"></i> Mình có thể dẫn sai trang → bấm ⚑ cạnh nguồn, mình tìm lại mà không dùng nguồn đó.</li>
    </ul>`);
}

function addUser(text, turn) {
  const div = document.createElement('div');
  div.className = 'flex items-start justify-end gap-2';
  let meta = '';
  if (turn) {
    const oldBadge = turn.original_has_citation
      ? '<span class="text-emerald-700">có trích dẫn</span>'
      : '<span class="text-rose-700 font-semibold">không trích dẫn</span>';
    meta = `<div class="mb-1.5 text-[10.5px] text-indigo-100 flex flex-wrap gap-x-2">
        <span><i class="ph ph-database"></i> Câu hỏi thật · ${escapeHtml(turn.turn_id)} · ${escapeHtml(turn.cohort)} · ${escapeHtml(turn.lecture_code)} · ${escapeHtml(turn.asked_at)}</span>
        ${turn.section ? `<span>Phần: “${escapeHtml(turn.section)}”</span>` : ''}</div>`;
    const old = `<details class="mt-2 bg-white/95 text-slate-700 rounded-lg p-2">
        <summary class="cursor-pointer text-[11px] font-semibold">Tutor cũ đã trả lời (${oldBadge}, nước đi ${escapeHtml(turn.move_used || '—')})</summary>
        <div class="mt-1.5 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-line text-[11px] leading-relaxed">${escapeHtml(turn.original_reply)}</div>
      </details>`;
    div.innerHTML = `<div class="bg-indigo-600 text-white text-xs rounded-2xl rounded-tr-sm p-3 max-w-[88%] shadow-sm min-w-0">
        ${meta}<div class="whitespace-pre-line">${escapeHtml(text)}</div>${turn.selected ? `<div class="mt-1 text-[11px] text-indigo-200">Đoạn bôi đen: “${escapeHtml(turn.selected.slice(0, 160))}”</div>` : ''}${old}</div>
      <div class="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 text-[10px] font-bold">HV</div>`;
  } else {
    div.innerHTML = `<div class="bg-indigo-600 text-white text-xs rounded-2xl rounded-tr-sm p-3 max-w-[85%] shadow-sm whitespace-pre-line">${escapeHtml(text)}</div>
      <div class="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">Tôi</div>`;
  }
  $('#chat-messages').appendChild(div);
  scrollChat();
}

function systemNote(html) {
  const div = document.createElement('div');
  div.className = 'text-center text-[11px] text-slate-500';
  div.innerHTML = `<span class="inline-block bg-slate-100 border border-slate-200 rounded-full px-3 py-1">${html}</span>`;
  $('#chat-messages').appendChild(div);
  scrollChat();
}

const STATUS = {
  answer: ['bg-emerald-100 text-emerald-800 border-emerald-200', 'ph-seal-check', (r) => `Có căn cứ · ${r.citations.length} nguồn`],
  clarify: ['bg-amber-100 text-amber-800 border-amber-200', 'ph-question', () => 'Cần hỏi lại cho rõ'],
  not_found: ['bg-rose-100 text-rose-800 border-rose-200', 'ph-shield-warning', () => 'Không có trong tài liệu bài này'],
  ungrounded: ['bg-orange-100 text-orange-800 border-orange-200', 'ph-warning', () => 'Không đủ căn cứ — đã ẩn câu trả lời'],
  search_only: ['bg-slate-200 text-slate-700 border-slate-300', 'ph-magnifying-glass', () => 'Chưa qua AI — chỉ gợi ý đoạn khớp từ khoá'],
};

function renderRun(bubble, run) {
  const [cls, icon, label] = STATUS[run.status] || STATUS.not_found;
  const badges = [`<span class="inline-flex items-center gap-1 border rounded-full px-2 py-0.5 font-semibold ${cls}"><i class="ph-bold ${icon}"></i> ${escapeHtml(label(run))}</span>`];
  if (run.mode !== 'llm' && run.status !== 'search_only') badges.push('<span class="border rounded-full px-2 py-0.5 bg-slate-200 text-slate-700 border-slate-300">Chưa qua AI</span>');
  if (run.flags.includes('injection')) badges.push('<span class="border rounded-full px-2 py-0.5 bg-purple-100 text-purple-800 border-purple-200"><i class="ph ph-shield"></i> Câu hỏi có chỉ dẫn lạ — không làm theo</span>');
  if (run.flags.includes('section_mismatch')) badges.push('<span class="border rounded-full px-2 py-0.5 bg-rose-50 text-rose-700 border-rose-200"><i class="ph ph-link-break"></i> Tài liệu tìm được thuộc phần khác</span>');
  if (run.excluded.length) badges.push(`<span class="border rounded-full px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200">Tìm lại, bỏ nguồn ${run.excluded.map(escapeHtml).join(', ')}</span>`);

  let body = run.status === 'ungrounded'
    ? `<p class="text-orange-800 mb-1">Trợ giảng viết được câu trả lời nhưng không gắn được vào đoạn tài liệu nào, nên không hiển thị như một câu trả lời chắc chắn.</p>
       <details><summary class="cursor-pointer text-[11px] text-slate-500">Xem bản nháp chưa có căn cứ</summary><div class="mt-1 opacity-70">${renderMd(run.answer)}</div></details>`
    : renderMd(run.answer);

  if (run.clarify_options?.length) {
    body += `<div class="mt-2 space-y-1.5">${run.clarify_options.map((o) => `
      <button type="button" data-ask="${escapeHtml(o)}" data-run="${run.run_id}" class="w-full text-left bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 p-2 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-between gap-2">
        <span>${escapeHtml(o)}</span><i class="ph ph-caret-right text-slate-400"></i></button>`).join('')}</div>`;
  }
  if (run.where_to_look) {
    body += `<div class="mt-2 p-2 rounded-lg bg-white border border-slate-200"><div class="font-semibold text-slate-700 mb-0.5"><i class="ph ph-compass"></i> Nên tìm ở đâu</div>${renderMd(run.where_to_look)}</div>`;
  }
  if (run.removed_citations?.length) {
    body += `<p class="mt-2 text-[11px] text-orange-700"><i class="ph ph-eraser"></i> Đã gỡ ${run.removed_citations.length} mã nguồn không nằm trong tài liệu đã tra: ${run.removed_citations.map(escapeHtml).join(', ')}</p>`;
  }
  if (run.error) body += `<p class="mt-2 text-[11px] text-rose-700"><i class="ph ph-plug"></i> Không gọi được AI: ${escapeHtml(run.error)}</p>`;
  if (run.model_fallback_errors?.length) body += `<p class="mt-2 text-[10.5px] text-slate-500"><i class="ph ph-arrows-left-right"></i> Đã chuyển sang ${escapeHtml(run.model)} vì: ${escapeHtml(run.model_fallback_errors.join(' · '))}</p>`;

  const sources = run.citations.map((id) => `<span class="inline-flex items-center">${citeChip(id)}<button type="button" data-report="${id}" data-run="${run.run_id}" title="Nguồn này không khớp — tìm lại" class="text-slate-400 hover:text-rose-600 px-0.5">⚑</button></span>`).join(' ');
  const ms = run.latency_ms.total >= 1000 ? `${(run.latency_ms.total / 1000).toFixed(1)} s` : `${run.latency_ms.total} ms`;

  bubble.innerHTML = `
    <div class="flex flex-wrap gap-1 mb-2 text-[10.5px]">${badges.join('')}</div>
    ${body}
    ${run.reason ? `<p class="mt-2 text-[11px] text-slate-500 italic"><i class="ph ph-lightbulb"></i> Vì sao: ${escapeHtml(run.reason)}</p>` : ''}
    <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-1 min-w-0">${sources ? `<span class="text-[10.5px] text-slate-500">Nguồn:</span> ${sources}` : ''}</div>
      <div class="flex items-center gap-1.5 text-slate-400 shrink-0">
        <button type="button" data-vote="up" data-run="${run.run_id}" title="Hữu ích" class="hover:text-emerald-600"><i class="ph ph-thumbs-up"></i></button>
        <button type="button" data-vote="down" data-run="${run.run_id}" title="Chưa đúng" class="hover:text-rose-600"><i class="ph ph-thumbs-down"></i></button>
      </div>
    </div>
    <div class="mt-1 text-[10px] text-slate-400 flex flex-wrap gap-x-2">
      <span>${escapeHtml(run.model || 'không dùng AI')}</span><span>${ms}</span>
      <button type="button" data-evidence="${run.run_id}" class="underline hover:text-slate-600">xem ${run.retrieved.length} đoạn đã tra</button>
    </div>`;
  scrollChat();
}

async function ask(raw, { display, turn = null, exclude = [], section = null, then = null } = {}) {
  if (state.busy) { toast('Đang chờ câu trả lời trước…'); return; }
  state.busy = true;
  $('#send-btn').disabled = true;
  if (display !== null) addUser(display ?? raw, turn);
  const sec = section ?? (turn ? '' : $('#section').value);
  const bubble = aiBubble('<span class="text-slate-500"><i class="ph ph-spinner animate-spin"></i> Đang tra slide &amp; transcript rồi hỏi AI… <span class="elapsed">0</span>s</span>');
  const started = Date.now();
  const timer = setInterval(() => { const e = bubble.querySelector('.elapsed'); if (e) e.textContent = Math.round((Date.now() - started) / 1000); }, 500);
  try {
    const run = await api('/api/ask', { question: raw, lecture: state.lecture, section: sec, history: state.history.slice(-4), exclude });
    Object.assign(state.sources, run.sources);
    if (run.model) $('#ai-status').lastChild.textContent = ` AI thật: ${run.model}`;
    state.runs[run.run_id] = { run, raw, section: sec };
    renderRun(bubble, run);
    renderEvidence(run);
    state.history.push({ role: 'user', text: run.question }, { role: 'assistant', text: run.answer });
    const first = run.citations[0] || run.where_ids?.[0];
    if (first) openSource(first);
    if (then === 'report_first_citation' && run.citations.length) {
      setTimeout(() => reportSource(run.run_id, run.citations[0]), 1500);
    }
  } catch (e) {
    bubble.innerHTML = `<p class="text-rose-700">Không nhận được câu trả lời: ${escapeHtml(e.message)}</p>`;
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
  $('#suggestions').innerHTML = '<span class="text-[11px] text-slate-400 py-0.5">Thử hỏi:</span>' + suggestions.map((s) =>
    `<button type="button" data-ask="${escapeHtml(s)}" class="text-[11px] bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-300 px-2 py-0.5 rounded-full text-slate-600">${escapeHtml(s)}</button>`).join('');

  if (announce) systemNote(`Đang học: <strong>${escapeHtml(lec.title)}</strong>`);
  state.transcript.file = null;
  if (decks.length) {
    state.pdf.page = 1;
    showSlide(decks[0], 1).catch(() => {});  // không chặn chat khi PDF còn đang tải
  }
}

async function loadScenarios() {
  const { scenarios } = await api('/api/scenarios');
  const color = {
    happy: 'text-emerald-300', 'low-confidence': 'text-amber-300', failure: 'text-rose-300', correction: 'text-purple-300',
  };
  const pathName = { happy: 'chuẩn', 'low-confidence': 'mơ hồ', failure: 'khó', correction: 'sửa nguồn' };
  $('#scenarios').innerHTML = scenarios.map((s, i) => `
    <button type="button" data-scenario="${i}" title="${escapeHtml(s.turn.question)}"
      class="shrink-0 text-xs px-2 py-1 bg-indigo-800 hover:bg-indigo-700 rounded border border-indigo-700 ${color[s.path] || ''} hover:text-white whitespace-nowrap">
      <span class="opacity-70">${escapeHtml(pathName[s.path] || s.path)} ·</span> ${escapeHtml(s.label)}</button>`).join('');
  state.scenarios = scenarios;
}

async function runTurn(turn, lecture, then) {
  if (lecture && lecture !== state.lecture) await setLecture(lecture);
  await ask(turn.question, { display: turn.question_core || turn.question, turn, then });
}

// ------------------------------------------------------------------ sự kiện

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('button, [data-tab]');
  if (!t) return;
  if (t.dataset.cite) openSource(t.dataset.cite);
  else if (t.dataset.report) reportSource(t.dataset.run, t.dataset.report);
  else if (t.dataset.ask) {
    const origin = state.runs[t.dataset.run];  // lựa chọn hỏi lại → giữ ngữ cảnh phần đang học của câu gốc
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
$('#prev-page').addEventListener('click', () => { state.pdf.page -= 1; renderPage(); $('#slide-quote').classList.add('hidden'); });
$('#next-page').addEventListener('click', () => { state.pdf.page += 1; renderPage(); $('#slide-quote').classList.add('hidden'); });
$('#page-input').addEventListener('change', (ev) => { state.pdf.page = Number(ev.target.value) || 1; renderPage(); });
$('#transcript-file').addEventListener('change', (ev) => showTranscript(ev.target.value));
$('#transcript-filter').addEventListener('input', renderTranscript);
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderPage, 200); });

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
    pill.innerHTML = `<i class="ph-bold ph-lightning text-emerald-400"></i> AI thật: ${escapeHtml(health.model)}`;
    pill.className = 'text-[11px] px-2 py-1 rounded border border-emerald-600 bg-emerald-900/60 text-emerald-100';
  } else {
    pill.textContent = 'Chưa có API key — chỉ tìm kiếm';
    pill.className = 'text-[11px] px-2 py-1 rounded border border-amber-500 bg-amber-900/60 text-amber-100';
  }
  pill.title = `Thứ tự model: ${(health.models || []).join(' → ')}
${health.slide_pages} trang slide · ${health.transcript_paragraphs} đoạn transcript · ${health.chat_turns} lượt chatlog`;

  const data = await api('/api/lectures');
  state.transcriptTitles = data.transcripts;
  for (const l of data.lectures) state.lectures[l.id] = l;
  $('#lecture').innerHTML = data.lectures.map((l) => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('');
  await setLecture('day1', { announce: false });
  welcome();
  loadScenarios().catch((e) => toast(`Không tải được kịch bản: ${e.message}`));

  // Link chia sẻ một lượt chatlog: index.html#turn=T10472
  const m = location.hash.match(/turn=(T\d{5})/);
  if (m) {
    try {
      const { turn, lecture } = await api(`/api/turns/${m[1]}`);
      await runTurn(turn, lecture);
    } catch (e) { toast(e.message); }
  }
})();
