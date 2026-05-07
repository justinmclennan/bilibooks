/**
 * Saves a story package to the backend API (and implicitly to local filesystem).
 * Updates if libraryItemId is provided.
 */
export const saveStory = async (storyData, formData, contentVersions, audioFiles, libraryItemId) => {
  const body = {
    id: libraryItemId,
    storyData,
    formData,
    contentVersions,
    audioFiles
  };

  const response = await fetch('/api/library/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to save to library');
  }

  return await response.json();
};

/**
 * Retrieves all stories from the backend API.
 */
export const getLibrary = async () => {
  const response = await fetch('/api/library');
  if (!response.ok) throw new Error('Failed to fetch library');
  return await response.json();
};

/**
 * Retrieves a single story by ID from the backend API.
 */
export const getStoryById = async (id) => {
  const response = await fetch(`/api/library/${id}`);
  if (!response.ok) throw new Error('Failed to fetch story details');
  return await response.json();
};
