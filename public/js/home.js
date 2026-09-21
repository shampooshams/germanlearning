import { getOptionalUser, renderNav } from "./nav.js";

const user = await getOptionalUser();
renderNav('home', user);

const textarea = document.getElementById('german-text');
const wordCount = document.getElementById('word-count');
const wordHint = document.getElementById('word-hint');
const extractBtn = document.getElementById('extract-btn');
const errorText = document.getElementById('error-text');
const chips = document.querySelectorAll('.chip');
const levelBtns = document.querySelectorAll('.level-btn');

const SAMPLES = {
  news: {
    level: 'B1',
    text: 'Die Stadt Berlin plant den Bau eines neuen Radwegs entlang der Spree. Nach Angaben der Verkehrsbehörde soll das Projekt im nächsten Jahr beginnen und rund zwei Jahre dauern. Anwohner begrüßen die Pläne, weil der Verkehr in der Innenstadt seit Monaten zunimmt. Die Kosten werden auf zehn Millionen Euro geschätzt.',
  },
  tale: {
    level: 'A1-A2',
    text: 'Es war einmal ein kleines Mädchen, das im Wald wohnte. Jeden Tag ging es zu seiner Großmutter und brachte ihr Brot und Wein. Eines Tages traf das Mädchen einen Wolf im Wald. Der Wolf war groß und hungrig, aber das Mädchen hatte keine Angst und lief schnell weiter.',
  },
  poem: {
    level: 'B2-C1',
    text: 'Ich weiß nicht, was soll es bedeuten, dass ich so traurig bin. Ein Märchen aus alten Zeiten, das kommt mir nicht aus dem Sinn. Die Luft ist kühl und es dunkelt, und ruhig fließt der Rhein. Der Gipfel des Berges funkelt im Abendsonnenschein.',
  },
};

let selectedLevel = 'A1-A2';

function setLevel(level) {
  selectedLevel = level;
  levelBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.level === level));
}

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
    wordHint.textContent = 'good length — go ahead';
  } else {
    wordHint.textContent = 'long text — extraction may take a little longer';
  }
}

setLevel(selectedLevel);
updateWordCount();

textarea.addEventListener('input', () => {
  chips.forEach((chip) => chip.classList.remove('active'));
  updateWordCount();
});

levelBtns.forEach((btn) => {
  btn.addEventListener('click', () => setLevel(btn.dataset.level));
});

chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const sample = SAMPLES[chip.dataset.sample];
    if (!sample) return;
    textarea.value = sample.text;
    setLevel(sample.level);
    updateWordCount();
    chips.forEach((c) => c.classList.toggle('active', c === chip));
  });
});

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
    const headers = { 'Content-Type': 'application/json' };
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, level: selectedLevel }),
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
