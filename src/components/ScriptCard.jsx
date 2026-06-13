import { useState } from 'react';
import { getLineParts, calculatePauseSeconds } from '../utils/ssml';

const ScriptCard = ({ id, label, ssml, readable, mode, targetFirst, chapters, formData, onCopy, onDownload, onAudioGenerated }) => {
  const [subTab, setSubTab] = useState('preview');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [audioFormat, setAudioFormat] = useState('wav');

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
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
      <div className="bg-surface-container-low px-lg py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant">
        <h4 className="font-headline-sm text-on-surface leading-tight">
          {label}
        </h4>
        <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/30">
          <button
            onClick={() => setSubTab('preview')}
            className={`px-5 py-2 text-[10px] font-bold rounded-lg uppercase tracking-widest transition-all ${subTab === 'preview' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Preview
          </button>
          <button
            onClick={() => setSubTab('ssml')}
            className={`px-5 py-2 text-[10px] font-bold rounded-lg uppercase tracking-widest transition-all ${subTab === 'ssml' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            SSML Code
          </button>
        </div>
      </div>

      <div className="p-lg md:p-xl space-y-xl">
        <div className="relative">
          <pre className="bg-slate-900 p-lg rounded-xl overflow-x-auto text-sm font-mono text-slate-300 h-56 no-scrollbar border border-slate-800 shadow-inner">
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

        <div className="pt-xl border-t border-outline-variant flex flex-col sm:flex-row items-center gap-lg">
          {!audioUrl && !isGeneratingAudio && (
            <button
              onClick={generateAudio}
              disabled={!isBilingual && !hasSsml}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              <span className="material-symbols-outlined">headphones</span>
              {(!isBilingual && !hasSsml) ? 'No SSML Available' : `Generate ${isBilingual ? 'Bilingual ' : ''}Audio`}
            </button>
          )}

          {isGeneratingAudio && (
            <div className="flex items-center gap-3 text-primary bg-primary/5 px-6 py-3 rounded-xl border border-primary/20 animate-pulse">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span className="font-bold">Generating {isBilingual ? 'Dual-Voice ' : ''}audio...</span>
            </div>
          )}

          {audioUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-lg w-full">
              <audio controls src={audioUrl} className="h-12 flex-grow" />
              <button
                onClick={downloadAudio}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all"
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
