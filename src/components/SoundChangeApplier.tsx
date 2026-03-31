import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, AlertCircle, History, HelpCircle, X, Blocks, FileText, Download, Upload } from 'lucide-react';
import { BlendedScaEngine, ScaError } from '@/services/blendedSca';
import { featureMatrix } from '@/services/featureMatrix';
import SyntaxGuide from './SyntaxGuide';
import BlockBasedScaEditor, { blocksToSyntax, syntaxToBlocks } from './BlockBasedScaEditor';
import { exportToText, exportToBlocks, exportToJSON, importFromJSON, textToBlocks, blocksToText, Block } from '@/services/scaImportExport';
import { highlightSCA, TOKEN_COLORS, renderHighlightedLine, tokenizeLine } from './SCASyntaxHighlighter';
import { SCAEditor } from './SCAEditor.tsx';

export default function SoundChangeApplier() {
  const [editorMode, setEditorMode] = useState<'text' | 'block'>('text');
  const [rules, setRules] = useState('Class C {p, t, k, b, d, g}\nClass V {a, e, i, o, u}\n\nrule-name:\n  a => e / _ i');
  const [blockRules, setBlockRules] = useState<Block[]>([]);
  const [inputWords, setInputWords] = useState('p a t i\nk a t u');

  // Handle mode toggle with sync
  const toggleMode = (newMode: 'text' | 'block') => {
    if (newMode === editorMode) return;
    
    if (newMode === 'block') {
      // Convert text to blocks
      try {
        const parsed = syntaxToBlocks(rules);
        setBlockRules(parsed);
      } catch (e) {
        // If parsing fails, start with empty blocks
        setBlockRules([]);
      }
    } else {
      // Convert blocks to text
      const text = blocksToSyntax(blockRules);
      setRules(text);
    }
    setEditorMode(newMode);
  };

  // Handle block editor changes
  const handleBlockChange = (syntax: string) => {
    // Also update rules text for validation
    setRules(syntax);
  };
  const [outputWords, setOutputWords] = useState<{ final: string; syllabified: string | null }[]>([]);
  const [history, setHistory] = useState<{ word: string, changes: { rule: string, result: string }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ScaError[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSyllableBoundaries, setShowSyllableBoundaries] = useState(false);
  const [exportImportError, setExportImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    featureMatrix.init();
  }, []);

  useEffect(() => {
    const engine = new BlendedScaEngine();
    const errors = engine.validate(rules);
    setValidationErrors(errors);
  }, [rules]);

  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Export handlers
  const handleExportText = () => {
    const text = editorMode === 'text' ? rules : blocksToSyntax(blockRules);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sound-changes.sca';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBlocks = () => {
    const blocks = editorMode === 'block' ? blockRules : textToBlocks(rules).blocks;
    const json = exportToJSON(blocks, { 
      mode: editorMode, 
      timestamp: new Date().toISOString(),
      inputWords 
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sound-changes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          // Import JSON blocks
          const { blocks, errors } = importFromJSON(content);
          if (errors.length > 0) {
            setExportImportError(`Import errors: ${errors.join(', ')}`);
            return;
          }
          setBlockRules(blocks);
          // Convert to text for consistency
          const text = blocksToText(blocks);
          setRules(text.text);
          if (text.errors.length > 0) {
            setExportImportError(`Conversion warnings: ${text.errors.join(', ')}`);
          } else {
            setExportImportError(null);
          }
          // Switch to text mode for imported blocks
          setEditorMode('text');
        } else {
          // Import as text (SCA file)
          setRules(content);
          setExportImportError(null);
          setEditorMode('text');
        }
      } catch (err: any) {
        setExportImportError(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleApply = async () => {
    if (validationErrors.length > 0) {
      setError('Please fix the syntax errors in your rules before applying.');
      return;
    }

    setLoading(true);
    setError(null);
    setOutputWords([]);
    setHistory([]);

    const words = inputWords
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    try {
      const engine = new BlendedScaEngine();
      engine.parse(rules);
      
      const results = engine.apply(words);

      setOutputWords(results.map(r => ({
        final: r.final,
        syllabified: showSyllableBoundaries ? engine.syllabifyWords(words.map((w, i) => r.final)) : null
      })));
      setHistory(results.map(r => ({ 
        word: r.original, 
        changes: r.history.map(h => ({ rule: h.rule, result: h.after }))
      })));
    } catch (err: any) {
      setError(err.message || 'An error occurred while applying sound changes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-8">
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <h2 className="text-base sm:text-lg font-bold text-rt-text uppercase tracking-widest">Sound Change Rules</h2>
                {/* Editor Mode Toggle */}
                <div className="flex items-center bg-rt-input rounded-lg p-1 border border-rt-border">
                  <button
                    onClick={() => toggleMode('text')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                      editorMode === 'text' 
                        ? 'bg-rt-accent text-white shadow-sm' 
                        : 'text-rt-muted hover:text-rt-text'
                    }`}
                    title="Text editor mode"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="hidden sm:inline">Text</span>
                  </button>
                  <button
                    onClick={() => toggleMode('block')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                      editorMode === 'block' 
                        ? 'bg-rt-accent text-white shadow-sm' 
                        : 'text-rt-muted hover:text-rt-text'
                    }`}
                    title="Block editor mode (Scratch-style)"
                  >
                    <Blocks className="w-3 h-3" />
                    <span className="hidden sm:inline">Blocks</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleExportText}
                    className="flex items-center gap-1 sm:gap-2 text-[10px] font-black uppercase tracking-widest text-rt-muted hover:text-rt-accent transition-colors"
                    title="Export as text (.sca)"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">Text</span>
                  </button>
                  <button 
                    onClick={handleExportBlocks}
                    className="flex items-center gap-1 sm:gap-2 text-[10px] font-black uppercase tracking-widest text-rt-muted hover:text-rt-accent transition-colors"
                    title="Export as JSON (.json)"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">JSON</span>
                  </button>
                  <button 
                    onClick={handleImportClick}
                    className="flex items-center gap-1 sm:gap-2 text-[10px] font-black uppercase tracking-widest text-rt-muted hover:text-rt-accent transition-colors"
                    title="Import from file"
                  >
                    <Upload className="w-3 h-3" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                </div>
                <div className="w-px h-4 bg-rt-border" />
                <button 
                  onClick={() => setShowHelp(true)}
                  className="flex items-center gap-1 sm:gap-2 text-[10px] font-black uppercase tracking-widest text-rt-muted hover:text-rt-accent transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Guide</span>
                </button>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-1 sm:gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showHistory ? 'text-rt-accent' : 'text-rt-muted hover:text-rt-text'}`}
                >
                  <History className="w-3 h-3" />
                  <span className="hidden sm:inline">{showHistory ? 'Hide History' : 'Show History'}</span>
                </button>
              </div>
            </div>
            
            {showHelp && <SyntaxGuide onClose={() => setShowHelp(false)} />}

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".sca,.json,.txt"
              onChange={handleFileImport}
              className="hidden"
            />

            {/* Export/Import error display */}
            {exportImportError && (
              <div className="mb-4 p-3 bg-rt-error/10 border border-rt-error rounded-lg flex items-start gap-2 text-rt-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{exportImportError}</span>
                <button 
                  onClick={() => setExportImportError(null)}
                  className="ml-auto hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <p className="text-xs text-rt-muted font-bold uppercase tracking-wider mb-4 hidden sm:block">
              {editorMode === 'text' 
                ? 'Define classes and rules. Supports Then: blocks, LTR/RTL, and feature changes.'
                : 'Drag and snap blocks to build sound change rules. Same power, visual interface.'}
            </p>
            {editorMode === 'text' ? (
              <div className="relative w-full h-48 sm:h-64 lg:h-80 bg-rt-input border border-rt-border rounded-2xl focus-within:border-rt-accent transition-all overflow-hidden">
                <SCAEditor
                  value={rules}
                  onChange={(value) => setRules(value)}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="h-[500px] sm:h-[600px] lg:h-[700px] border border-rt-border rounded-2xl overflow-hidden flex flex-col">
                <BlockBasedScaEditor 
                  initialBlocks={blockRules}
                  onChange={handleBlockChange}
                />
              </div>
            )}
            {validationErrors.length > 0 && (
              <div className="mt-4 space-y-2">
                {validationErrors.map((err, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col gap-2 text-xs p-3 rounded-lg border ${
                      err.severity === 'error' 
                        ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                        : err.severity === 'warning'
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">Line {err.line}</span>
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                            err.severity === 'error' 
                              ? 'bg-red-500/20 text-red-300' 
                              : err.severity === 'warning'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {err.type}
                          </span>
                        </div>
                        <p className="font-medium">{err.message}</p>
                        {err.snippet && (
                          <code className="block mt-2 px-2 py-1.5 bg-black/20 rounded font-mono text-[10px] truncate">
                            {err.snippet}
                          </code>
                        )}
                        {err.suggestion && (
                          <p className="mt-2 text-[10px] opacity-80 italic">
                            💡 {err.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-rt-text uppercase tracking-widest mb-2">Input Words</h2>
            <p className="text-xs text-rt-muted font-bold uppercase tracking-wider mb-4 hidden sm:block">One word per line.</p>
            <textarea
              value={inputWords}
              onChange={(e) => setInputWords(e.target.value)}
              className="w-full h-20 sm:h-24 lg:h-32 p-3 sm:p-4 font-mono text-xs sm:text-sm bg-rt-input border border-rt-border rounded-2xl text-rt-text outline-none focus:border-rt-accent transition-all resize-none"
              placeholder="p a t a\nk a t i"
            />
          </div>

          <button
            onClick={handleApply}
            disabled={loading}
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-rt-accent hover:opacity-90 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="hidden sm:inline">Apply Sound Changes</span>
            <span className="sm:hidden">Apply</span>
          </button>
        </div>

        <div className="flex-1 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-rt-text uppercase tracking-widest mb-2">
            {showHistory ? 'Change History' : 'Output'}
            {!showHistory && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSyllableBoundaries(!showSyllableBoundaries)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    showSyllableBoundaries
                      ? 'bg-rt-accent text-white border-rt-accent'
                      : 'bg-rt-input text-rt-muted border-rt-border hover:text-rt-text'
                  }`}
                  title={showSyllableBoundaries ? 'Hide syllable boundaries' : 'Show syllable boundaries'}
                >
                  <span className="text-[11px]">.</span>
                  <span className="hidden sm:inline">{showSyllableBoundaries ? 'Syllables On' : 'Syllables Off'}</span>
                  <span className="sm:hidden">{showSyllableBoundaries ? 'On' : 'Off'}</span>
                </button>
              </div>
            )}
          </h2>
          
          {error && (
            <div className="p-3 sm:p-4 bg-rt-error/10 border border-rt-error rounded-2xl flex items-start gap-2 sm:gap-3 text-rt-error">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
              <pre className="text-xs font-mono whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          <div className="w-full h-[40vh] sm:h-[50vh] lg:h-[calc(100%-2rem)] min-h-[12rem] sm:min-h-[16rem] lg:min-h-[24rem] p-4 sm:p-6 bg-rt-card border border-rt-border rounded-[2rem] overflow-y-auto shadow-xl">
            {showHistory && history.length > 0 ? (
              <div className="space-y-6 sm:space-y-8">
                {history.map((item, i) => (
                  <div key={i} className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 border-b border-rt-border pb-2">
                      <span className="text-[10px] font-black text-rt-muted uppercase tracking-widest">Word {i + 1}:</span>
                      <span className="font-mono text-base sm:text-lg text-rt-accent">{item.word}</span>
                    </div>
                    <div className="space-y-2 pl-3 sm:pl-4 border-l-2 border-rt-border/30">
                      {item.changes.map((change, j) => (
                        <div key={j} className="flex flex-col sm:flex-row items-start gap-1 sm:gap-4 text-xs sm:text-sm">
                          <span className="text-rt-muted font-mono w-auto sm:w-24 shrink-0 truncate" title={change.rule}>{change.rule}:</span>
                          <span className="font-mono text-rt-text ipa-font">{change.result}</span>
                        </div>
                      ))}
                      {item.changes.length === 0 && (
                        <p className="text-xs text-rt-muted italic">No rules applied.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : outputWords.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3">
                {outputWords.map((word, index) => (
                  <li key={index} className="font-mono text-base sm:text-xl text-rt-text flex items-center gap-2 sm:gap-4">
                    <span className="text-rt-muted text-[10px] font-black w-6 sm:w-8 text-right uppercase tracking-widest">{index + 1}.</span>
                    <span className="ipa-font">{showSyllableBoundaries && word.syllabified ? word.syllabified : word.final}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-rt-muted opacity-30 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3 sm:mb-4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p className="italic text-xs sm:text-sm uppercase tracking-widest font-black">
                  {loading ? 'Processing...' : 'Output will appear here'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
