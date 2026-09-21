import { renderNav } from "./nav.js";

renderNav('home');

const content = document.getElementById('content');
const stored = sessionStorage.getItem('vocabflow_extraction');

if (!stored) {
  content.innerHTML = `
    <div class="empty-state">
      <p>no vocabulary to review yet.</p>
      <a href="home.html">go paste some german text &rarr;</a>
    </div>
  `;
} else {
  const { words } = JSON.parse(stored);
  renderReview(words);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderWordRow(w) {
  return `
    <div class="word-row">
      <div class="word-badges">
        ${w.level ? `<span class="badge badge-level">${escapeHtml(w.level)}</span>` : ''}
        <span class="badge badge-type">${escapeHtml(w.type)}</span>
      </div>
      <div class="word-main">${escapeHtml(w.german)}: ${escapeHtml(w.translation)}</div>
      ${w.plural ? `<div class="word-plural">plural: ${escapeHtml(w.plural)}</div>` : ''}
      ${w.conjugation_present ? `<div class="word-conj">${escapeHtml(w.conjugation_present)}</div>` : ''}
      ${w.grammar_note ? `<div class="word-note">${escapeHtml(w.grammar_note)}</div>` : ''}
      <div class="word-example">
        "${escapeHtml(w.example_de)}"
        <span class="en">${escapeHtml(w.example_en)}</span>
      </div>
    </div>
  `;
}

function renderReview(words) {
  const groups = { noun: [], verb: [], adjective: [] };
  words.forEach((w) => {
    if (!groups[w.type]) groups[w.type] = [];
    groups[w.type].push(w);
  });

  const labels = { noun: 'nouns', verb: 'verbs', adjective: 'adjectives' };
  let html = `
    <h1 class="headline" style="color: var(--cream); margin: 0.5rem 0 0.15rem;">vocabulary found</h1>
    <p class="caption" style="margin-bottom: 1rem;">${words.length} words extracted from your text</p>
    <div class="card review-card">
  `;

  for (const type of ['noun', 'verb', 'adjective']) {
    const list = groups[type];
    if (!list || !list.length) continue;
    html += `<div class="section-label">${labels[type]}</div>`;
    html += list.map(renderWordRow).join('');
  }

  html += `
      <div class="review-more">
        <a href="home.html" class="link-terracotta">paste more text &rarr;</a>
      </div>
    </div>
  `;
  content.innerHTML = html;
}
