function currentPage() {
  return window.location.pathname.split('/').pop() || 'home.html';
}

// Resolves to the signed-in user, or null for guests. Never redirects.
// Firebase is loaded lazily so pages with no login features (home, review)
// never pull in the auth SDK.
export async function getOptionalUser() {
  const { auth } = await import('./firebase-init.js');
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

// For pages that require login (study, profile): resolves to the user,
// or redirects to login (preserving the page to return to) if signed out.
export async function requireAuthOrRedirect() {
  const { auth } = await import('./firebase-init.js');
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');
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

export function renderNav(activePage) {
  const root = document.getElementById('nav-root');
  if (!root) return;

  root.innerHTML = `
    <div class="nav-bar">
      <a class="nav-brand" href="home.html">easyy<wbr>peasyy<span class="nav-brand-accent">German</span></a>
      <div class="nav-links">
        <a href="home.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">home</a>
      </div>
    </div>
  `;
}
