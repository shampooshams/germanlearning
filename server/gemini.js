const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const wordSchema = {
  type: SchemaType.OBJECT,
  properties: {
    words: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: { type: SchemaType.STRING, enum: ['noun', 'verb', 'adjective'] },
          level: { type: SchemaType.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], description: 'This specific word\'s own CEFR difficulty level, independent of the target band.' },
          german: { type: SchemaType.STRING, description: 'Display form: nouns include the article, e.g. "der Wald"; verbs/adjectives are the base word.' },
          base_form: { type: SchemaType.STRING, description: 'The word without article, e.g. "Wald".' },
          gender: { type: SchemaType.STRING, description: '"der", "die", "das" for nouns, or empty string otherwise.' },
          plural: { type: SchemaType.STRING, description: 'Plural form for nouns, or empty string otherwise.' },
          translation: { type: SchemaType.STRING, description: 'Short English translation.' },
          grammar_note: { type: SchemaType.STRING, description: 'ONE short sentence (max ~12 words), plain-English, e.g. case usage, separable prefix, irregular plural, strong/weak verb.' },
          conjugation_present: { type: SchemaType.STRING, description: 'For verbs only: present tense conjugation as "ich X, du X, er/sie/es X, wir X, ihr X, sie/Sie X". Empty string for nouns/adjectives.' },
          example_de: { type: SchemaType.STRING, description: 'ONE short example sentence (under 12 words) in German using this word, ideally adapted from the source text.' },
          example_en: { type: SchemaType.STRING, description: 'English translation of example_de. Under 12 words.' },
        },
        required: ['type', 'level', 'german', 'base_form', 'gender', 'plural', 'translation', 'grammar_note', 'conjugation_present', 'example_de', 'example_en'],
      },
    },
  },
  required: ['words'],
};

const model = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: wordSchema,
  },
});

const LEVEL_GUIDANCE = {
  'A1-A2': 'The learner is a beginner (CEFR A1-A2). Favor common, everyday words and skip rare or literary vocabulary; simplify grammar notes accordingly.',
  'B1': 'The learner is intermediate (CEFR B1). Favor words a bit beyond basic vocabulary, including some common idiomatic or abstract terms.',
  'B2-C1': 'The learner is advanced (CEFR B2-C1). Favor richer, less common, or nuanced vocabulary, including literary/idiomatic words, and skip overly basic words.',
};

async function extractVocabulary(germanText, level) {
  const guidance = LEVEL_GUIDANCE[level] || LEVEL_GUIDANCE['A1-A2'];
  const prompt = `You are a German language teaching assistant. Read the following German text and extract useful vocabulary for a learner: nouns (with correct article/gender and plural), verbs (with present-tense conjugation), and adjectives.

${guidance}

Pick around 8-14 of the most useful/notable words for that target level (skip trivial words like articles, pronouns, and common function words). For each word also give its own CEFR level (the word's real difficulty may differ from the learner's target level). Keep every field brief — this is a quick-reference flashcard, not an essay. For each word, produce a short example sentence in German, ideally adapted from the source text itself.

Text:
"""
${germanText}
"""`;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (err) {
      const isOverloaded = err.message && err.message.includes('503');
      if (!isOverloaded || attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

module.exports = { extractVocabulary };
