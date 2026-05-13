
export const PAUSE_MULTIPLIERS = {
  native: 0.75,
  target: 0.50,
  shadow: 0.30,
};

export const countWords = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

export const escapeSsml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const calculatePauseSeconds = (text, multiplier) => {
  const words = countWords(text);
  let pause = words * multiplier;

  // Round to nearest 0.25s
  pause = Math.round(pause * 4) / 4;

  // Cap at 10s, min 0.25s
  pause = Math.max(0.25, Math.min(10, pause));

  return pause.toFixed(2);
};

export const formatBreak = (seconds) => {
  return `<break time="${seconds}s"/>`;
};

/**
 * Returns an array of parts for a given line based on the mode.
 * Each part contains: { text, mult, pause, lang }
 */
export const getLineParts = (line, options = {}) => {
  const { mode = 'interlinear', targetFirst = true } = options;
  const isSplit = !!(line.targetFirstHalf && line.targetFirstHalf.trim()) &&
                  !!(line.targetSecondHalf && line.targetSecondHalf.trim());

  if (mode === 'shadow') {
    return [
      { text: line.target, mult: PAUSE_MULTIPLIERS.shadow, lang: 'target' },
    ];
  }

  if (mode === 'story') {
    const words = countWords(line.target);
    let pause = 1.0;
    if (words < 8) pause = 0.7;
    else if (words < 15) pause = 0.85;
    return [{ text: line.target, pause: pause.toFixed(2), lang: 'target' }];
  }

  // Interlinear Mode
  if (isSplit) {
    // 6-line pattern for A2/B1
    return targetFirst
      ? [
          { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
          { text: line.nativeFirstHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
          { text: line.nativeSecondHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
        ]
      : [
          { text: line.nativeFirstHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
          { text: line.nativeSecondHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
        ];
  } else {
    // Pre-A1 and A1: Full line pattern
    return targetFirst
      ? [
          { text: line.target, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
        ]
      : [
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.target, lang: 'target' },
        ];
  }
};

export const generateSsml = (chapters, options = {}) => {
  const { mode = 'interlinear', targetFirst = true } = options;
  if (!chapters) return '';

  const normalizedChapters = Array.isArray(chapters) ? chapters : [chapters];

  let output = '<speak>\n';
  let markIndex = 0;

  normalizedChapters.forEach((chapter, index) => {
    if (chapter.lines) {
      chapter.lines.forEach((line, lineIdx) => {
        const parts = getLineParts(line, { mode, targetFirst });
        parts.forEach((part, partIdx) => {
          if (part.text) {
            const escaped = escapeSsml(part.text);
            const pause = part.pause || calculatePauseSeconds(part.text, part.mult);
            const markName = `mark_${index}_${lineIdx}_${partIdx}`;
            output += `  <mark name="${markName}"/>${escaped}\n  ${formatBreak(pause)}\n`;
          }
        });
        output += '\n'; // Add newline between 6-line blocks for readability
      });
    }

    // 2.0s pause between chapters
    if (index < normalizedChapters.length - 1) {
      output += `  ${formatBreak(2.0)}\n`;
    }
  });

  output += '</speak>';
  return output;
};

export const generateReadable = (chapters, options = {}) => {
  const { mode = 'interlinear', targetFirst = true } = options;
  if (!chapters) return '';

  const normalizedChapters = Array.isArray(chapters) ? chapters : [chapters];
  let output = '';

  normalizedChapters.forEach((chapter) => {
    if (chapter.chapterTitle) {
      output += `### ${chapter.chapterTitle}\n\n`;
    }
    if (chapter.lines) {
      chapter.lines.forEach((line) => {
        const parts = getLineParts(line, { mode, targetFirst });
        parts.forEach((part) => {
          if (part.text) {
            output += `${part.text}\n`;
          }
        });
        output += '\n';
      });
    }
    output += '\n';
  });

  return output.trim();
};
