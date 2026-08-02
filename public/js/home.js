import { getOptionalUser, renderNav } from "./nav.js";

const user = await getOptionalUser();
renderNav('home', user);

const textarea = document.getElementById('german-text');
const wordCount = document.getElementById('word-count');
const extractBtn = document.getElementById('extract-btn');
const errorText = document.getElementById('error-text');

function countWords(str) {
  const trimmed = str.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

textarea.addEventListener('input', () => {
  wordCount.textContent = `${countWords(textarea.value)} words`;
});

extractBtn.addEventListener('click', async () => {
  const text = textarea.value.trim();
  errorText.textContent = '';
  if (countWords(text) < 3) {
    errorText.textContent = 'paste a bit more text so we have enough to work with.';
    return;
  }

  extractBtn.disabled = true;
  extractBtn.textContent = 'extracting...';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'extraction failed');
    }
    sessionStorage.setItem('vocabflow_extraction', JSON.stringify({
      sourceText: text,
      words: data.words,
      extractedAt: Date.now(),
    }));
    window.location.href = 'review.html';
  } catch (err) {
    errorText.textContent = err.message || 'something went wrong, please try again.';
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = 'extract vocabulary';
  }
});
