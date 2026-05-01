
export const PAUSE_MULTIPLIERS = {
  native: 0.75,
  targetHalf: 0.50,
  targetRepeat: 0.40,
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

const getParts = (line, targetFirst, mode) => {
  if (mode === 'shadow') {
    return [
      { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.shadow },
      { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.shadow },
      { text: line.target, mult: PAUSE_MULTIPLIERS.shadow },
    ];
  }
  if (mode === 'story') {
    const words = countWords(line.target);
    let pause = 1.0;
    if (words < 8) pause = 0.7;
    else if (words < 15) pause = 0.85;
    return [{ text: line.target, pause: pause.toFixed(2) }];
  }

  // Interlinear
  return targetFirst
    ? [
        { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.targetHalf },
        { text: line.nativeFirstHalf, mult: PAUSE_MULTIPLIERS.native },
        { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.targetHalf },
        { text: line.nativeSecondHalf, mult: PAUSE_MULTIPLIERS.native },
        { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat },
        { text: line.native, mult: PAUSE_MULTIPLIERS.native },
      ]
    : [
        { text: line.nativeFirstHalf, mult: PAUSE_MULTIPLIERS.native },
        { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.targetHalf },
        { text: line.nativeSecondHalf, mult: PAUSE_MULTIPLIERS.native },
        { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.targetHalf },
        { text: line.native, mult: PAUSE_MULTIPLIERS.native },
        { text: line.target, mult: PAUSE_MULTIPLIERS.targetRepeat },
      ];
};

export const generateSsml = (lines, options = {}) => {
  const { mode = 'interlinear', targetFirst = true } = options;
  let output = '<speak>\n';

  lines.forEach((line) => {
    const parts = getParts(line, targetFirst, mode);
    parts.forEach((part) => {
      if (part.text) {
        const escaped = escapeSsml(part.text);
        const pause = part.pause || calculatePauseSeconds(part.text, part.mult);
        output += `  ${escaped} ${formatBreak(pause)}\n`;
      }
    });
  });

  output += '</speak>';
  return output;
};

export const generateReadable = (lines, options = {}) => {
  const { mode = 'interlinear', targetFirst = true } = options;
  let output = '';

  lines.forEach((line) => {
    const parts = getParts(line, targetFirst, mode);
    parts.forEach((part) => {
      if (part.text) {
        output += `${part.text}\n`;
      }
    });
    output += '\n';
  });

  return output.trim();
};
