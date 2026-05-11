const LIBRARY_KEY = 'linguStory_library';

/**
 * Saves a story package to localStorage.
 */
export const saveStory = (storyData, formData, contentVersions) => {
  const library = getLibrary();

  const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newStory = {
    id,
    title: storyData.title || 'Untitled Story',
    createdAt: new Date().toISOString(),
    baseLanguage: formData.baseLanguage,
    targetLanguage: formData.targetLanguage,
    level: formData.level,
    chapterCount: formData.chapterCount,
    wordsPerChapter: formData.wordsPerChapter,
    sentenceLevelStyle: formData.sentenceLevelStyle,
    storyIdea: formData.storyIdea,
    storyArc: storyData.storyArc,
    chapters: storyData.chapters || (storyData.lines ? [{ lines: storyData.lines }] : []),
    vocabulary: storyData.vocabularyList || [],
    contentVersions,
    formData, // Storing full formData for future reference
    storyData, // Storing full storyData for future reference
  };

  library.unshift(newStory);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  return id;
};

/**
 * Retrieves all stories from localStorage.
 */
export const getLibrary = () => {
  const data = localStorage.getItem(LIBRARY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse library from localStorage', err);
    return [];
  }
};

/**
 * Retrieves a single story by ID from localStorage.
 */
export const getStoryById = (id) => {
  const library = getLibrary();
  return library.find(story => story.id === id) || null;
};

/**
 * Deletes a story by ID.
 */
export const deleteStory = async (id) => {
  // 1. Delete from backend if applicable
  if (id && !id.startsWith('local-')) {
    try {
      await fetch(`/api/library/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete story from backend', err);
    }
  }

  // 2. Delete from localStorage
  const library = getLibrary();
  const updatedLibrary = library.filter(story => story.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(updatedLibrary));
};
