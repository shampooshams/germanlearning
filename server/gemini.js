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
          german: { type: SchemaType.STRING, description: 'Display form: nouns include the article, e.g. "der Wald"; verbs/adjectives are the base word.' },
          base_form: { type: SchemaType.STRING, description: 'The word without article, e.g. "Wald".' },
          gender: { type: SchemaType.STRING, description: '"der", "die", "das" for nouns, or empty string otherwise.' },
          plural: { type: SchemaType.STRING, description: 'Plural form for nouns, or empty string otherwise.' },
          translation: { type: SchemaType.STRING, description: 'Short English translation.' },
          grammar_note: { type: SchemaType.STRING, description: 'One short, plain-English grammar note relevant to a learner (e.g. case usage, separable prefix, irregular plural, strong/weak verb).' },
          conjugation_present: { type: SchemaType.STRING, description: 'For verbs only: present tense conjugation as "ich X, du X, er/sie/es X, wir X, ihr X, sie/Sie X". Empty string for nouns/adjectives.' },
          example_de: { type: SchemaType.STRING, description: 'Short example sentence in German using this word, ideally adapted from the source text.' },
          example_en: { type: SchemaType.STRING, description: 'English translation of the example sentence.' },
        },
        required: ['type', 'german', 'base_form', 'gender', 'plural', 'translation', 'grammar_note', 'conjugation_present', 'example_de', 'example_en'],
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

async function extractVocabulary(germanText) {
  const prompt = `You are a German language teaching assistant. Read the following German text and extract useful vocabulary for a learner: nouns (with correct article/gender and plural), verbs (with present-tense conjugation), and adjectives.

Pick around 10-20 of the most useful/notable words (skip trivial words like articles, pronouns, and common function words). For each word, produce an example sentence in German — prefer adapting a sentence from the source text itself when possible.

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
