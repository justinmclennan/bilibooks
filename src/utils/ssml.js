
export const PAUSE_MULTIPLIERS = {
  native: 0.6,
  targetHalf: 0.9,    // More time to repeat the new half-sentence
  targetRepeat: 0.7,  // More time to repeat the full sentence
  shadow: 0.4,        // Brief pause for shadow practice
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

  // Add a base minimum for very short sentences
  if (words > 0) pause += 0.5;

  // Round to nearest 0.25s
  pause = Math.round(pause * 4) / 4;

  // Cap at 10s, min 0.5s
  pause = Math.max(0.5, Math.min(10, pause));

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
  // A line is split if both halves are present and have content
  const isSplit = !!(line.targetFirstHalf && line.targetFirstHalf.trim()) &&
                  !!(line.targetSecondHalf && line.targetSecondHalf.trim());

  if (mode === 'shadow') {
    if (isSplit) {
      return [
        { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.shadow, lang: 'target' },
        { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.shadow, lang: 'target' },
        { text: line.target, mult: PAUSE_MULTIPLIERS.shadow, lang: 'target' },
      ];
    } else {
      return [
        { text: line.target, mult: PAUSE_MULTIPLIERS.shadow, lang: 'target' },
        { text: line.target, mult: PAUSE_MULTIPLIERS.shadow, lang: 'target' },
      ];
    }
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
    return targetFirst
      ? [
          { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.targetHalf, lang: 'target' },
          { text: line.nativeFirstHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.targetHalf, lang: 'target' },
          { text: line.nativeSecondHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
        ]
      : [
          { text: line.nativeFirstHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.targetHalf, lang: 'target' },
          { text: line.nativeSecondHalf, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.targetHalf, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat, lang: 'target' },
        ];
  } else {
    // Single format interlinear - repeat full sentence sequence twice for reinforcement
    return targetFirst
      ? [
          { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
        ]
      : [
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat, lang: 'target' },
          { text: line.native, mult: PAUSE_MULTIPLIERS.native, lang: 'native' },
          { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat, lang: 'target' },
        ];
  }
};

export const generateSsml = (chapters, options = {}) => {
  const { mode = 'interlinear', targetFirst = true } = options;
  if (!chapters) return '';

  const normalizedChapters = Array.isArray(chapters) ? chapters : [chapters];

  let output = '<speak>\n';

  normalizedChapters.forEach((chapter, index) => {
    if (chapter.lines) {
      chapter.lines.forEach((line) => {
        const parts = getLineParts(line, { mode, targetFirst });
        parts.forEach((part) => {
          if (part.text) {
            const escaped = escapeSsml(part.text);
            const pause = part.pause || calculatePauseSeconds(part.text, part.mult);
            output += `  ${escaped} ${formatBreak(pause)}\n`;
          }
        });
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
