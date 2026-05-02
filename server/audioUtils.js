
/**
 * Creates a WAV header for PCM data.
 */
export function createWavHeader(dataLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Creates a raw PCM silence buffer of a specified duration.
 */
export function createSilenceBuffer(durationSeconds, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const numSamples = Math.floor(durationSeconds * sampleRate * numChannels);
  const bufferSize = (numSamples * bitsPerSample) / 8;
  return Buffer.alloc(bufferSize);
}

/**
 * Concatenates multiple PCM buffers into one single WAV.
 * Expects input buffers to be raw PCM data (as returned by Google Cloud TTS LINEAR16).
 */
export function concatenateWavs(buffersAndSilences, sampleRate = 24000) {
  // Extract raw PCM data
  const rawData = buffersAndSilences.map(item => item.buffer);

  const totalLength = rawData.reduce((acc, buf) => acc + buf.length, 0);
  const header = createWavHeader(totalLength, sampleRate);

  return Buffer.concat([header, ...rawData]);
}
