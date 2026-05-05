export const createSilenceBuffer = (durationSeconds, sampleRate = 24000) => {
  const numSamples = Math.floor(durationSeconds * sampleRate);
  return Buffer.alloc(numSamples * 2, 0);
};

export const concatenateWavs = (audioBuffers) => {
  const totalPcmLength = audioBuffers.reduce((acc, curr) => acc + curr.buffer.length, 0);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalPcmLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(24000 * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(totalPcmLength, 40);
  return Buffer.concat([header, ...audioBuffers.map(b => b.buffer)]);
};
