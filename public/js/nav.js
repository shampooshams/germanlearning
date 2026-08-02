import { auth } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

function currentPage() {
  return window.location.pathname.split('/').pop() || 'home.html';
}

// Resolves to the signed-in user, or null for guests. Never redirects.
export function getOptionalUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

// For pages that require login (study, profile): resolves to the user,
// or redirects to login (preserving the page to return to) if signed out.
export function requireAuthOrRedirect() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) {
        window.location.href = `login.html?returnTo=${encodeURIComponent(currentPage())}`;
      } else {
        resolve(user);
      }
    });
  });
}

export function renderNav(activePage, user) {
  const root = document.getElementById('nav-root');
  if (!root) return;

  const links = user
    ? [
        { id: 'home', label: 'home', href: 'home.html' },
        { id: 'study', label: 'study', href: 'study.html' },
        { id: 'profile', label: 'profile', href: 'profile.html' },
      ]
    : [{ id: 'home', label: 'home', href: 'home.html' }];

  const authAction = user
    ? `<button class="nav-link nav-signout" id="nav-signout" type="button">sign out</button>`
    : `<a href="login.html?returnTo=${encodeURIComponent(currentPage())}" class="nav-link" style="color: var(--mustard);">sign in</a>`;

  root.innerHTML = `
    <div class="nav-bar">
      <a class="nav-brand" href="home.html">vocabflow</a>
      <div class="nav-links">
        ${links.map(l => `<a href="${l.href}" class="nav-link ${activePage === l.id ? 'active' : ''}">${l.label}</a>`).join('')}
        ${authAction}
      </div>
    </div>
  `;

  if (user) {
    document.getElementById('nav-signout').addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'home.html';
    });
  }
}
