import { useState } from 'react';
import { getLineParts, calculatePauseSeconds } from '../utils/ssml';

const ScriptCard = ({
  id,
  label,
  ssml,
  readable,
  mode,
  targetFirst,
  chapters,
  formData,
  onCopy,
  onDownload,
  onAudioGenerated,
  libraryItemId,
  initialAudioUrl,
  initialAudioFormat
}) => {
  const [subTab, setSubTab] = useState('preview');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || null);
  const [audioError, setAudioError] = useState(null);
  const [audioFormat, setAudioFormat] = useState(initialAudioFormat || 'wav');

  const generateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    try {
      let body = {};
      const isBilingual = mode === 'interlinear';

      if (isBilingual) {
        // Build segments for interlinear stitching
        const segments = [];
        chapters.forEach((chapter, cIdx) => {
          chapter.lines.forEach(line => {
            const parts = getLineParts(line, { mode, targetFirst });
            parts.forEach(p => {
              const pause = p.pause || calculatePauseSeconds(p.text, p.mult);
              segments.push({ type: 'speech', lang: p.lang, text: p.text });
              segments.push({ type: 'pause', duration: parseFloat(pause) });
            });
          });
          if (cIdx < chapters.length - 1) {
            segments.push({ type: 'pause', duration: 2.0 });
          }
        });
        body = { segments, targetLanguage: formData.targetLanguage, baseLanguage: formData.baseLanguage };
      } else {
        // Send SSML for target-only scripts
        if (!ssml || !ssml.includes('<speak>')) {
          throw new Error('No valid SSML available for this script yet.');
        }
        body = { ssml, targetLanguage: formData.targetLanguage };
      }

      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Audio generation failed');
      }

      // If libraryItemId is provided, save/attach audio to story
      if (libraryItemId) {
        try {
          await fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: libraryItemId,
              storyData: { title: formData.title }, // Minimal storyData for context
              formData,
              audioFiles: [{ id, audioContent: data.audioContent, format: data.format }]
            }),
          });
        } catch (saveErr) {
          console.warn('Failed to attach audio to library story:', saveErr);
        }
      }

      const byteCharacters = atob(data.audioContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.format === 'mp3' ? 'audio/mpeg' : 'audio/wav' });

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioFormat(data.format || 'wav');

      if (onAudioGenerated) {
        onAudioGenerated({ audioContent: data.audioContent, format: data.format || 'wav' });
      }
    } catch (err) {
      console.error(err);
      setAudioError(err.message);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${id}.${audioFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isBilingual = mode === 'interlinear';
  const hasSsml = ssml && ssml.includes('<speak>');

  return (
    <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden ${audioUrl ? 'border-emerald-500/30' : ''}`}>
      <div className="bg-surface-container-low px-lg py-3 flex justify-between items-center border-b border-outline-variant">
        <h4 className="font-headline-sm text-on-surface">
          {label} {isBilingual ? '(Dual Voice)' : '(Target Only)'}
        </h4>
        <div className="flex bg-surface-container rounded-lg p-1">
          <button
            onClick={() => setSubTab('preview')}
            className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'preview' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}
          >
            PREVIEW
          </button>
          <button
            onClick={() => setSubTab('ssml')}
            className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${subTab === 'ssml' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}
          >
            SSML CODE
          </button>
        </div>
      </div>

      <div className="p-lg">
        <div className="relative mb-lg">
          <pre className="bg-surface-container-low p-md rounded-lg overflow-x-auto text-sm font-mono text-on-surface-variant h-48 no-scrollbar border border-outline-variant">
            {subTab === 'preview' ? readable : ssml}
          </pre>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => onCopy(subTab === 'preview' ? readable : ssml)}
              className="p-2 bg-white/80 backdrop-blur hover:bg-white rounded-lg shadow-sm transition-all material-symbols-outlined text-primary text-sm"
              title="Copy to clipboard"
            >
              content_copy
            </button>
            <button
              onClick={() => onDownload(
                subTab === 'preview' ? readable : ssml,
                `${id}.${subTab === 'preview' ? 'txt' : 'ssml'}`,
                subTab === 'preview' ? 'text/plain' : 'application/ssml+xml'
              )}
              className="p-2 bg-white/80 backdrop-blur hover:bg-white rounded-lg shadow-sm transition-all material-symbols-outlined text-secondary text-sm"
              title="Download file"
            >
              download
            </button>
          </div>
        </div>

        <div className="pt-lg border-t border-outline-variant flex flex-col sm:flex-row items-center gap-lg">
          {!isGeneratingAudio && (
            <button
              onClick={generateAudio}
              disabled={!isBilingual && !hasSsml}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-headline-sm transition-all active:scale-[0.98] disabled:opacity-50 ${audioUrl ? 'bg-surface-container text-on-surface-variant border border-outline-variant' : 'bg-secondary text-on-secondary hover:bg-secondary-container'}`}
            >
              <span className="material-symbols-outlined">{audioUrl ? 'refresh' : 'headphones'}</span>
              {(!isBilingual && !hasSsml) ? 'No SSML Available' : (audioUrl ? 'Regenerate Audio' : `Generate ${isBilingual ? 'Bilingual ' : ''}Audio`)}
            </button>
          )}

          {isGeneratingAudio && (
            <div className="flex items-center gap-3 text-secondary">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span className="font-headline-sm">Generating {isBilingual ? 'Dual-Voice ' : ''}audio...</span>
            </div>
          )}

          {audioUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-md w-full">
              <audio controls src={audioUrl} className="h-10 flex-grow" />
              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 px-4 py-2 border-2 border-secondary text-secondary rounded-lg font-label-caps hover:bg-secondary/5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download {audioFormat.toUpperCase()}
              </button>
            </div>
          )}
        </div>

        {audioError && (
          <div className="mt-md p-md bg-error-container text-on-error-container rounded-lg border border-error/20 flex items-center gap-md animate-in slide-in-from-top-2">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="font-body-sm">{audioError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptCard;
