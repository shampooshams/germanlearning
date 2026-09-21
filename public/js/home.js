import { renderNav } from "./nav.js";

renderNav('home');

const textarea = document.getElementById('german-text');
const wordCount = document.getElementById('word-count');
const wordHint = document.getElementById('word-hint');
const extractBtn = document.getElementById('extract-btn');
const errorText = document.getElementById('error-text');

const DEFAULT_LEVEL = 'A1-A2';

function countWords(str) {
  const trimmed = str.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function updateWordCount() {
  const count = countWords(textarea.value);
  wordCount.textContent = `${count} words`;
  if (count === 0) {
    wordHint.textContent = 'paste at least a few sentences for good results';
  } else if (count < 20) {
    wordHint.textContent = 'a bit more text will give better results';
  } else if (count <= 150) {
    wordHint.textContent = 'good length, go ahead';
  } else {
    wordHint.textContent = 'long text, extraction may take a little longer';
  }
}

updateWordCount();

textarea.addEventListener('input', updateWordCount);

extractBtn.addEventListener('click', async () => {
  const text = textarea.value.trim();
  errorText.textContent = '';
  if (countWords(text) < 3) {
    errorText.textContent = 'paste a bit more text so we have enough to work with.';
    return;
  }

  extractBtn.disabled = true;
  const loadingMessages = ['reading your text...', 'finding vocabulary...', 'checking grammar...', 'almost done...'];
  let msgIndex = 0;
  extractBtn.textContent = loadingMessages[0];
  const loadingTimer = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    extractBtn.textContent = loadingMessages[msgIndex];
  }, 3000);

  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, level: DEFAULT_LEVEL }),
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
    clearInterval(loadingTimer);
    extractBtn.disabled = false;
    extractBtn.textContent = 'extract vocabulary';
  }
});
