
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
  return (words * multiplier).toFixed(2);
};

export const formatBreak = (seconds) => {
  return `<break time="${seconds}s"/>`;
};

export const generateInterlinearSsml = (lines, options = { targetFirst: true }) => {
  const { targetFirst } = options;
  let output = '<speak>\n';

  lines.forEach((line) => {
    const parts = targetFirst
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

    parts.forEach((part) => {
      if (part.text) {
        const escaped = escapeSsml(part.text);
        const pause = calculatePauseSeconds(part.text, part.mult);
        output += `  ${escaped} ${formatBreak(pause)}\n`;
      }
    });
  });

  output += '</speak>';
  return output;
};

export const generateShadowSsml = (lines) => {
  let output = '<speak>\n';

  lines.forEach((line) => {
    const parts = [
      { text: line.targetFirstHalf, mult: PAUSE_MULTIPLIERS.shadow },
      { text: line.targetSecondHalf, mult: PAUSE_MULTIPLIERS.shadow },
      { text: line.target, mult: PAUSE_MULTIPLIERS.shadow },
    ];

    parts.forEach((part) => {
      if (part.text) {
        const escaped = escapeSsml(part.text);
        const pause = calculatePauseSeconds(part.text, part.mult);
        output += `  ${escaped} ${formatBreak(pause)}\n`;
      }
    });
  });

  output += '</speak>';
  return output;
};

export const generateStoryOnlySsml = (lines) => {
  let output = '<speak>\n';

  lines.forEach((line) => {
    if (line.target) {
      const escaped = escapeSsml(line.target);
      const words = countWords(line.target);
      let pause = 1.0;
      if (words < 8) pause = 0.7;
      else if (words < 15) pause = 0.85;

      output += `  ${escaped} ${formatBreak(pause.toFixed(2))}\n`;
    }
  });

  output += '</speak>';
  return output;
};
