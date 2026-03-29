import React from 'react';
import { X } from 'lucide-react';

interface SyntaxGuideProps {
  onClose: () => void;
}

export default function SyntaxGuide({ onClose }: SyntaxGuideProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1c1b18] w-full max-w-5xl h-[100vh] sm:h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-rt-border">
        {/* Header */}
        <div className="bg-[#f8f7f4] dark:bg-[#232219] border-b border-rt-border p-4 sm:p-6 flex justify-between items-start shrink-0">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-[#2d5fa3] dark:text-[#7aa8e0] tracking-tight mb-1">Blended SCA Syntax — Reference</h1>
            <p className="text-xs sm:text-sm text-[#6b6860] dark:text-[#9a9790] max-w-2xl">
              A sound change applier language that combines the zero-configuration ergonomics of Vulgarlang with the expressive power of Lexurgy SC.
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              {['Pre-built IPA inventory', 'Named & ordered rules', 'Feature variables', 'Propagation & harmony', 'Compound rules', 'Romanizers', 'Syllable-aware', 'Stress assignment', 'Chain shifts'].map(tag => (
                <span key={tag} className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#e8f0fb] dark:bg-[#1a2a40] text-[#1e4a80] dark:text-[#7aa8e0] text-[9px] sm:text-[10px] font-bold border border-rt-border">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-rt-muted hover:text-rt-text shrink-0 ml-2"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* TOC Sidebar - hidden on mobile */}
          <nav className="w-56 lg:w-60 shrink-0 border-r border-rt-border p-4 lg:p-6 overflow-y-auto bg-[#f8f7f4] dark:bg-[#232219] hidden md:block">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#6b6860] dark:text-[#9a9790] mb-4">Contents</div>
            <div className="space-y-1 text-xs">
              {[
                { id: 'philosophy', label: 'Design philosophy' },
                { id: 'basics', label: 'Basic rules' },
                { id: 'named', label: 'Named rules' },
                { id: 'wildcards', label: 'Wildcards & classes' },
                { id: 'environments', label: 'Environments' },
                { id: 'boundaries', label: 'Boundaries' },
                { id: 'features', label: 'Distinctive features' },
                { id: 'featurevars', label: 'Feature variables' },
                { id: 'quantifiers', label: 'Quantifiers & optionals' },
                { id: 'subscripts', label: 'Subscript capture' },
                { id: 'deletion', label: 'Deletion & insertion' },
                { id: 'exceptions', label: 'Exceptions' },
                { id: 'sets', label: 'Sets & alternation' },
                { id: 'firstlast', label: 'First & last match' },
                { id: 'reduplication', label: 'Reduplication' },
                { id: 'conditional', label: 'Conditionals' },
                { id: 'compound', label: 'Compound rules (Then:)' },
                { id: 'propagate', label: 'Propagation & direction' },
                { id: 'deferred', label: 'Deferred & cleanup rules' },
                { id: 'romanizers', label: 'Romanizers' },
                { id: 'chain-shifts', label: 'Chain shifts' },
                { id: 'stress', label: 'Stress assignment' },
                { id: 'syllables', label: 'Syllable declarations' },
                { id: 'classes', label: 'Class declarations' },
                { id: 'elements', label: 'Element declarations' },
                { id: 'comments', label: 'Comments' },
                { id: 'order', label: 'Rule ordering' },
                { id: 'summary', label: 'Quick reference' },
              ].map(item => (
                <a 
                  key={item.id} 
                  href={`#${item.id}`} 
                  className="block py-1 text-[#6b6860] dark:text-[#9a9790] hover:text-[#2d5fa3] dark:hover:text-[#7aa8e0] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth bg-white dark:bg-[#1c1b18] text-[#1a1917] dark:text-[#e8e5de]">
            <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12 pb-20">
              
              <section id="philosophy">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Design philosophy</h2>
                <p className="mb-4">This language is built on one core idea: <strong>you should never have to declare what IPA symbols mean.</strong> The entire IPA inventory — all base segments, diacritics, suprasegmentals, and their feature matrices — is pre-loaded. You write rules immediately.</p>
                <p className="mb-4">The syntax draws from both ancestors:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li><strong>From Vulgarlang</strong> <span className="inline-block text-[10px] font-bold uppercase bg-[#dff0e8] dark:bg-[#1a3a28] text-[#1a6040] dark:text-[#6aaf80] px-1.5 rounded">VG</span> — the <code>&gt;</code> arrow, <code>/</code> environment separator, <code>C</code>/<code>V</code>/<code>X</code> wildcards, <code>[+feature]</code> notation, <code>!</code> exceptions, <code>&lt;&lt;</code>/<code>&gt;&gt;</code> first/last match, <code>__</code> reduplication, <code>IF/THEN/ELSE</code> conditionals, subscript capture, <code>$</code>/<code>σ</code> syllable symbols.</li>
                  <li><strong>From Lexurgy</strong> <span className="inline-block text-[10px] font-bold uppercase bg-[#e8e0f8] dark:bg-[#2a1a48] text-[#3a1a80] dark:text-[#a080e0] px-1.5 rounded">LX</span> — named rules with the <code>name:</code> prefix, <code>Then:</code> compound rules, <code>propagate</code>/<code>ltr</code>/<code>rtl</code> directives, <code>Romanizer</code> and intermediate romanizers, <code>Syllables:</code> declarations, <code>Class</code> and <code>Element</code> declarations, <code>@ClassName</code> reference syntax, deferred rules, cleanup rules, the <code>=&gt;</code> arrow as an alias.</li>
                  <li><strong>New in this blend</strong> <span className="inline-block text-[10px] font-bold uppercase bg-[#fdebd8] dark:bg-[#3a2010] text-[#8a4000] dark:text-[#d4a060] px-1.5 rounded">NEW</span> — a single zero-declaration mode where all IPA features and diacritics work out of the box, and where <code>@place</code>/<code>@manner</code>/<code>@voice</code>/<code>@height</code>/<code>@backness</code> assimilation variables are available on any rule without setup.</li>
                </ul>
                <div className="border-l-4 border-[#2d5fa3] bg-[#f8f7f4] dark:bg-[#232219] p-4 rounded-r-xl text-sm italic">
                  <strong>Arrow aliases:</strong> <code>&gt;</code> and <code>=&gt;</code> are interchangeable throughout. Use whichever you prefer — they compile identically.
                </div>
              </section>

              <section id="basics">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Basic rules</h2>
                <p className="mb-4">A rule maps a matched segment (or sequence) to a replacement. The arrow is <code>&gt;</code> or <code>=&gt;</code>.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm mb-4">
                  <span className="text-[#0e6f6a] dark:text-[#4ecac4]">a</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">o</span>
                </div>
                <div className="overflow-hidden border border-rt-border rounded-xl text-xs">
                  <div className="grid grid-cols-3 bg-[#eae6de] dark:bg-[#2a2920] font-bold p-2 uppercase tracking-wider text-[10px]">
                    <div>Input</div><div>Rule</div><div>Output</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 border-t border-rt-border font-mono">
                    <div>alabama</div><div className="text-[#0e6f6a] dark:text-[#4ecac4]">a &gt; o</div><div>olobomo</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 border-t border-rt-border font-mono bg-black/5">
                    <div>utah</div><div className="text-[#0e6f6a] dark:text-[#4ecac4]">t &gt; p</div><div>upah</div>
                  </div>
                </div>
              </section>

              <section id="chain-shifts">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Chain Shifts</h2>
                <p className="mb-4">Chain shifts model phonological changes where one sound "pushes" or "pulls" another in a sequence. Use <code>chain(push)</code> for push chains (changes propagate forward) or <code>chain(drag)</code> for drag chains (changes pull from the end).</p>
                
                <h3 className="text-lg font-semibold mt-6 mb-3">Push vs Drag Chains</h3>
                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Type</th>
                      <th className="p-2 text-left border border-rt-border">Direction</th>
                      <th className="p-2 text-left border border-rt-border">Behavior</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-rt-border">
                      <td className="p-2 font-mono text-[#2d5fa3] dark:text-[#7aa8e0] border border-rt-border">chain(push)</td>
                      <td className="p-2 border border-rt-border">Forward (initiator first)</td>
                      <td className="p-2 border border-rt-border">Changes apply from the sound that triggers the chain</td>
                    </tr>
                    <tr className="border-t border-rt-border">
                      <td className="p-2 font-mono text-[#2d5fa3] dark:text-[#7aa8e0] border border-rt-border">chain(drag)</td>
                      <td className="p-2 border border-rt-border">Backward (destination first)</td>
                      <td className="p-2 border border-rt-border">Changes apply from the "pulled" end, creating space</td>
                    </tr>
                  </tbody>
                </table>

                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2 mb-4">
                  <p className="text-[#6b6860] italic">// Great Vowel Shift - drag chain (default)</p>
                  <p><span className="text-rt-accent font-bold">chain(drag)</span> great-vowel-shift:</p>
                  <p className="pl-4">iː &gt;&gt; əɪ &gt;&gt; aɪ</p>
                  <p className="pl-4">eː &gt;&gt; iː</p>
                  <p className="pl-4">aː &gt;&gt; eɪ</p>
                  <p className="text-[#6b6860] italic mt-2">// Applies in stages: first aː→eɪ, eː→iː, iː→əɪ, then əɪ→aɪ</p>
                </div>

                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// Push chain - changes apply from initiator</p>
                  <p><span className="text-rt-accent font-bold">chain(push)</span> raising:</p>
                  <p className="pl-4">a &gt;&gt; e &gt;&gt; i</p>
                  <p className="text-[#6b6860] italic mt-2">// Applies: first a→e, then newly created e→i</p>
                </div>

                <div className="border-l-4 border-[#2d5fa3] bg-[#f8f7f4] dark:bg-[#232219] p-4 rounded-r-xl text-sm italic mt-4">
                  <strong>How it works:</strong> Drag chains (default) process changes in reverse order to avoid merging - when iː moves to əɪ, the original əɪ space is already being filled by something else. Push chains process changes in forward order, allowing the "push" to cascade through the system.
                </div>
              </section>

              <section id="named">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Named rules</h2>
                <p className="mb-4">Rules can be given a name by prefixing with <code>name:</code>. Names use lowercase letters and hyphens.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// Named</p>
                  <p><span className="text-[#2a5c1a] dark:text-[#6aaf4a]">low-vowel-raising</span>:</p>
                  <p className="pl-4"><span className="text-[#0e6f6a] dark:text-[#4ecac4]">a</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">o</span></p>
                </div>
              </section>

              <section id="wildcards">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Wildcards &amp; classes</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Symbol</th>
                      <th className="p-2 text-left border border-rt-border">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { s: 'C', m: 'Any consonant' },
                      { s: 'V', m: 'Any vowel' },
                      { s: 'X', m: 'Any phoneme' },
                      { s: 'D', m: 'Any IPA base letter' },
                      { s: 'ᴰ', m: 'Any diacritic symbol alone' },
                    ].map(row => (
                      <tr key={row.s} className="border-t border-rt-border">
                        <td className="p-2 font-mono text-[#8a2c1a] dark:text-[#e07060] border border-rt-border">{row.s}</td>
                        <td className="p-2 border border-rt-border">{row.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section id="environments">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Environments</h2>
                <p className="mb-4">The <code>/</code> separator introduces an environment. The underscore <code>_</code> marks the position of the matched segment.</p>
                <div className="overflow-hidden border border-rt-border rounded-xl text-xs">
                  <div className="grid grid-cols-3 bg-[#eae6de] dark:bg-[#2a2920] font-bold p-2 uppercase tracking-wider text-[10px]">
                    <div>Input</div><div>Rule</div><div>Output</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 border-t border-rt-border font-mono">
                    <div>alabama</div><div className="text-[#0e6f6a] dark:text-[#4ecac4]">a &gt; o / _b</div><div>alobama</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 border-t border-rt-border font-mono bg-black/5">
                    <div>kansas</div><div className="text-[#0e6f6a] dark:text-[#4ecac4]">V &gt; [+nasal] / _[+nasal]</div><div>kãnsas</div>
                  </div>
                </div>
              </section>

              <section id="boundaries">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Boundaries</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Symbol</th>
                      <th className="p-2 text-left border border-rt-border">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { s: '#', m: 'Word boundary' },
                      { s: '##', m: 'Word boundary crossing' },
                      { s: '$', m: 'Syllable boundary (incl. word boundary)' },
                      { s: 'σ', m: 'A whole syllable' },
                      { s: '+', m: 'Affix boundary' },
                      { s: '.', m: 'Explicit syllable break' },
                    ].map(row => (
                      <tr key={row.s} className="border-t border-rt-border">
                        <td className="p-2 font-mono text-[#8a2c1a] dark:text-[#e07060] border border-rt-border">{row.s}</td>
                        <td className="p-2 border border-rt-border">{row.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm mt-4 space-y-2">
                  <p className="text-[#6b6860] italic">// Nasalize a vowel at the end of a syllable before a nasal</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">V</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+nasal]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">_$</span><span className="text-[#4a2d8a] dark:text-[#a080e0]">[C +nasal]</span></p>
                  <p className="text-[#6b6860] italic mt-2">// Delete a consonant at the start of a syllable</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">C</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">∅</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">$_</span></p>
                  <p className="text-[#6b6860] italic mt-2">// Lengthen a vowel before a syllable-final consonant (coda)</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">V</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">Vː</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">_C$</span></p>
                  <p className="text-[#6b6860] italic mt-2">// Spirantize stops in syllable onset position</p>
                  <p><span className="text-[#4a2d8a] dark:text-[#a080e0]">[C +stop]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+continuant]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">$_V</span></p>
                </div>
                <div className="border-l-4 border-[#2d5fa3] bg-[#f8f7f4] dark:bg-[#232219] p-4 rounded-r-xl text-sm italic mt-4">
                  <strong>How syllable boundaries work:</strong> The <code>$</code> symbol in environments matches the <code>.</code> (period) that the syllabifier inserts between syllables. Words are automatically syllabified before rules apply (based on your <code>Syllables:</code> declaration or default MaxSonority if none is specified). This lets you write positional rules like "at syllable coda" (<code>_$</code>), "at syllable onset" (<code>$_</code>), or "across syllable boundary" (<code>$X$</code>) without manually marking syllables in your input.
                </div>
              </section>

              <section id="features">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Distinctive features</h2>
                <p className="mb-4">Square brackets specify presence (<code>+</code>) or absence (<code>-</code>) of IPA distinctive features. All standard features are pre-built — no declaration needed.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2 mb-4">
                  <p className="text-[#6b6860] italic">// Nasalize any vowel before a nasal consonant</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">V</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+nasal]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">_</span><span className="text-[#4a2d8a] dark:text-[#a080e0]">[C +nasal]</span></p>
                </div>
                <p className="text-sm mb-4">The <code>!</code> negation prefix on a feature matches segments that do <em>not</em> have that feature value:</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm mb-4">
                  <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+vowel !front]</span> <span className="text-[#6b6860] italic">// vowel that is not front</span>
                </div>
              </section>

              <section id="featurevars">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Feature variables</h2>
                <p className="mb-4">Prefixing a feature name with <code>@</code> inside brackets creates a <em>variable binding</em> for assimilation.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2 mb-4">
                  <p><span className="text-[#2a5c1a] dark:text-[#6aaf4a]">nasal-assimilation</span>:</p>
                  <p className="pl-4"><span className="text-[#4a2d8a] dark:text-[#a080e0]">[C +nasal]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[@place]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">_</span><span className="text-[#4a2d8a] dark:text-[#a080e0]">[@place]</span></p>
                </div>
                <p className="text-sm">Available variables: <code>@place</code>, <code>@manner</code>, <code>@voice</code>, <code>@height</code>, <code>@backness</code>, <code>@roundness</code>, <code>@stress</code>.</p>
              </section>

              <section id="quantifiers">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Quantifiers &amp; optionals</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Syntax</th>
                      <th className="p-2 text-left border border-rt-border">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { s: '(P)', m: 'Zero or one of P (optional)' },
                      { s: 'P*', m: 'Zero or more of P' },
                      { s: 'P(*)', m: 'One or more of P' },
                    ].map(row => (
                      <tr key={row.s} className="border-t border-rt-border">
                        <td className="p-2 font-mono text-[#8a2c1a] dark:text-[#e07060] border border-rt-border">{row.s}</td>
                        <td className="p-2 border border-rt-border">{row.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section id="subscripts">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Subscript capture</h2>
                <p className="mb-4">Subscript numbers (₁₂₃… or plain 1,2,3) appended to a class symbol force it to match the <em>same specific phoneme</em>.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm mb-4">
                  <span className="text-[#0e6f6a] dark:text-[#4ecac4]">C₁C₂</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">C₂C₁</span> <span className="text-[#6b6860] italic">// Metathesis</span>
                </div>
              </section>

              <section id="deletion">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Deletion &amp; insertion</h2>
                <p className="mb-4">Deleting a segment means replacing it with nothing or <code>∅</code>. Inserting means mapping from nothing.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm">
                    <p className="text-[#6b6860] italic">// Deletion</p>
                    <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">C</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">∅</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">_#</span></p>
                  </div>
                  <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm">
                    <p className="text-[#6b6860] italic">// Insertion</p>
                    <p><span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">on</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">m_</span></p>
                  </div>
                </div>
              </section>

              <section id="exceptions">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Exceptions</h2>
                <p className="mb-4">The <code>!</code> prefix before an environment clause makes it an exception.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm">
                  <span className="text-[#0e6f6a] dark:text-[#4ecac4]">a</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">o</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">!</span><span className="text-[#0e6f6a] dark:text-[#4ecac4]">_m</span>
                </div>
              </section>

              <section id="sets">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Sets &amp; alternation</h2>
                <p className="mb-4">Curly brackets <code>{`{}`}</code> on the match side create a set. On the replacement side, use <code>|</code> for random alternation.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p><span className="text-rt-accent font-bold">{`{b, m}`}</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">p</span></p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">b</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">m*3 | n*2 | b</span></p>
                </div>
              </section>

              <section id="reduplication">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Reduplication</h2>
                <p className="mb-4">Replace a match with <code>__</code> to reduplicate the matched string.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm">
                  <span className="text-[#0e6f6a] dark:text-[#4ecac4]">CV</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">__</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">#_</span>
                </div>
              </section>

              <section id="compound">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Compound rules (Then:)</h2>
                <p className="mb-4">A <code>Then:</code> block sequences multiple sub-rules that are all part of the same named rule.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1">
                  <p><span className="text-[#2a5c1a] dark:text-[#6aaf4a]">palatalization</span>:</p>
                  <p className="pl-4">k &gt; tʃ / _i</p>
                  <p><span className="text-rt-accent font-bold">Then</span>:</p>
                  <p className="pl-4">tʃ &gt; ʃ</p>
                </div>
              </section>

              <section id="propagate">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Propagation &amp; direction</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Directive</th>
                      <th className="p-2 text-left border border-rt-border">Behaviour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { s: 'propagate', m: 'Repeat until stable' },
                      { s: 'ltr', m: 'Left-to-right scan' },
                      { s: 'rtl', m: 'Right-to-left scan' },
                    ].map(row => (
                      <tr key={row.s} className="border-t border-rt-border">
                        <td className="p-2 font-mono text-[#2d5fa3] dark:text-[#7aa8e0] italic border border-rt-border">{row.s}</td>
                        <td className="p-2 border border-rt-border">{row.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section id="deferred">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Deferred &amp; cleanup rules</h2>
                <p className="mb-4"><code>Deferred</code> rules are invoked using <code>Apply: @rulename</code>. <code>Cleanup</code> rules apply after every subsequent rule.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p><span className="text-rt-accent font-bold">Deferred</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">nasal-assim</span>:</p>
                  <p className="pl-4">[C +nasal] &gt; [@place] / _[@place]</p>
                  <p className="text-[#6b6860] italic pt-2">// Later...</p>
                  <p><span className="text-rt-accent font-bold">Apply</span>: <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">@nasal-assim</span></p>
                </div>
              </section>

              <section id="stress">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Stress Assignment</h2>
                <p className="mb-4">The SCA can automatically assign stress based on predefined patterns. Stress is applied during syllabification and can be automatically fixed after sound changes.</p>
                
                <h3 className="text-lg font-semibold mt-6 mb-3">Predefined Patterns</h3>
                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Pattern</th>
                      <th className="p-2 text-left border border-rt-border">Description</th>
                      <th className="p-2 text-left border border-rt-border">Example (3 syllables)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { p: 'initial', d: 'First syllable', ex: 'ˈCV.CV.CV' },
                      { p: 'final', d: 'Last syllable', ex: 'CV.CV.ˈCV' },
                      { p: 'penultimate', d: 'Second-to-last', ex: 'CV.ˈCV.CV' },
                      { p: 'antepenult', d: 'Third-to-last', ex: 'ˈCV.CV.CV.CV' },
                      { p: 'trochaic', d: 'Strong-Weak alternating', ex: 'ˈCV.CV.ˈCV.CV' },
                      { p: 'iambic', d: 'Weak-Strong alternating', ex: 'CV.ˈCV.CV.ˈCV' },
                      { p: 'dactylic', d: 'Strong-Weak-Weak', ex: 'ˈCV.CV.CV.ˈCV.CV.CV' },
                      { p: 'anapestic', d: 'Weak-Weak-Strong', ex: 'CV.CV.ˈCV.CV.CV.ˈCV' },
                      { p: 'mobile', d: 'Rightmost heavy syllable', ex: 'Depends on syllable weight' },
                    ].map(row => (
                      <tr key={row.p} className="border-t border-rt-border">
                        <td className="p-2 font-mono text-[#2d5fa3] dark:text-[#7aa8e0] border border-rt-border">{row.p}</td>
                        <td className="p-2 border border-rt-border">{row.d}</td>
                        <td className="p-2 font-mono border border-rt-border">{row.ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="text-lg font-semibold mt-6 mb-3">Custom Position Pattern</h3>
                <p className="mb-4">Use <code>custom</code> with a specific syllable position to define your own stress placement. Positions are 0-indexed:</p>
                
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2 mb-4">
                  <p className="text-[#6b6860] italic">// Stress on the 4th syllable (0,1,2,3 = 4th)</p>
                  <p><span className="text-rt-accent font-bold">Stress</span>: custom pos:3 auto-fix</p>
                  <p className="text-[#6b6860] italic mt-2">// Stress on 3rd-to-last syllable (negative index)</p>
                  <p><span className="text-rt-accent font-bold">Stress</span>: custom pos:-3 auto-fix</p>
                  <p className="text-[#6b6860] italic mt-2">// Examples with 5-syllable word 'telecommunication':</p>
                  <p className="text-[#6b6860] italic">// pos:0 → ˈte.le.co.mu.ni.ca.tion</p>
                  <p className="text-[#6b6860] italic">// pos:2 → te.le.ˈco.mu.ni.ca.tion</p>
                  <p className="text-[#6b6860] italic">// pos:-1 → te.le.co.mu.ni.ˈca.tion (final)</p>
                  <p className="text-[#6b6860] italic">// pos:-2 → te.le.co.mu.ˈni.ca.tion (penult)</p>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Mobile Stress & Heavy Syllables</h3>
                <p className="mb-4">Mobile stress moves to the rightmost "heavy" syllable (or leftmost if none are heavy). Define what makes a syllable heavy with the <code>heavy:</code> parameter:</p>
                
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2 mb-4">
                  <p className="text-[#6b6860] italic">// Mobile stress - moves to rightmost heavy syllable</p>
                  <p><span className="text-rt-accent font-bold">Stress</span>: mobile heavy:VC auto-fix</p>
                  <p className="text-[#6b6860] italic mt-2">// Heavy = closed syllable (V+C) or long vowel</p>
                  <p className="text-[#6b6860] italic">// tel.e.graph → tel.ˈe.graph (second syllable is heavy VC)</p>
                </div>

                <h3 className="text-lg font-semibold mt-6 mb-3">Auto-Fix Option</h3>
                <p className="mb-4">Add <code>auto-fix</code> to reassign stress after each sound change rule. This ensures stress always remains on the intended syllable even as sounds change.</p>
                
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// Penultimate stress with auto-fix</p>
                  <p><span className="text-rt-accent font-bold">Stress</span>: penultimate auto-fix</p>
                  <p className="pl-4">a &gt; ∅ / _#</p>
                  <p className="text-[#6b6860] italic mt-2">// If final vowel deletes, stress moves to new penult</p>
                </div>

                <div className="border-l-4 border-[#2d5fa3] bg-[#f8f7f4] dark:bg-[#232219] p-4 rounded-r-xl text-sm italic mt-4">
                  <strong>Safety enforcement:</strong> If a sound change creates an invalid stress situation (e.g., stress on a deleted syllable), the system automatically reassigns stress regardless of the auto-fix setting to prevent errors.
                </div>
              </section>

              <section id="syllables">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Syllable Declarations</h2>
                <p className="mb-4">A <code>Syllables:</code> block tells the engine what syllable shapes are valid. If not specified, syllabification follows three principles:</p>
                
                <h3 className="text-lg font-semibold mt-6 mb-3">Default Syllabification Principles</h3>
                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Principle</th>
                      <th className="p-2 text-left border border-rt-border">Description</th>
                      <th className="p-2 text-left border border-rt-border">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-rt-border">
                      <td className="p-2 font-bold border border-rt-border">Sonority Sequencing</td>
                      <td className="p-2 border border-rt-border">Syllable peaks are the most sonorous segments</td>
                      <td className="p-2 font-mono border border-rt-border">astre → as.tre (not a.stre)</td>
                    </tr>
                    <tr className="border-t border-rt-border">
                      <td className="p-2 font-bold border border-rt-border">Smallest Onset</td>
                      <td className="p-2 border border-rt-border">Assign minimum possible to syllable onset</td>
                      <td className="p-2 font-mono border border-rt-border">at.las (not atl.as)</td>
                    </tr>
                    <tr className="border-t border-rt-border">
                      <td className="p-2 font-bold border border-rt-border">Smallest Coda</td>
                      <td className="p-2 border border-rt-border">Prefer onsets over codas when ambiguous</td>
                      <td className="p-2 font-mono border border-rt-border">a.tom (not at.om)</td>
                    </tr>
                  </tbody>
                </table>

                <h3 className="text-lg font-semibold mt-6 mb-3">Sonority Scale</h3>
                <p className="mb-4">The default syllabification uses this sonority hierarchy (high to low):</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm mb-4">
                  Vowels (high) &gt; Glides &gt; Liquids &gt; Nasals &gt; Fricatives &gt; Stops (low)
                </div>
                <p className="text-sm">Syllable breaks occur where sonority decreases, not increases. Between vowels, consonants form onsets rather than codas when possible (maximal onset principle).</p>

                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1 mt-4">
                  <p><span className="text-rt-accent font-bold">Syllables</span>:</p>
                  <p className="pl-4">@onset? :: @nucleus :: @coda?</p>
                  <p className="text-[#6b6860] italic mt-2">// :: separates onset, nucleus, coda sections</p>
                </div>
              </section>

              <section id="classes">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Class declarations</h2>
                <p className="mb-4">User-defined classes are declared with the <code>Class</code> keyword.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm">
                  <span className="text-rt-accent font-bold">Class</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">sibilant</span> {`{s, z, ʃ, ʒ, tʃ, dʒ}`}
                </div>
              </section>

              <section id="elements">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Element declarations</h2>
                <p className="mb-4">Elements are reusable sub-patterns that can contain any valid pattern expression.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1">
                  <p><span className="text-rt-accent font-bold">Element</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">onset-cluster</span> [+stop][+liquid]</p>
                </div>
              </section>

              <section id="comments">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Comments</h2>
                <p className="mb-4">Both <code>//</code> and <code>;</code> introduce line comments. <code>#</code> is reserved for word boundaries.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1">
                  <p className="text-[#6b6860] italic">// This is a comment</p>
                  <p className="text-[#6b6860] italic">; This is also a comment</p>
                </div>
              </section>

              <section id="order">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Rule ordering</h2>
                <p className="mb-4">Rules are applied in declaration order, top to bottom. The output of each rule is the input to the next.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// Match longer patterns first to avoid bleeding</p>
                  <p>aʊ &gt; ow</p>
                  <p>ʊ &gt; u</p>
                </div>
              </section>

              <section id="fullexample">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Full worked example</h2>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                  <p className="text-[#6b6860] italic">// Latin → Portuguese sketch</p>
                  <p><span className="text-rt-accent font-bold">Class</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">stop</span> {`{p, t, k, b, d, g}`}</p>
                  <p><span className="text-rt-accent font-bold">Syllables</span>: C* @vowel C*</p>
                  <p><span className="text-rt-accent font-bold">Deferred</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">nasal-assim</span>: [C +nasal] &gt; [@place] / _[@place]</p>
                  <p><span className="text-rt-accent font-bold">Deromanizer</span>: ae &gt; aj</p>
                  <p><span className="text-[#2a5c1a] dark:text-[#6aaf4a]">vowel-length-loss</span>: ː &gt; ∅</p>
                  <p><span className="text-[#2a5c1a] dark:text-[#6aaf4a]">intervocalic-voicing</span>: @stop &gt; [+voice] / V_V</p>
                  <p><span className="text-[#2a5c1a] dark:text-[#6aaf4a]">syncope</span>: [V -stress] &gt; ∅ / V_</p>
                  <p><span className="text-rt-accent font-bold">Then</span>: <span className="text-rt-accent font-bold">Apply</span>: <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">@nasal-assim</span></p>
                  <p><span className="text-rt-accent font-bold">Romanizer</span>: ɲ &gt; nh | ʎ &gt; lh</p>
                </div>
              </section>

              <section id="capturevars">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Capture Variables & Backreferences</h2>
                <p className="mb-4">Use angle brackets <code>&lt;...&gt;</code> to capture parts of the match, then reference them with <code>$1</code>, <code>$2</code>, etc. in the replacement.</p>
                <div className="overflow-hidden border border-rt-border rounded-xl text-xs">
                  <div className="grid grid-cols-3 bg-[#eae6de] dark:bg-[#2a2920] font-bold p-2 uppercase tracking-wider text-[10px]">
                    <div>Input</div><div>Rule</div><div>Output</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 border-t border-rt-border font-mono">
                    <div>atkaŋni</div><div className="text-[#0e6f6a] dark:text-[#4ecac4]">&lt;C&gt;&lt;C&gt; &gt; $2ː</div><div>akːanːi</div>
                  </div>
                  <div className="grid grid-cols-3 p-2 border-t border-rt-border font-mono bg-black/5">
                    <div>helsinki</div><div className="text-[#0e6f6a] dark:text-[#4ecac4]">n &gt; [@place] / _&lt;[@place]&gt;</div><div>helsiŋki</div>
                  </div>
                </div>
              </section>

              <section id="classops">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Class Operations</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#eae6de] dark:bg-[#2a2920] text-[10px] uppercase font-bold text-rt-muted">
                      <th className="p-2 text-left border border-rt-border">Syntax</th>
                      <th className="p-2 text-left border border-rt-border">Meaning</th>
                      <th className="p-2 text-left border border-rt-border">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { s: 'C-k', m: 'Class minus phoneme', ex: 'All consonants except k' },
                      { s: 'C-{k,p}', m: 'Class minus set', ex: 'All consonants except k and p' },
                      { s: 'C-[+voice]', m: 'Class minus feature', ex: 'Voiceless consonants' },
                      { s: 'C&V', m: 'Intersection', ex: 'Sounds that are both C and V (none)' },
                      { s: 'C&!V', m: 'Subtraction', ex: 'Consonants that are not vowels' },
                      { s: '@stop&[+voice]', m: 'Class & feature', ex: 'Voiced stops' },
                    ].map(row => (
                      <tr key={row.s} className="border-t border-rt-border">
                        <td className="p-2 font-mono text-[#8a2c1a] dark:text-[#e07060] border border-rt-border">{row.s}</td>
                        <td className="p-2 border border-rt-border">{row.m}</td>
                        <td className="p-2 border border-rt-border text-sm">{row.ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section id="targetconds">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Target Conditions</h2>
                <p className="mb-4">When an environment has no underscore, it checks features of the target itself rather than surrounding context.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// Nasalize only stressed vowels</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">V</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+nasal]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+stress]</span></p>
                  <p className="text-[#6b6860] italic mt-2">// Lower non-high tone vowels</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">V</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#4a2d8a] dark:text-[#a080e0]">[+low-tone]</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">!</span><span className="text-[#4a2d8a] dark:text-[#a080e0]">[+high-tone]</span></p>
                </div>
              </section>

              <section id="multienv">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Multiple Environments</h2>
                <p className="mb-4">Use commas or pipes to specify multiple environments where a rule applies.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// n becomes m before p OR b</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">n</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">m</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">_p, _b</span></p>
                  <p className="text-[#6b6860] italic mt-2">// a becomes o word-initially or word-finally</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">a</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">o</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">/</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">#_ | _#</span></p>
                </div>
              </section>

              <section id="block">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Iterative Blocks</h2>
                <p className="mb-4">Wrap rules in <code>[block]</code>...<code>[end]</code> to apply them repeatedly until no more changes occur. Useful for harmony processes.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1">
                  <p><span className="text-rt-accent font-bold">[block]</span></p>
                  <p className="pl-4">a &gt; e / _(C+)e</p>
                  <p><span className="text-rt-accent font-bold">[end]</span></p>
                  <p className="text-[#6b6860] italic mt-2">; tanake → teneke (harmony spreads leftward)</p>
                </div>
              </section>

              <section id="except">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Exception Lists</h2>
                <p className="mb-4">Add <code>except</code> followed by words to skip specific inputs from a rule.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p className="text-[#6b6860] italic">// Change a to e except in mama</p>
                  <p><span className="text-[#0e6f6a] dark:text-[#4ecac4]">a</span> <span className="text-[#8a2c1a] dark:text-[#e07060] font-bold">&gt;</span> <span className="text-[#0e6f6a] dark:text-[#4ecac4]">e</span> <span className="text-[#6b6860] italic">except mama papa</span></p>
                </div>
              </section>

              <section id="literal">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Romanizer/Deromanizer Literal Mode</h2>
                <p className="mb-4">Add <code>literal</code> to ignore declarations and treat symbols literally. Useful when your romanization conflicts with IPA diacritics.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1">
                  <p className="text-[#6b6860] italic">// ʼ is both ejective diacritic AND glottal stop in romanization</p>
                  <p><span className="text-rt-accent font-bold">Deromanizer</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">literal</span>:</p>
                  <p className="pl-4">ʼ &gt; ʔ</p>
                  <p><span className="text-rt-accent font-bold">Then</span>:</p>
                  <p className="pl-4">{`{p, t, k} > [+ejective]`}</p>
                </div>
              </section>

              <section id="cleanupoff">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Cleanup On/Off</h2>
                <p className="mb-4">Deactivate cleanup rules after a certain point using <code>off</code>.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-1">
                  <p><span className="text-rt-accent font-bold">Cleanup</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">nasal-assim</span>:</p>
                  <p className="pl-4">[C +nasal] &gt; [@place] / _[@place]</p>
                  <p className="text-[#6b6860] italic">; ... later rules ...</p>
                  <p><span className="text-rt-accent font-bold">Cleanup</span> <span className="text-[#2a5c1a] dark:text-[#6aaf4a]">nasal-assim</span>:</p>
                  <p className="pl-4">off</p>
                </div>
              </section>

              <section id="customseg">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Custom Segment Definitions</h2>
                <p className="mb-4">Define custom phonemes with <code>feat:</code> for symbols not in the built-in IPA database.</p>
                <div className="bg-[#f0ede6] dark:bg-[#2a2920] border border-rt-border rounded-xl p-4 font-mono text-sm space-y-2">
                  <p><span className="text-rt-accent font-bold">feat:</span> ꝗ = +cons +dor -voi</p>
                  <p><span className="text-rt-accent font-bold">feat:</span> š = ʃ</p>
                  <p><span className="text-rt-accent font-bold">feat:</span> č = tʃ</p>
                  <p className="text-[#6b6860] italic">// Digraphs are detected automatically from components</p>
                  <p><span className="text-rt-accent font-bold">feat:</span> kp gb ŋm</p>
                </div>
              </section>

              <section id="summary">
                <h2 className="text-xl font-bold border-t border-rt-border pt-8 mb-4">Quick reference</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-[#eae6de] dark:bg-[#2a2920] uppercase font-bold text-rt-muted">
                        <th className="p-2 text-left border border-rt-border">Operator</th>
                        <th className="p-2 text-left border border-rt-border">Meaning</th>
                        <th className="p-2 text-left border border-rt-border">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { op: '> or =>', m: 'Change (arrow)', ex: 'a > o' },
                        { op: '/', m: 'Environment separator', ex: 'a > o / _b' },
                        { op: '_', m: 'Position of matched segment', ex: '/ C_V' },
                        { op: '#', m: 'Word boundary', ex: '/ #_' },
                        { op: '∅', m: 'Null / empty', ex: 'C > ∅' },
                        { op: '{ }', m: 'Set or parallel replacement', ex: '{p,t,k} > {b,d,g}' },
                        { op: '|', m: 'Random alternation', ex: 'b > m | n' },
                        { op: '( )', m: 'Optional pattern', ex: '_(C)#' },
                        { op: '!', m: 'Exception / negation', ex: '/ !_m' },
                        { op: '<<', m: 'First match only', ex: 's << z' },
                        { op: '>>', m: 'Last match only', ex: 's >> z' },
                        { op: '__', m: 'Reduplicate matched string', ex: 'CV > __ / #_' },
                        { op: '[ ]', m: 'Feature matrix', ex: '[+nasal -voice]' },
                        { op: '@feature', m: 'Feature variable', ex: '[@place]' },
                        { op: 'Then:', m: 'Sub-rule sequencing', ex: 'Then: ʃ > s' },
                        { op: 'propagate', m: 'Repeat until stable', ex: 'harmony propagate:' },
                        { op: '<X>', m: 'Capture group', ex: '<C><C> > $2ː' },
                        { op: '$1', m: 'Backreference', ex: '<V>n > $1ː' },
                        { op: 'C-k', m: 'Class exclusion', ex: 'C-k (C minus k)' },
                        { op: 'A&B', m: 'Intersection', ex: '@stop&[+voice]' },
                        { op: 'A&!B', m: 'Subtraction', ex: 'C&!V' },
                        { op: ', or |', m: 'Multiple envs', ex: '/ _p, _b' },
                        { op: '[block]', m: 'Iterative block', ex: '[block] ... [end]' },
                        { op: 'literal', m: 'Ignore declarations', ex: 'Deromanizer literal:' },
                        { op: 'except', m: 'Word exceptions', ex: 'a > e except mama' },
                        { op: 'off', m: 'Deactivate cleanup', ex: 'Cleanup: off' },
                      ].map(row => (
                        <tr key={row.op} className="border-t border-rt-border">
                          <td className="p-2 font-mono text-[#8a2c1a] dark:text-[#e07060] border border-rt-border">{row.op}</td>
                          <td className="p-2 border border-rt-border">{row.m}</td>
                          <td className="p-2 font-mono border border-rt-border">{row.ex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="text-center text-rt-muted text-[10px] font-black uppercase tracking-[0.3em] pt-10">
                End of Reference
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
