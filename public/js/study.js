import { requireAuthOrRedirect, renderNav } from "./nav.js";
import { db } from "./firebase-init.js";
import {
  collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, increment,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { recordActivity } from "./activity.js";

const user = await requireAuthOrRedirect();
renderNav('study');

const content = document.getElementById('content');
content.innerHTML = `<p style="color: var(--cream); text-align:center; padding: 3rem 0;">loading your flashcards...</p>`;

const cardsRef = collection(db, 'users', user.uid, 'flashcards');
const snap = await getDocs(query(cardsRef, orderBy('addedAt', 'asc')));
const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

let index = 0;
let flipped = false;

if (!cards.length) {
  content.innerHTML = `
    <div class="empty-state">
      <p>you don't have any flashcards yet.</p>
      <a href="home.html">paste some german text to get started &rarr;</a>
    </div>
  `;
} else {
  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function render() {
  const card = cards[index];
  const typeLabel = { noun: 'noun', verb: 'verb', adjective: 'adjective' }[card.type] || card.type;
  const progressPct = Math.round(((index + 1) / cards.length) * 100);

  content.innerHTML = `
    <div class="study-topbar">
      <a href="home.html">&larr;</a>
      <span class="progress-pill">${index + 1} / ${cards.length}</span>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>

    <div class="flip-card" id="flip-card">
      ${flipped ? `
        <div class="type-tag">${typeLabel}</div>
        <div class="back-translation">${escapeHtml(card.translation)}</div>
        ${card.plural ? `<div class="back-detail">plural: ${escapeHtml(card.plural)}</div>` : ''}
        ${card.conjugation_present ? `<div class="back-detail">${escapeHtml(card.conjugation_present)}</div>` : ''}
        ${card.grammar_note ? `<div class="back-detail">${escapeHtml(card.grammar_note)}</div>` : ''}
        <div class="back-example">"${escapeHtml(card.example_de)}"<br>${escapeHtml(card.example_en)}</div>
      ` : `
        <div class="type-tag">${typeLabel}</div>
        <div class="front-word">${escapeHtml(card.german)}</div>
        <div class="tap-hint">tap to flip</div>
      `}
    </div>

    <div class="study-btn-row">
      <button class="btn btn-outline" id="prev-btn" type="button" ${index === 0 ? 'disabled' : ''}>previous</button>
      <button class="btn btn-outline" id="next-btn" type="button">next</button>
    </div>
  `;

  document.getElementById('flip-card').addEventListener('click', onFlip);
  document.getElementById('prev-btn').addEventListener('click', onPrev);
  document.getElementById('next-btn').addEventListener('click', onNext);
}

async function onFlip() {
  flipped = !flipped;
  render();
  if (flipped) {
    const card = cards[index];
    try {
      await updateDoc(doc(db, 'users', user.uid, 'flashcards', card.id), {
        timesReviewed: increment(1),
        lastReviewed: serverTimestamp(),
      });
    } catch (err) {
      console.error('could not record review:', err.message);
    }
  }
}

function onPrev() {
  if (index === 0) return;
  index -= 1;
  flipped = false;
  render();
}

async function onNext() {
  const wasLast = index === cards.length - 1;
  index = (index + 1) % cards.length;
  flipped = false;
  render();
  if (wasLast) {
    try {
      await recordActivity(user.uid, { action: 'study_session', detail: `studied ${cards.length} flashcard${cards.length === 1 ? '' : 's'}` });
    } catch (err) {
      console.error('could not record activity:', err.message);
    }
  }
}
