import { getOptionalUser, renderNav } from "./nav.js";
import { db } from "./firebase-init.js";
import {
  collection, writeBatch, doc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { recordActivity } from "./activity.js";

const user = await getOptionalUser();
renderNav('home', user);

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
  renderReview(words, user);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderWordRow(w) {
  return `
    <div class="word-row">
      <input type="checkbox" class="word-checkbox" data-idx="${w._idx}" checked>
      <div>
        <div class="word-main">${escapeHtml(w.german)} &mdash; ${escapeHtml(w.translation)}</div>
        ${w.plural ? `<div class="word-plural">plural: ${escapeHtml(w.plural)}</div>` : ''}
        ${w.conjugation_present ? `<div class="word-conj">${escapeHtml(w.conjugation_present)}</div>` : ''}
        ${w.grammar_note ? `<div class="word-note">${escapeHtml(w.grammar_note)}</div>` : ''}
        <div class="word-example">
          "${escapeHtml(w.example_de)}"
          <span class="en">${escapeHtml(w.example_en)}</span>
        </div>
      </div>
    </div>
  `;
}

function updateSelectedCount() {
  const total = document.querySelectorAll('.word-checkbox').length;
  const checked = document.querySelectorAll('.word-checkbox:checked').length;
  document.getElementById('selected-count').textContent = `${checked} of ${total} selected`;
}

function renderReview(words, user) {
  const groups = { noun: [], verb: [], adjective: [] };
  words.forEach((w, i) => {
    w._idx = i;
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

  const saveLabel = user ? 'save flashcards' : 'sign in to save flashcards';
  html += `
      <p class="error-text" id="save-error"></p>
      <div class="review-footer">
        <span class="selected-count" id="selected-count"></span>
        <button class="btn btn-primary" id="save-btn" type="button">${saveLabel}</button>
      </div>
    </div>
  `;
  content.innerHTML = html;

  updateSelectedCount();
  content.querySelectorAll('.word-checkbox').forEach((cb) => {
    cb.addEventListener('change', updateSelectedCount);
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    if (!user) {
      window.location.href = 'login.html?returnTo=review.html';
      return;
    }
    saveSelected(words, user);
  });
}

async function saveSelected(words, user) {
  const saveBtn = document.getElementById('save-btn');
  const errorText = document.getElementById('save-error');
  const checkedIdxs = Array.from(document.querySelectorAll('.word-checkbox:checked')).map((cb) => Number(cb.dataset.idx));

  errorText.textContent = '';
  if (!checkedIdxs.length) {
    errorText.textContent = 'select at least one word to save.';
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'saving...';

  try {
    const batch = writeBatch(db);
    const flashcardsRef = collection(db, 'users', user.uid, 'flashcards');
    checkedIdxs.forEach((idx) => {
      const { _idx, ...wordData } = words[idx];
      const ref = doc(flashcardsRef);
      batch.set(ref, {
        ...wordData,
        addedAt: serverTimestamp(),
        timesReviewed: 0,
        lastReviewed: null,
        known: false,
      });
    });
    await batch.commit();
    await recordActivity(user.uid, {
      action: 'saved_words',
      detail: `saved ${checkedIdxs.length} word${checkedIdxs.length === 1 ? '' : 's'} to flashcards`,
    });
    sessionStorage.removeItem('vocabflow_extraction');
    window.location.href = 'study.html';
  } catch (err) {
    errorText.textContent = `could not save flashcards: ${err.message}`;
    saveBtn.textContent = 'save flashcards';
    saveBtn.disabled = false;
  }
}
