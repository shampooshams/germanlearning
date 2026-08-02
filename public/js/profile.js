import { requireAuthOrRedirect, renderNav } from "./nav.js";
import { db } from "./firebase-init.js";
import {
  collection, getDocs, doc, getDoc, query, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const user = await requireAuthOrRedirect();
renderNav('profile');

const content = document.getElementById('content');

const [userSnap, cardsSnap, activitySnap] = await Promise.all([
  getDoc(doc(db, 'users', user.uid)),
  getDocs(collection(db, 'users', user.uid, 'flashcards')),
  getDocs(query(collection(db, 'users', user.uid, 'activity'), orderBy('createdAt', 'desc'), limit(10))),
]);

const userData = userSnap.exists() ? userSnap.data() : {};
const streak = userData.currentStreak || 0;
const cards = cardsSnap.docs.map((d) => d.data());
const activities = activitySnap.docs.map((d) => d.data());

const totalWords = cards.length;
const reviewedCount = cards.filter((c) => (c.timesReviewed || 0) > 0).length;

const typeCounts = { noun: 0, verb: 0, adjective: 0 };
cards.forEach((c) => { if (typeCounts[c.type] !== undefined) typeCounts[c.type] += 1; });

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function streakSquares(streakCount) {
  let html = '';
  for (let i = 6; i >= 0; i -= 1) {
    html += `<div class="sq ${i < streakCount ? 'filled' : ''}"></div>`;
  }
  return html;
}

function breakdownRow(label, count) {
  const pct = totalWords ? Math.round((count / totalWords) * 100) : 0;
  return `
    <div class="breakdown-row">
      <div class="breakdown-label"><span>${label}</span><span>${count}</span></div>
      <div class="breakdown-track"><div class="breakdown-fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

const activityLabels = {
  saved_words: 'saved words',
  study_session: 'studied flashcards',
};

let activityHtml = '<p class="empty-note">no activity yet — go extract some vocabulary to get started.</p>';
if (activities.length) {
  activityHtml = activities.map((a) => `
    <div class="activity-row">
      <span>${escapeHtml(a.detail || activityLabels[a.action] || a.action)}</span>
      <span class="activity-time">${timeAgo(a.createdAt)}</span>
    </div>
  `).join('');
}

content.innerHTML = `
  <h1 class="headline" style="color: var(--cream); margin: 0.5rem 0 1rem;">your progress</h1>

  <div class="stats-row">
    <div class="card stat-card">
      <p class="caption">study streak</p>
      <div class="stat-number">${streak}<span class="unit">day${streak === 1 ? '' : 's'}</span></div>
      <div class="streak-squares">${streakSquares(streak)}</div>
    </div>
    <div class="card stat-card">
      <p class="caption">total vocabulary</p>
      <div class="stat-number">${totalWords}<span class="unit">saved</span></div>
      <p class="stat-sub">${reviewedCount} of ${totalWords} reviewed at least once</p>
    </div>
  </div>

  <div class="card section-card">
    <h2 class="headline">vocabulary breakdown</h2>
    ${breakdownRow('nouns', typeCounts.noun)}
    ${breakdownRow('verbs', typeCounts.verb)}
    ${breakdownRow('adjectives', typeCounts.adjective)}
  </div>

  <div class="card section-card">
    <h2 class="headline">recent activity</h2>
    ${activityHtml}
  </div>
`;
