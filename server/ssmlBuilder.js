
/**
 * Escapes XML special characters in a string.
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

/**
 * Calculates the pause duration based on line type and word count.
 *
 * Rules:
 * - en_chunk: 0.75 * word count
 * - fr_chunk: 0.5 * word count
 * - en_full: 0.75 * word count
 * - fr_full: 0.5 * word count
 * - fr_shadow: 0.3 * word count
 *
 * Pause constraints:
 * - Round to nearest 0.25s
 * - Min: 0.25s
 * - Max: 10s
 */
function calculatePause(text, type) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  let multiplier = 0.5;

  if (type === 'en_chunk' || type === 'en_full') {
    multiplier = 0.75;
  } else if (type === 'fr_shadow') {
    multiplier = 0.3;
  }

  let pause = multiplier * wordCount;

  // Round to nearest 0.25
  pause = Math.round(pause * 4) / 4;

  // Constraints
  pause = Math.max(0.25, Math.min(10, pause));

  return pause;
}

/**
 * Builds SSML for Amazon Polly from an array of line objects.
 * @param {Array} lines - Array of { text, type }
 * @returns {string} - Valid SSML string
 */
export function buildPollySSML(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('Invalid or empty lines');
  }

  const spokenLines = lines
    .filter(line => line.text && line.text.trim())
    .map(line => {
      const escapedText = escapeXml(line.text.trim());
      const pause = calculatePause(line.text, line.type);
      return `${escapedText} <break time="${pause}s"/>`;
    });

  return `<speak>\n${spokenLines.join('\n')}\n</speak>`;
}
