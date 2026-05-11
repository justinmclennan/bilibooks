import { getLibrary } from './library';
import { getAllStoryAddedWords, removeWordFromStory } from './storyAddedWords';

const FLASHCARDS_STATUS_KEY = 'linguStory_flashcards_status';

/**
 * Retrieves all flashcards by deriving them from the saved stories in the library.
 * Handles deduplication and merges with review status from separate storage.
 */
export const getGlobalFlashcards = () => {
  const library = getLibrary();
  const statusMap = getFlashcardsStatus();
  const flashcardsMap = {};

  library.forEach(story => {
    const vocab = story.vocabulary || [];
    const addedWords = getAllStoryAddedWords().filter(w => w.storyId === story.id);

    const combinedVocab = [
      ...vocab,
      ...addedWords.map(w => ({
        id: w.id,
        target: w.targetWord,
        native: w.nativeWord,
        exampleSentenceTargetLanguage: w.exampleSentenceTargetLanguage || null,
        exampleSentenceNativeLanguage: w.exampleSentenceNativeLanguage || null,
        storyId: w.storyId // Ensure storyId is preserved if needed, though filter already passed
      }))
    ];

    combinedVocab.forEach(item => {
      // Filter out deleted cards
      const status = statusMap[item.id] || statusMap[`${(item.termTargetLanguage || item.target || "").toLowerCase()}_${story.targetLanguage.toLowerCase()}_${story.baseLanguage.toLowerCase()}`];
      if (status && status.reviewStatus === 'deleted') return;

      // Handle both old and new formats
      const termTarget = item.termTargetLanguage || item.target;
      const termNative = item.termNativeLanguage || item.native;

      if (!termTarget) return;

      const key = `${termTarget.toLowerCase()}_${story.targetLanguage.toLowerCase()}_${story.baseLanguage.toLowerCase()}`;

      if (!flashcardsMap[key]) {
        // Find example sentence in story if missing (fallback for older stories)
        let exampleTarget = item.exampleSentenceTargetLanguage;
        let exampleNative = item.exampleSentenceNativeLanguage;

        if (!exampleTarget) {
          const foundSentence = findExampleInStory(termTarget, story);
          if (foundSentence) {
            exampleTarget = foundSentence.target;
            exampleNative = foundSentence.native;
          }
        }

        const status = statusMap[key] || {
          reviewStatus: 'new',
          reviewCount: 0,
          lastReviewedAt: null
        };

        flashcardsMap[key] = {
          id: key,
          termTargetLanguage: termTarget,
          termNativeLanguage: termNative,
          exampleSentenceTargetLanguage: exampleTarget || null,
          exampleSentenceNativeLanguage: exampleNative || null,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          targetLanguage: story.targetLanguage,
          baseLanguage: story.baseLanguage,
          level: story.level,
          createdAt: story.createdAt,
          ...status
        };
      } else {
        // If duplicate, we could potentially add secondary examples here if desired
        // For now, keep it simple as per instructions
      }
    });
  });

  return Object.values(flashcardsMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Finds an example sentence in the story chapters that contains the term.
 */
const findExampleInStory = (term, story) => {
  if (!story.chapters) return null;

  const termLower = term.toLowerCase();

  for (const chapter of story.chapters) {
    if (!chapter.lines) continue;
    for (const line of chapter.lines) {
      if (line.target && line.target.toLowerCase().includes(termLower)) {
        return line;
      }
    }
  }
  return null;
};

/**
 * Retrieves the review status of all flashcards from localStorage.
 */
export const getFlashcardsStatus = () => {
  const data = localStorage.getItem(FLASHCARDS_STATUS_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse flashcards status', err);
    return {};
  }
};

/**
 * Deletes a flashcard by marking its status as 'deleted'.
 */
export const deleteFlashcard = (cardId) => {
  if (cardId.startsWith('added-')) {
    removeWordFromStory(cardId);
  } else {
    updateFlashcardStatus(cardId, 'deleted');
  }
};

/**
 * Updates the review status of a flashcard.
 */
export const updateFlashcardStatus = (cardId, newStatus) => {
  const statusMap = getFlashcardsStatus();

  const currentStatus = statusMap[cardId] || {
    reviewStatus: 'new',
    reviewCount: 0,
    lastReviewedAt: null
  };

  statusMap[cardId] = {
    ...currentStatus,
    reviewStatus: newStatus,
    reviewCount: currentStatus.reviewCount + 1,
    lastReviewedAt: new Date().toISOString()
  };

  localStorage.setItem(FLASHCARDS_STATUS_KEY, JSON.stringify(statusMap));
};
