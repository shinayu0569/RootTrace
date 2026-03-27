import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, AlertCircle, History, HelpCircle, X } from 'lucide-react';
import { BlendedScaEngine, ScaError } from '@/services/blendedSca';
import { featureMatrix } from '@/services/featureMatrix';
import SyntaxGuide from './SyntaxGuide';

export default function SoundChangeApplier() {
  const [rules, setRules] = useState('Class C {p, t, k, b, d, g}\nClass V {a, e, i, o, u}\n\nrule-name:\n  a => e / _ i');
  const [inputWords, setInputWords] = useState('p a t i\nk a t u');
  const [outputWords, setOutputWords] = useState<string[]>([]);
  const [history, setHistory] = useState<{ word: string, changes: { rule: string, result: string }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ScaError[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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

      setOutputWords(results.map(r => r.final));
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
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-lg font-bold text-rt-text uppercase tracking-widest">Sound Change Rules</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowHelp(true)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rt-muted hover:text-rt-accent transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                  Guide
                </button>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showHistory ? 'text-rt-accent' : 'text-rt-muted hover:text-rt-text'}`}
                >
                  <History className="w-3 h-3" />
                  {showHistory ? 'Hide History' : 'Show History'}
                </button>
              </div>
            </div>
            
            {showHelp && <SyntaxGuide onClose={() => setShowHelp(false)} />}

            <p className="text-xs text-rt-muted font-bold uppercase tracking-wider mb-4">
              Define classes and rules. Supports Then: blocks, LTR/RTL, and feature changes.
            </p>
            <div className="relative w-full h-64 lg:h-80 bg-rt-input border border-rt-border rounded-2xl focus-within:border-rt-accent transition-all overflow-hidden">
              <div 
                ref={backdropRef}
                className="absolute inset-0 p-4 font-mono text-sm overflow-hidden whitespace-pre-wrap break-words text-transparent pointer-events-none"
                aria-hidden="true"
              >
                {rules.split('\n').map((line, i, arr) => {
                  const error = validationErrors.find(e => e.line === i + 1);
                  const isLast = i === arr.length - 1;
                  const displayLine = (line === '' && error) ? ' ' : line;
                  const content = displayLine + (isLast ? '' : '\n');
                  if (error) {
                    return <span key={i} className="bg-red-500/30 border-b border-red-500/50" title={error.message}>{content}</span>;
                  }
                  return <span key={i}>{content}</span>;
                })}
              </div>
              <textarea
                ref={textareaRef}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                onScroll={handleScroll}
                className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent text-rt-text outline-none resize-none z-10"
                placeholder={"Class C {p, t, k}\nrule-name:\n  a => e / _ i"}
                spellCheck={false}
              />
            </div>
            {validationErrors.length > 0 && (
              <div className="mt-4 space-y-2">
                {validationErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="font-bold">Line {err.line}:</span> {err.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-rt-text uppercase tracking-widest mb-2">Input Words</h2>
            <p className="text-xs text-rt-muted font-bold uppercase tracking-wider mb-4">One word per line.</p>
            <textarea
              value={inputWords}
              onChange={(e) => setInputWords(e.target.value)}
              className="w-full h-24 lg:h-32 p-4 font-mono text-sm bg-rt-input border border-rt-border rounded-2xl text-rt-text outline-none focus:border-rt-accent transition-all resize-none"
              placeholder="p a t a\nk a t i"
            />
          </div>

          <button
            onClick={handleApply}
            disabled={loading}
            className="w-full py-4 px-6 bg-rt-accent hover:opacity-90 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Apply Sound Changes
          </button>
        </div>

        <div className="flex-1 space-y-4">
          <h2 className="text-lg font-bold text-rt-text uppercase tracking-widest mb-2">
            {showHistory ? 'Change History' : 'Output'}
          </h2>
          
          {error && (
            <div className="p-4 bg-rt-error/10 border border-rt-error rounded-2xl flex items-start gap-3 text-rt-error">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <pre className="text-xs font-mono whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          <div className="w-full h-[50vh] lg:h-[calc(100%-2rem)] min-h-[16rem] lg:min-h-[24rem] p-6 bg-rt-card border border-rt-border rounded-[2rem] overflow-y-auto shadow-xl">
            {showHistory && history.length > 0 ? (
              <div className="space-y-8">
                {history.map((item, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-rt-border pb-2">
                      <span className="text-[10px] font-black text-rt-muted uppercase tracking-widest">Word {i + 1}:</span>
                      <span className="font-mono text-lg text-rt-accent">{item.word}</span>
                    </div>
                    <div className="space-y-2 pl-4 border-l-2 border-rt-border/30">
                      {item.changes.map((change, j) => (
                        <div key={j} className="flex items-start gap-4 text-sm">
                          <span className="text-rt-muted font-mono w-24 shrink-0 truncate" title={change.rule}>{change.rule}:</span>
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
              <ul className="space-y-3">
                {outputWords.map((word, index) => (
                  <li key={index} className="font-mono text-xl text-rt-text flex items-center gap-4">
                    <span className="text-rt-muted text-[10px] font-black w-8 text-right uppercase tracking-widest">{index + 1}.</span>
                    <span className="ipa-font">{word}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-rt-muted opacity-30 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p className="italic text-sm uppercase tracking-widest font-black">
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
