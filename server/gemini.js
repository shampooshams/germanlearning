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
  A1: 'The learner is a true beginner (CEFR A1). Only extract the most basic, everyday words: simple concrete nouns, high-frequency verbs (like sein, haben, gehen, machen), and simple descriptive adjectives. Skip anything even slightly advanced, abstract, or idiomatic.',
  A2: 'The learner is an elementary learner (CEFR A2). Extract common everyday vocabulary a step beyond the absolute basics: routines, simple descriptions, common regular and irregular verbs. Skip literary, abstract, or rare words.',
  B1: 'The learner is intermediate (CEFR B1). Extract words a bit beyond basic vocabulary, including some common idiomatic or abstract terms, and less common but still everyday verbs and nouns.',
  B2: 'The learner is upper-intermediate (CEFR B2). Extract richer, less common vocabulary: more nuanced verbs and adjectives, common idiomatic expressions, and moderately abstract nouns. Skip overly basic words.',
  C1: 'The learner is advanced (CEFR C1). Extract nuanced, less common, or literary/formal vocabulary: idiomatic expressions, subtle synonyms, and abstract or sophisticated terms. Skip anything too basic or commonplace.',
};

async function extractVocabulary(germanText, level) {
  const guidance = LEVEL_GUIDANCE[level] || LEVEL_GUIDANCE.A1;
  const prompt = `You are a German language teaching assistant. Read the following German text and extract useful vocabulary for a learner: nouns (with correct article/gender and plural), verbs (with present-tense conjugation), and adjectives.

${guidance}

Only extract words whose real difficulty matches CEFR level ${level} specifically — skip words that belong to a different level, even if they appear in the text. Extract every word in the text that clearly fits CEFR level ${level}, up to a maximum of 25 words (skip trivial words like articles, pronouns, and common function words regardless of level). If the text only contains a handful of words at this level, return just those — don't invent or pad with words that aren't naturally present in the text. Keep every field brief — this is a quick-reference flashcard, not an essay. For each word, produce a short example sentence in German, ideally adapted from the source text itself.

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
