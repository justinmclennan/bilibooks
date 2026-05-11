const STORY_ADDED_WORDS_KEY = 'linguStory_story_added_words';

export const getStoryAddedWords = (storyId) => {
  const data = localStorage.getItem(STORY_ADDED_WORDS_KEY);
  if (!data) return [];
  try {
    const allWords = JSON.parse(data);
    return allWords.filter(w => w.storyId === storyId);
  } catch (err) {
    console.error('Failed to parse story added words', err);
    return [];
  }
};

export const addWordToStory = (storyId, targetWord, nativeWord = '', source = 'manual', exampleSentenceTarget = null, exampleSentenceNative = null) => {
  const data = localStorage.getItem(STORY_ADDED_WORDS_KEY);
  let allWords = [];
  if (data) {
    try {
      allWords = JSON.parse(data);
    } catch (err) {
      console.error('Failed to parse story added words', err);
    }
  }

  // Check for duplicates
  const isDuplicate = allWords.some(
    w => w.storyId === storyId && w.targetWord.toLowerCase() === targetWord.toLowerCase()
  );

  if (isDuplicate) {
    return { success: false, message: 'This word is already in this chapter’s flashcards.' };
  }

  const newWord = {
    id: `added-${storyId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    storyId,
    targetWord,
    nativeWord,
    source,
    exampleSentenceTargetLanguage: exampleSentenceTarget,
    exampleSentenceNativeLanguage: exampleSentenceNative,
    createdAt: new Date().toISOString()
  };

  allWords.push(newWord);
  localStorage.setItem(STORY_ADDED_WORDS_KEY, JSON.stringify(allWords));
  return { success: true, word: newWord };
};

export const removeWordFromStory = (wordId) => {
  const data = localStorage.getItem(STORY_ADDED_WORDS_KEY);
  if (!data) return;
  try {
    let allWords = JSON.parse(data);
    allWords = allWords.filter(w => w.id !== wordId);
    localStorage.setItem(STORY_ADDED_WORDS_KEY, JSON.stringify(allWords));
  } catch (err) {
    console.error('Failed to parse story added words', err);
  }
};

export const getAllStoryAddedWords = () => {
  const data = localStorage.getItem(STORY_ADDED_WORDS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse all story added words', err);
    return [];
  }
};
