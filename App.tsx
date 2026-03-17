
import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { LanguageInput, ReconstructionMethod, ReconstructionResult, TreeNode, SoundChangeNote, EvolverNode } from './types';
import { reconstructProtoWord } from './services/engine';
import { GAP_CHAR, describeFeatures } from './services/phonetics';
import { applyShifts, ShiftResult } from './services/soundShifter';
import { autoEvolveEdge, algorithmicEvolveEdge, EvolverEdgeResult } from './services/evolver';

const TutorialModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-rt-bg border border-rt-border rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-rt-bg/90 backdrop-blur-md border-b border-rt-border p-6 sm:p-8 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <div className="bg-rt-accent/10 p-3 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-rt-text">RootTrace Documentation</h2>
              <p className="text-xs text-rt-muted font-medium uppercase tracking-widest">Computational Historical Linguistics & Reconstruction</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rt-input rounded-full transition-colors text-rt-muted hover:text-rt-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-8 sm:p-12 space-y-12 text-rt-text leading-relaxed">
          {/* Scientific Proposal */}
          <section className="max-w-2xl">
            <h3 className="text-xl font-serif italic mb-4 text-rt-accent">Objective: Advanced Phylogenetic Reconstruction</h3>
            <p className="text-rt-muted text-lg font-serif leading-relaxed">
              RootTrace is a specialized computational environment designed to reconstruct ancestral linguistic forms from sets of cognates. By applying Bayesian inference and Markov Chain Monte Carlo (MCMC) simulations, the engine identifies the most probable phonetic trajectories across diverging lineages.
            </p>
          </section>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-rt-border to-transparent"></div>

          {/* Core Functionalities */}
          <section>
            <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
              Operational Workflow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-3">
                <span className="text-4xl font-serif text-rt-accent opacity-20 block">01</span>
                <h4 className="text-lg font-bold">Phylogenetic Mapping</h4>
                <p className="text-rt-muted text-sm">Define the hierarchical descent of your language family. The engine processes multi-level branching, allowing you to map complex lineages from Proto-stages down to modern descendants.</p>
              </div>
              <div className="space-y-3">
                <span className="text-4xl font-serif text-rt-accent opacity-20 block">02</span>
                <h4 className="text-lg font-bold">Feature-Based Input</h4>
                <p className="text-rt-muted text-sm">Provide phonetic data using standard IPA. Unlike character-matching tools, RootTrace decomposes every phoneme into distinctive features (place, manner, phonation) to understand the underlying mechanics of change.</p>
              </div>
              <div className="space-y-3">
                <span className="text-4xl font-serif text-rt-accent opacity-20 block">03</span>
                <h4 className="text-lg font-bold">Probabilistic Reconstruction</h4>
                <p className="text-rt-muted text-sm">The engine executes thousands of MCMC iterations to calculate the "Global Medoid" or Bayesian optimal root. It weighs phonetic stability, typological frequency, and the probability of specific sound shifts.</p>
              </div>
              <div className="space-y-3">
                <span className="text-4xl font-serif text-rt-accent opacity-20 block">04</span>
                <h4 className="text-lg font-bold">Sound Law Extraction</h4>
                <p className="text-rt-muted text-sm">Analyze the output through the tree visualization. Every reconstructed node highlights detected sound shifts, helping you discover the consistent 'Sound Laws' governing your language evolution.</p>
              </div>
            </div>
          </section>

          {/* Methodology Specs */}
          <section className="bg-rt-input/30 rounded-[2rem] p-8 sm:p-10 border border-rt-border">
            <h3 className="text-2xl font-serif font-bold mb-6">The Reconstruction Engine: Weighted Analysis</h3>
            <p className="text-rt-muted mb-8 text-sm max-w-xl">
              RootTrace has transitioned from simple majority-vote logic to a multi-variable weighting system for higher diachronic realism:
            </p>
            <div className="space-y-4 text-sm text-rt-muted mb-8">
              <p><strong className="text-rt-text">Phoneme Stability:</strong> Factors in the longevity of vowels versus stops based on cross-linguistic data.</p>
              <p><strong className="text-rt-text">Typological Frequencies:</strong> Utilizes frequency databases to predict the persistence of common phonemes like /m/ or /a/.</p>
              <p><strong className="text-rt-text">Shift Probability:</strong> Prioritizes common diachronic shifts (e.g., lenition chains like p → f → h).</p>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-8">
              <div className="px-4 py-2 bg-rt-accent/10 border border-rt-accent/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-rt-accent">Phylogenetic Modeling</div>
              <div className="px-4 py-2 bg-rt-accent/10 border border-rt-accent/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-rt-accent">Distinctive Features</div>
              <div className="px-4 py-2 bg-rt-accent/10 border border-rt-accent/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-rt-accent">MCMC Sampling</div>
              <div className="px-4 py-2 bg-rt-accent/10 border border-rt-accent/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-rt-accent">Diachronic Realism</div>
            </div>
          </section>

          {/* Evolution Modes */}
          <section>
            <h3 className="text-2xl font-serif font-bold mb-6">Operational Modes</h3>
            <div className="prose prose-sm text-rt-muted font-serif max-w-3xl space-y-4">
              <p>
                <strong>Reconstruct:</strong> Work backwards from descendants to recover the ancestral Proto-form.
              </p>
              <p>
                <strong>Sound Shift:</strong> Apply specific rules (e.g., <code>t &gt; d / V_V</code>) to a lexicon to simulate immediate phonetic changes.
              </p>
              <p>
                <strong>Auto-Evolver:</strong> Use the engine to simulate long-term evolution across multiple intermediate stages.
              </p>
            </div>
          </section>

          <footer className="pt-12 border-t border-rt-border text-center">
            <p className="text-xs text-rt-muted font-serif italic">
              RootTrace is an open-source project dedicated to the intersection of computer science and historical linguistics. Contributions and feedback are welcome at the official repository.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

const ErrorModal = ({ message, onClose }: { message: string, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in">
      <div className="bg-rt-bg border border-rt-error/50 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-rt-error">Error</h2>
            <button onClick={onClose} className="text-rt-muted hover:text-rt-text transition-colors">✕</button>
          </div>
          <p className="text-sm text-rt-text leading-relaxed mb-8">{message}</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="bg-rt-card border border-rt-border text-rt-text px-6 py-2 rounded-xl font-bold hover:bg-rt-input transition-colors">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const INITIAL_DATA: LanguageInput[] = [
  { id: '1', name: 'Latin', word: 'pa.ter', descendants: [
    { id: '1-1', name: 'Spanish', word: 'pa.dɾe', spelling: 'pa.dɾe' },
    { id: '1-2', name: 'French', word: 'pɛʁ', spelling: 'pɛ.ʁə' }
  ]},
  { id: '2', name: 'Ancient Greek', word: 'pa.tɛːr' },
  { id: '3', name: 'Sanskrit', word: 'pi.tr̩' },
  { id: '4', name: 'Old English', word: 'fæ.der', descendants: [
    { id: '4-1', name: 'English', word: 'fɑ.ðəɹ', spelling: 'fa.ðəɹ' }
  ]},
];

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  children: LayoutNode[];
}

// Memoized Edge Component
const TreeEdgeItem = React.memo(({ source, target, changeCount, isDimmed, onSelect }: {
  source: LayoutNode;
  target: LayoutNode;
  changeCount: number;
  isDimmed: boolean;
  onSelect: (name: string | null) => void;
}) => {
  const NODE_HEIGHT = 55;
  const edgeColor = isDimmed ? "var(--border)" : (changeCount > 0 ? "#f59e0b" : "var(--muted)");
  
  const startX = source.x;
  const startY = source.y + NODE_HEIGHT/2;
  const endX = target.x;
  const endY = target.y - NODE_HEIGHT/2;
  
  const verticalDist = endY - startY;
  const midY = startY + verticalDist / 2;
  const cpOffset = verticalDist * 0.45;

  return (
    <g className={`transition-opacity duration-300 ${isDimmed ? 'opacity-20' : 'opacity-100'}`}>
      <path 
        d={`M ${startX} ${startY} C ${startX} ${startY + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`} 
        fill="none" 
        stroke={edgeColor} 
        strokeWidth={isDimmed ? "1" : "2.5"} 
        strokeDasharray={changeCount > 0 ? "none" : "5,5"}
      />
      {changeCount > 0 && (
        <g 
          transform={`translate(${(startX + endX) / 2}, ${midY})`} 
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(target.name);
          }}
        >
          <g className="transition-transform duration-300 hover:scale-125" style={{ transformOrigin: '0px 0px' }}>
            <circle r="12" fill="var(--bg)" stroke={edgeColor} strokeWidth="2" />
            <text y="4" textAnchor="middle" fill={edgeColor} className="text-[10px] font-black font-mono">{changeCount}</text>
          </g>
        </g>
      )}
    </g>
  );
});

// Memoized Node Component
const TreeNodeItem = React.memo(({ node, isRoot, isSelected, isDimmed, onSelect }: {
  node: LayoutNode;
  isRoot: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: (name: string | null) => void;
}) => {
  const NODE_WIDTH = 130;
  const NODE_HEIGHT = 55;
  const nodeFill = isRoot ? "var(--accent)" : (isSelected ? "#10b981" : "var(--card-bg)");

  return (
    <g 
      transform={`translate(${node.x - NODE_WIDTH/2}, ${node.y - NODE_HEIGHT/2})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isRoot ? null : node.name);
      }}
      className={`cursor-pointer transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <rect 
        width={NODE_WIDTH} 
        height={NODE_HEIGHT} 
        rx={isRoot ? 27 : 12} 
        fill={nodeFill} 
        stroke={isSelected ? "#34d399" : "var(--border)"}
        strokeWidth={2}
        className="shadow-2xl transition-colors duration-300" 
      />
      <text x={NODE_WIDTH/2} y={isRoot ? 35 : 30} textAnchor="middle" fill={isRoot ? "#ffffff" : "var(--text)"} className={`font-bold ipa-font ${isRoot ? 'text-xl' : 'text-base'}`}>{isRoot ? node.name : node.reconstruction}</text>
      {!isRoot && <text x={NODE_WIDTH/2} y={15} textAnchor="middle" fill="var(--muted)" className="text-[10px] uppercase font-black tracking-tighter">{node.name}</text>}
    </g>
  );
});

const TreeVisualization = ({ 
  data, 
  soundChanges, 
  selectedLanguage, 
  onSelect 
}: { 
  data: TreeNode;
  soundChanges: SoundChangeNote[];
  selectedLanguage: string | null;
  onSelect: (name: string | null) => void;
}) => {
  const NODE_WIDTH = 130;
  const X_GAP = 40;
  const LEVEL_HEIGHT = 120;
  const NODE_HEIGHT = 55;

  const { root, viewWidth, viewHeight, flatNodes, flatEdges } = useMemo(() => {
    if (!data) return { root: null, viewWidth: 0, viewHeight: 0, flatNodes: [], flatEdges: [] };
    let currentLeafX = X_GAP;

    const assignX = (node: TreeNode): LayoutNode => {
      const children = (node.children || []).map(assignX);
      let x = 0;
      if (children.length === 0) {
        x = currentLeafX + NODE_WIDTH / 2;
        currentLeafX += NODE_WIDTH + X_GAP;
      } else {
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        x = (firstChild.x + lastChild.x) / 2;
      }
      return { ...node, children, x, y: 0 } as LayoutNode;
    };

    const assignY = (node: LayoutNode, currentY: number) => {
      node.y = currentY;
      node.children.forEach(c => assignY(c, currentY + LEVEL_HEIGHT));
    };

    const getMaxY = (node: LayoutNode): number => {
       let max = node.y;
       node.children.forEach(c => max = Math.max(max, getMaxY(c)));
       return max;
    };

    const rootLayout = assignX(data);
    const topPadding = 60;
    assignY(rootLayout, topPadding);
    
    // Flatten Tree
    const nodes: LayoutNode[] = [];
    const edges: { source: LayoutNode; target: LayoutNode }[] = [];
    
    const traverse = (node: LayoutNode) => {
      nodes.push(node);
      node.children.forEach(child => {
        edges.push({ source: node, target: child });
        traverse(child);
      });
    };
    traverse(rootLayout);

    const totalWidth = Math.max(currentLeafX, rootLayout.x + NODE_WIDTH + X_GAP);
    const totalHeight = getMaxY(rootLayout) + NODE_HEIGHT + 60;

    return { root: rootLayout, viewWidth: totalWidth, viewHeight: totalHeight, flatNodes: nodes, flatEdges: edges };
  }, [data]);

  // Optimize change counting
  const changeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    soundChanges.forEach(sc => {
      counts[sc.language] = (counts[sc.language] || 0) + 1;
    });
    return counts;
  }, [soundChanges]);

  if (!root) return null;

  return (
    <div className="w-full h-full bg-rt-card rounded-2xl border border-rt-border p-4 flex items-center justify-center overflow-auto">
      <svg 
        viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
        width="100%" 
        height="100%" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-full min-w-[300px]"
        onClick={() => onSelect(null)}
      >
        {flatEdges.map((edge, i) => (
          <TreeEdgeItem
            key={`e-${edge.source.name}-${edge.target.name}`}
            source={edge.source}
            target={edge.target}
            changeCount={changeCounts[edge.target.name] || 0}
            isDimmed={selectedLanguage !== null && selectedLanguage !== edge.target.name}
            onSelect={onSelect}
          />
        ))}
        {flatNodes.map((node, i) => (
          <TreeNodeItem
            key={`n-${node.name}-${i}`}
            node={node}
            isRoot={node === root}
            isSelected={selectedLanguage === node.name}
            isDimmed={selectedLanguage !== null && node.name !== selectedLanguage && node !== root}
            onSelect={onSelect}
          />
        ))}
      </svg>
    </div>
  );
};

const LanguageInputNode: React.FC<{
  lang: LanguageInput;
  path: number[];
  onUpdate: (path: number[], field: keyof LanguageInput, val: string) => void;
  onRemove: (path: number[]) => void;
  onAddDescendant: (path: number[]) => void;
  onAddParent?: (path: number[]) => void;
  selectedLang: string | null;
  onSelectLang: (name: string | null) => void;
  depth?: number;
}> = ({
  lang,
  path,
  onUpdate,
  onRemove,
  onAddDescendant,
  onAddParent,
  selectedLang,
  onSelectLang,
  depth = 0
}) => {
  return (
    <div className={`mt-3 ${depth > 0 ? 'ml-2 sm:ml-6 border-l-2 border-rt-border pl-2 sm:pl-4' : ''}`}>
      <div 
        className={`bg-rt-card border p-4 rounded-2xl group relative transition-all ${selectedLang === lang.name || selectedLang === `${lang.name} (Spelling)` ? 'border-rt-accent bg-rt-accent/10' : 'border-rt-border hover:border-rt-accent/50'}`}
        onClick={(e) => { e.stopPropagation(); onSelectLang(selectedLang === lang.name ? null : lang.name); }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(path); }} 
          className="absolute top-3 right-3 text-rt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >✕</button>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Label</label>
            <input onClick={(e) => e.stopPropagation()} type="text" value={lang.name} onChange={e => onUpdate(path, 'name', e.target.value)} className="w-full bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-rt-accent text-rt-text" />
          </div>
          <div className="col-span-1">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Pronunciation (IPA)</label>
            <input onClick={(e) => e.stopPropagation()} type="text" value={lang.word} onChange={e => onUpdate(path, 'word', e.target.value)} className="w-full bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-sm ipa-font outline-none focus:border-rt-accent text-rt-text placeholder:text-rt-muted/50" placeholder="pʰaːtēr" />
          </div>
          <div className="col-span-1">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Spelling (IPA) - Optional</label>
            <input onClick={(e) => e.stopPropagation()} type="text" value={lang.spelling || ''} onChange={e => onUpdate(path, 'spelling', e.target.value)} className="w-full bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-sm ipa-font outline-none focus:border-rt-accent text-rt-muted placeholder:text-rt-muted/50" placeholder="Older form..." />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {depth === 0 && onAddParent && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAddParent(path); }}
              className="text-[9px] font-bold bg-rt-input hover:bg-rt-border px-3 py-1.5 rounded-lg border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text"
            >
              + Parent
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onAddDescendant(path); }}
            className="text-[9px] font-black bg-rt-input hover:bg-rt-border px-3 py-1.5 rounded-lg border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text"
          >
            + Descendant
          </button>
        </div>
      </div>
      {lang.descendants && lang.descendants.length > 0 && (
        <div className="flex flex-col gap-1">
          {lang.descendants.map((desc, idx) => (
            <LanguageInputNode
              key={desc.id}
              lang={desc}
              path={[...path, idx]}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddDescendant={onAddDescendant}
              onAddParent={onAddParent}
              selectedLang={selectedLang}
              onSelectLang={onSelectLang}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EvolverInputNode: React.FC<{
  node: EvolverNode;
  path: number[];
  onUpdate: (path: number[], field: keyof EvolverNode, val: any) => void;
  onRemove: (path: number[]) => void;
  onAddDescendant: (path: number[]) => void;
  depth?: number;
}> = ({
  node,
  path,
  onUpdate,
  onRemove,
  onAddDescendant,
  depth = 0
}) => {
  return (
    <div className={`mt-3 ${depth > 0 ? 'ml-2 sm:ml-6 border-l-2 border-rt-border pl-2 sm:pl-4' : ''}`}>
      <div className="bg-rt-card border border-rt-border p-4 rounded-2xl group relative transition-all hover:border-rt-accent/50">
        {depth > 0 && (
          <button onClick={() => onRemove(path)} className="absolute top-3 right-3 text-rt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">✕</button>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Stage Name</label>
            <input type="text" value={node.name} onChange={e => onUpdate(path, 'name', e.target.value)} className="w-full bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-rt-accent text-rt-text" />
          </div>
          {depth > 0 && (
            <div>
              <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Intermediate Sub-stages</label>
              <input type="number" min="0" max="5" value={node.subStages} onChange={e => onUpdate(path, 'subStages', parseInt(e.target.value) || 0)} className="w-full bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-rt-accent text-rt-text" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Words (one per line)</label>
            <textarea value={node.wordsText} onChange={e => onUpdate(path, 'wordsText', e.target.value)} className="w-full h-24 bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-sm font-mono outline-none focus:border-rt-accent text-rt-text resize-none custom-scrollbar" placeholder="Word 1&#10;Word 2" />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => onAddDescendant(path)} className="text-[9px] font-bold bg-rt-input hover:bg-rt-border px-3 py-1.5 rounded-lg border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text">
            + Descendant Stage
          </button>
        </div>
      </div>
      {node.descendants && node.descendants.length > 0 && (
        <div className="flex flex-col gap-1">
          {node.descendants.map((desc, idx) => (
            <EvolverInputNode key={desc.id} node={desc} path={[...path, idx]} onUpdate={onUpdate} onRemove={onRemove} onAddDescendant={onAddDescendant} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const INITIAL_EVOLVER_DATA: EvolverNode = {
  id: 'root',
  name: 'Proto-Language',
  wordsText: 'pater\nmater\nfrater',
  subStages: 0,
  descendants: [
    {
      id: 'desc-1',
      name: 'Modern Language',
      wordsText: 'padre\nmadre\nfradre',
      subStages: 1,
      descendants: []
    }
  ]
};

export default function App() {
  const [inputs, setInputs] = useState<LanguageInput[]>(INITIAL_DATA);
  const [result, setResult] = useState<ReconstructionResult | null>(null);
  const [method, setMethod] = useState<ReconstructionMethod>(ReconstructionMethod.BAYESIAN_MCMC);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inspectedCol, setInspectedCol] = useState<number | null>(null);
  
  // New state for interaction
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  // Custom Parameters
  const [mcmcIterations, setMcmcIterations] = useState<number>(3000);
  const [gapPenalty, setGapPenalty] = useState<number>(10);
  const [unknownCharPenalty, setUnknownCharPenalty] = useState<number>(8);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Modes
  const [appMode, setAppMode] = useState<'reconstruct' | 'shift' | 'evolver'>('reconstruct');
  
  // Sound Shift Creator state
  const [shiftWords, setShiftWords] = useState<string>("pater\nmater\nfrater");
  const [shiftRules, setShiftRules] = useState<string>("t > d / V_V\np > f / #_\nr > ɾ / V_V");
  const [shiftResults, setShiftResults] = useState<ShiftResult[]>([]);

  // Auto-Evolver state
  const [evolverData, setEvolverData] = useState<EvolverNode>(INITIAL_EVOLVER_DATA);
  const [evolverResults, setEvolverResults] = useState<EvolverEdgeResult[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (appMode === 'shift') {
      setShiftResults(applyShifts(shiftWords.split('\n'), shiftRules));
    }
  }, [shiftWords, shiftRules, appMode]);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
  };

  const runReconstruction = () => {
    setIsProcessing(true);
    setInspectedCol(null);
    setSelectedLang(null); // Reset selection on new run
    setTimeout(() => {
      try { setResult(reconstructProtoWord(inputs, method, { mcmcIterations, gapPenalty, unknownCharPenalty })); }
      catch (e) { console.error(e); setErrorMsg("Reconstruction engine error."); }
      finally { setIsProcessing(false); }
    }, 800);
  };

  useEffect(() => { runReconstruction(); }, []);

  const handleUpdateNode = (path: number[], field: keyof LanguageInput, val: string) => {
    const update = (nodes: LanguageInput[], p: number[]): LanguageInput[] => {
      if (p.length === 0) return nodes;
      const newNodes = [...nodes];
      const idx = p[0];
      if (p.length === 1) {
        newNodes[idx] = { ...newNodes[idx], [field]: val };
      } else {
        newNodes[idx] = {
          ...newNodes[idx],
          descendants: update(newNodes[idx].descendants || [], p.slice(1))
        };
      }
      return newNodes;
    };
    setInputs(update(inputs, path));
  };

  const handleRemoveNode = (path: number[]) => {
    const remove = (nodes: LanguageInput[], p: number[]): LanguageInput[] => {
      if (p.length === 0) return nodes;
      const newNodes = [...nodes];
      const idx = p[0];
      if (p.length === 1) {
        newNodes.splice(idx, 1);
      } else {
        newNodes[idx] = {
          ...newNodes[idx],
          descendants: remove(newNodes[idx].descendants || [], p.slice(1))
        };
      }
      return newNodes;
    };
    setInputs(remove(inputs, path));
  };

  const handleAddDescendant = (path: number[]) => {
    const add = (nodes: LanguageInput[], p: number[]): LanguageInput[] => {
      if (p.length === 0) return nodes;
      const newNodes = [...nodes];
      const idx = p[0];
      if (p.length === 1) {
        newNodes[idx] = {
          ...newNodes[idx],
          descendants: [...(newNodes[idx].descendants || []), { id: Date.now().toString(), name: 'New Descendant', word: '' }]
        };
      } else {
        newNodes[idx] = {
          ...newNodes[idx],
          descendants: add(newNodes[idx].descendants || [], p.slice(1))
        };
      }
      return newNodes;
    };
    setInputs(add(inputs, path));
  };

  const handleAddParent = (path: number[]) => {
    if (path.length !== 1) return;
    const idx = path[0];
    const newNodes = [...inputs];
    const currentNode = newNodes[idx];
    
    const newParent: LanguageInput = {
      id: Date.now().toString(),
      name: 'New Parent',
      word: '',
      descendants: [currentNode]
    };
    
    newNodes[idx] = newParent;
    setInputs(newNodes);
  };

  const handleUpdateEvolverNode = (path: number[], field: keyof EvolverNode, val: any) => {
    const update = (node: EvolverNode, p: number[]): EvolverNode => {
      if (p.length === 0) return { ...node, [field]: val };
      const newDescendants = [...node.descendants];
      newDescendants[p[0]] = update(newDescendants[p[0]], p.slice(1));
      return { ...node, descendants: newDescendants };
    };
    setEvolverData(update(evolverData, path));
  };

  const handleRemoveEvolverNode = (path: number[]) => {
    if (path.length === 0) return; // Cannot remove root
    const remove = (node: EvolverNode, p: number[]): EvolverNode => {
      if (p.length === 1) {
        const newDescendants = [...node.descendants];
        newDescendants.splice(p[0], 1);
        return { ...node, descendants: newDescendants };
      }
      const newDescendants = [...node.descendants];
      newDescendants[p[0]] = remove(newDescendants[p[0]], p.slice(1));
      return { ...node, descendants: newDescendants };
    };
    setEvolverData(remove(evolverData, path));
  };

  const handleAddDescendantEvolverNode = (path: number[]) => {
    const add = (node: EvolverNode, p: number[]): EvolverNode => {
      if (p.length === 0) {
        return {
          ...node,
          descendants: [...node.descendants, { id: Date.now().toString(), name: 'New Stage', wordsText: '', subStages: 0, descendants: [] }]
        };
      }
      const newDescendants = [...node.descendants];
      newDescendants[p[0]] = add(newDescendants[p[0]], p.slice(1));
      return { ...node, descendants: newDescendants };
    };
    setEvolverData(add(evolverData, path));
  };

  const runEvolver = async () => {
    setIsEvolving(true);
    setErrorMsg(null);
    setEvolverResults([]);
    
    const results: EvolverEdgeResult[] = [];
    
    const traverse = async (node: EvolverNode) => {
      for (const desc of node.descendants) {
        const sourceWords = node.wordsText.split('\n').map(w => w.trim()).filter(w => w);
        const targetWords = desc.wordsText.split('\n').map(w => w.trim()).filter(w => w);
        
        try {
          let steps = await algorithmicEvolveEdge(node.name, desc.name, sourceWords, targetWords, desc.subStages);
          results.push({
            sourceId: node.id,
            targetId: desc.id,
            sourceName: node.name,
            targetName: desc.name,
            steps
          });
        } catch (e: any) {
          console.error(`Error evolving ${node.name} -> ${desc.name}:`, e);
          let displayMessage = e.message || 'Check console.';
          
          // Try to parse JSON error if it looks like one
          if (displayMessage.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(displayMessage);
              if (parsed.error && parsed.error.message) {
                displayMessage = parsed.error.message;
              }
            } catch (ignore) {}
          }
          
          setErrorMsg(`Error evolving ${node.name} to ${desc.name}: ${displayMessage}`);
        }
        await traverse(desc);
      }
    };
    
    await traverse(evolverData);
    setEvolverResults(results);
    setIsEvolving(false);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(inputs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cognate-set.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isCSV = file.name.endsWith('.csv');
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (isCSV) {
          // Basic CLDF/CSV parsing
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                console.warn("CSV Parsing errors:", results.errors);
              }
              
              const data = results.data as any[];
              
              // Try to map CLDF forms to our LanguageInput structure
              // We look for common CLDF columns: Language_ID, Form, Segments, Parameter_ID
              
              const languagesMap = new Map<string, string[]>();
              
              data.forEach(row => {
                const langId = row['Language_ID'] || row['Language'] || row['Doculect'];
                const form = row['Segments'] || row['Form'] || row['Value'];
                
                if (langId && form) {
                  // If it's space-separated segments, join them for our IPA input
                  const cleanForm = form.replace(/\s+/g, '');
                  
                  if (!languagesMap.has(langId)) {
                    languagesMap.set(langId, []);
                  }
                  languagesMap.get(langId)!.push(cleanForm);
                }
              });
              
              if (languagesMap.size === 0) {
                setErrorMsg('Could not find valid Language_ID and Form/Segments columns in the CSV.');
                return;
              }
              
              // For simplicity in this tool, we take the first word for each language
              // In a full CLDF implementation, we'd need a way to select which concept (Parameter_ID) to reconstruct
              const newInputs: LanguageInput[] = Array.from(languagesMap.entries()).map(([langId, forms], index) => ({
                id: `imported-${index}`,
                name: langId,
                word: forms[0] || '',
                descendants: []
              }));
              
              setInputs(newInputs);
            }
          });
        } else {
          // Standard JSON import
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setInputs(parsed);
          } else {
            setErrorMsg('Invalid JSON format: Expected an array of language inputs.');
          }
        }
      } catch (err) {
        setErrorMsg('Failed to parse file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Filter sound changes based on selection
  const visibleSoundChanges = useMemo(() => {
    if (!result) return [];
    if (!selectedLang) return result.soundChanges;
    return result.soundChanges.filter(sc => sc.language === selectedLang || sc.language === `${selectedLang} (Spelling)`);
  }, [result, selectedLang]);

  return (
    <div className="min-h-screen bg-rt-bg text-rt-text p-6 md:p-10 font-sans selection:bg-rt-accent/30 transition-colors duration-300">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-rt-border pb-10 relative">
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-black text-rt-accent tracking-tighter leading-none mb-2">RootTrace</h1>
          <p className="text-rt-muted font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] font-bold">Probabilistic Phonological Solver</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-1 bg-rt-input p-1 rounded-xl border border-rt-border mx-auto md:mx-0 w-full md:w-auto">
          <button 
            onClick={() => setAppMode('reconstruct')}
            className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${appMode === 'reconstruct' ? 'bg-rt-card text-rt-text shadow-sm' : 'text-rt-muted hover:text-rt-text'}`}
          >
            Proto-Reconstructor
          </button>
          <button 
            onClick={() => setAppMode('shift')}
            className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${appMode === 'shift' ? 'bg-rt-card text-rt-text shadow-sm' : 'text-rt-muted hover:text-rt-text'}`}
          >
            Sound Shift Creator
          </button>
          <button 
            onClick={() => setAppMode('evolver')}
            className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${appMode === 'evolver' ? 'bg-rt-card text-rt-text shadow-sm' : 'text-rt-muted hover:text-rt-text'}`}
          >
            Language Evolution
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <div className="hidden lg:block text-right">
            <p className="text-[10px] text-rt-muted font-bold uppercase tracking-wider mb-1">Convergence Engine</p>
            <p className="text-xs text-rt-accent font-mono">{(inputs.length * mcmcIterations / 1000).toFixed(1)}k MCMC Samples</p>
          </div>
          <select 
            value={method} 
            onChange={e => setMethod(e.target.value as ReconstructionMethod)}
            className="bg-rt-input border border-rt-border text-sm rounded-xl p-3 text-rt-text outline-none focus:ring-2 ring-rt-accent/50 transition-all cursor-pointer"
          >
            <option value={ReconstructionMethod.BAYESIAN_MCMC}>Bayesian (Recommended)</option>
            <option value={ReconstructionMethod.FEATURE_WEIGHTED}>Medoid (Heuristic)</option>
          </select>
          <button 
            onClick={toggleTheme}
            className="p-3 rounded-xl border bg-rt-card border-rt-border text-rt-muted hover:text-rt-text transition-all"
            title="Toggle Theme"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-xl border transition-all ${showSettings ? 'bg-rt-accent border-rt-accent text-white' : 'bg-rt-card border-rt-border text-rt-muted hover:text-rt-text hover:border-rt-muted'}`}
            title="Algorithm Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button 
            onClick={() => setShowTutorial(true)}
            className="p-3 rounded-xl border bg-rt-card border-rt-border text-rt-muted hover:text-rt-text transition-all"
            title="Tutorial & Info"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          </button>
        </div>

        {showSettings && (
          <div className="absolute top-full right-0 sm:right-0 left-0 sm:left-auto mt-4 w-full sm:w-80 max-w-[calc(100vw-3rem)] mx-auto bg-rt-card border border-rt-border rounded-2xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-serif font-bold text-rt-text uppercase tracking-widest mb-6">Algorithm Parameters</h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] text-rt-muted font-bold uppercase">MCMC Iterations</label>
                  <span className="text-[10px] text-rt-accent font-mono">{mcmcIterations}</span>
                </div>
                <input 
                  type="range" min="1000" max="10000" step="500" 
                  value={mcmcIterations} 
                  onChange={e => setMcmcIterations(Number(e.target.value))}
                  className="w-full accent-rt-accent"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] text-rt-muted font-bold uppercase">Gap Penalty</label>
                  <span className="text-[10px] text-rt-accent font-mono">{gapPenalty}</span>
                </div>
                <input 
                  type="range" min="1" max="20" step="1" 
                  value={gapPenalty} 
                  onChange={e => setGapPenalty(Number(e.target.value))}
                  className="w-full accent-rt-accent"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] text-rt-muted font-bold uppercase">Unknown Char Penalty</label>
                  <span className="text-[10px] text-rt-accent font-mono">{unknownCharPenalty}</span>
                </div>
                <input 
                  type="range" min="1" max="20" step="1" 
                  value={unknownCharPenalty} 
                  onChange={e => setUnknownCharPenalty(Number(e.target.value))}
                  className="w-full accent-rt-accent"
                />
              </div>
            </div>
            
            <button 
              onClick={() => { setShowSettings(false); runReconstruction(); }}
              className="mt-6 w-full py-2.5 bg-rt-accent hover:bg-rt-accent/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Apply & Re-run
            </button>
          </div>
        )}
      </header>

      {appMode === 'reconstruct' && (
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-4 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-serif font-bold text-rt-text">Cognate Set</h2>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer text-[10px] font-bold bg-rt-card hover:bg-rt-input px-3 py-2 rounded-xl border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text flex items-center">
                Import
                <input type="file" accept=".json,.csv" className="hidden" onChange={handleImportJSON} />
              </label>
              <button onClick={handleExportJSON} className="text-[10px] font-bold bg-rt-card hover:bg-rt-input px-3 py-2 rounded-xl border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text">
                Export
              </button>
              <button onClick={() => setInputs([...inputs, { id: Date.now().toString(), name: 'New', word: '' }])} className="text-[10px] font-bold bg-rt-card hover:bg-rt-input px-3 py-2 rounded-xl border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text">
                Add Lang
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-3 custom-scrollbar">
            {inputs.map((lang, idx) => (
              <LanguageInputNode
                key={lang.id}
                lang={lang}
                path={[idx]}
                onUpdate={handleUpdateNode}
                onRemove={handleRemoveNode}
                onAddDescendant={handleAddDescendant}
                onAddParent={handleAddParent}
                selectedLang={selectedLang}
                onSelectLang={setSelectedLang}
              />
            ))}
          </div>
          <button onClick={runReconstruction} disabled={isProcessing} className={`w-full py-5 rounded-2xl font-black tracking-[0.2em] shadow-2xl transition-all transform active:scale-95 text-sm ${isProcessing ? 'bg-rt-input text-rt-muted' : 'bg-rt-accent hover:bg-rt-accent/90 text-white hover:-translate-y-1'}`}>
            {isProcessing ? 'SAMPLING HYPOTHESES...' : 'RECONSTRUCT ROOT'}
          </button>
        </aside>

        <section className="lg:col-span-8 space-y-10">
          {result ? (
            <>
              <div className="bg-rt-card border border-rt-border rounded-[2.5rem] p-6 sm:p-12 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-rt-accent opacity-70"></div>
            <h3 className="text-rt-muted text-[11px] font-bold uppercase tracking-[0.4em] mb-4">Reconstructed Root</h3>
                <div className="text-5xl sm:text-7xl md:text-8xl font-black ipa-font text-rt-text drop-shadow-xl tracking-tighter mb-8 break-all">{result.protoForm}</div>
                
                {result.candidates && result.candidates.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {result.candidates.map((c, i) => (
                      <button key={i} onClick={() => setResult({...result, protoForm: c.form})} className={`px-4 py-2 rounded-full text-xs font-mono transition-all border ${result.protoForm === c.form ? 'bg-rt-accent border-rt-accent text-white shadow-lg' : 'bg-rt-input border-rt-border text-rt-muted hover:border-rt-muted'}`}>
                        {c.form} ({((c.probability || 0) * 100).toFixed(0)}%)
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-rt-card border border-rt-border rounded-3xl p-4 sm:p-8 overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2 mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-rt-text">Alignment Matrix</h3>
                    <p className="text-[10px] text-rt-muted mt-1 uppercase font-bold tracking-widest">Feature-Sensitive Segment Mapping</p>
                  </div>
                  <span className="text-[10px] text-rt-accent/60 font-mono">Click segments to inspect posteriors</span>
                </div>
                <div className="overflow-x-auto pb-4 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="p-4 text-[10px] text-rt-muted font-black uppercase border-b border-rt-border">Source</th>
                        <th className="p-4 text-[10px] text-rt-muted font-black uppercase border-b border-rt-border text-center" title="Conservatism Weight (Pillar 5)">Weight</th>
                        {result.alignmentMatrix[0].map((_, i) => (
                          <th key={i} onClick={() => setInspectedCol(i)} className={`p-4 text-center text-[10px] border-b border-rt-border cursor-pointer hover:bg-rt-accent/5 transition-all font-black ${inspectedCol === i ? 'text-rt-accent bg-rt-accent/10' : 'text-rt-muted'}`}>SEG {i+1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-rt-accent/10 ring-1 ring-rt-accent/20">
                        <td className="p-5 text-xs font-black text-rt-accent border-r border-rt-border uppercase">Proto</td>
                        <td className="p-5 text-xs font-black text-rt-accent border-r border-rt-border text-center">-</td>
                        {result.protoTokens.map((c, i) => (
                          <td key={i} onClick={() => setInspectedCol(i)} className={`p-4 text-center ipa-font text-3xl text-rt-text cursor-pointer transition-all hover:text-rt-accent ${inspectedCol === i ? 'bg-rt-accent/20' : ''}`}>{c}</td>
                        ))}
                      </tr>
                      {inputs.map((l, idx) => (
                        <tr 
                          key={l.id} 
                          className={`hover:bg-rt-input transition-colors border-b border-rt-border ${selectedLang === l.name || selectedLang === `${l.name} (Spelling)` ? 'bg-rt-accent/10' : ''}`}
                          onClick={() => setSelectedLang(selectedLang === l.name ? null : l.name)}
                        >
                          <td className={`p-5 text-xs font-bold border-r border-rt-border ${selectedLang === l.name || selectedLang === `${l.name} (Spelling)` ? 'text-rt-accent' : 'text-rt-muted'}`}>{l.name}</td>
                          <td className="p-5 text-xs font-mono text-rt-muted border-r border-rt-border text-center">
                            {result.languageWeights && result.languageWeights[idx] !== undefined ? result.languageWeights[idx].toFixed(2) : '1.00'}
                          </td>
                          {result.alignmentMatrix[idx]?.map((c, ci) => (
                            <td key={ci} className={`p-4 text-center ipa-font text-xl ${c === GAP_CHAR ? 'text-rt-muted' : (result.protoTokens[ci] === c ? 'text-rt-success/90' : 'text-rt-warning/70')} ${inspectedCol === ci ? 'bg-rt-input' : ''}`}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {inspectedCol !== null && result.distribution?.[inspectedCol] && (
                <div className="bg-rt-card border border-rt-accent/30 rounded-[2rem] p-4 sm:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-6 backdrop-blur-xl">
                  <div className="flex justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-rt-accent uppercase tracking-widest">Segment Distribution: SEG #{inspectedCol + 1}</h4>
                      <p className="text-[10px] text-rt-muted mt-1 font-mono">Statistical likelihood based on MCMC sampler</p>
                    </div>
                    <button onClick={() => setInspectedCol(null)} className="text-rt-muted hover:text-rt-text transition-colors bg-rt-input p-2 rounded-full shrink-0">✕</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
                    {Object.entries(result.distribution[inspectedCol])
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .slice(0, 8)
                      .map(([char, prob], i) => (
                        <div key={i} className="flex items-center gap-5 group">
                          <div className="w-12 h-12 rounded-2xl bg-rt-input flex items-center justify-center ipa-font text-2xl text-rt-text group-hover:bg-rt-accent group-hover:text-white transition-all shadow-lg">{char}</div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1.5 items-end">
                              <span className="text-[10px] text-rt-muted uppercase font-black tracking-tight truncate max-w-[150px]">{describeFeatures(char)}</span>
                              <span className="text-xs font-mono text-rt-accent font-bold">{(((prob as number) || 0) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-rt-input rounded-full overflow-hidden">
                              <div className="h-full bg-rt-accent rounded-full transition-all duration-1000 ease-out" style={{ width: `${(prob as number) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Stacked Layout for Tree and Sound Changes */}
              <div className="h-[550px] flex flex-col w-full">
                <h3 className="text-sm font-serif font-bold uppercase text-rt-muted tracking-[0.2em] mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rt-accent"></span>
                  Evolutionary Tree
                </h3>
                <TreeVisualization 
                  data={result.treeData} 
                  soundChanges={result.soundChanges}
                  selectedLanguage={selectedLang}
                  onSelect={setSelectedLang}
                />
              </div>

              <div className="h-[500px] flex flex-col w-full">
                <h3 className="text-sm font-serif font-bold uppercase text-rt-muted tracking-[0.2em] mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rt-success"></span>
                  {selectedLang ? `Changes in ${selectedLang}` : 'All Detected Trajectories'}
                  {selectedLang && (
                    <button onClick={() => setSelectedLang(null)} className="ml-auto text-[9px] bg-rt-input px-2 py-1 rounded text-rt-muted hover:text-rt-text transition-colors">
                      RESET FILTER
                    </button>
                  )}
                </h3>
                <div className="flex-1 bg-rt-card border border-rt-border rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-3">
                  {visibleSoundChanges.slice(0, 50).map((sc, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-rt-input border border-rt-border text-xs transition-all hover:bg-rt-card hover:border-rt-accent/20 group animate-in fade-in slide-in-from-left-2 duration-300" style={{animationDelay: `${i * 20}ms`}}>
                      <span className="bg-rt-bg px-2.5 py-1.5 rounded-lg font-black text-rt-muted min-w-[85px] text-center truncate uppercase text-[9px] tracking-tighter w-fit">{sc.language}</span>
                      <div className="flex items-center gap-2.5">
                        <span className="ipa-font text-lg text-rt-accent/70 font-bold">*{sc.from}</span>
                        <span className="text-rt-muted text-lg">→</span>
                        <span className={`ipa-font text-lg font-bold ${sc.to === '∅' ? 'text-rt-muted' : 'text-rt-success'}`}>{sc.to}</span>
                      </div>
                      <span className="sm:ml-auto text-[10px] text-rt-muted italic font-medium opacity-80 sm:opacity-60 group-hover:opacity-100 transition-opacity">{sc.description}</span>
                    </div>
                  ))}
                  {visibleSoundChanges.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-rt-muted opacity-50">
                      <p className="italic text-sm py-2 uppercase tracking-widest font-black">No Changes Found</p>
                      <p className="text-[10px] text-center max-w-[200px]">The segments in this language match the reconstructed root perfectly.</p>
                    </div>
                  )}
                </div>
              </div>

              {result.inferredShifts && result.inferredShifts.length > 0 && (
                <div className="h-[400px] flex flex-col w-full">
                  <h3 className="text-sm font-serif font-bold uppercase text-rt-warning tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rt-warning animate-pulse"></span>
                    Inferred Sound Shifts
                  </h3>
                  <div className="flex-1 bg-rt-warning/5 border border-rt-warning/20 rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-3">
                    {result.inferredShifts.map((shift, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-rt-card border border-rt-warning/30 text-xs transition-all hover:bg-rt-input hover:border-rt-warning/50 group animate-in fade-in slide-in-from-left-2 duration-300" style={{animationDelay: `${i * 20}ms`}}>
                        <span className="bg-rt-bg px-2.5 py-1.5 rounded-lg font-black text-rt-warning/70 min-w-[85px] text-center truncate uppercase text-[9px] tracking-tighter w-fit">{shift.language}</span>
                        <div className="flex items-center gap-2.5">
                          <span className="ipa-font text-lg text-rt-accent/70 font-bold">*{shift.from}</span>
                          <span className="text-rt-muted text-lg">→</span>
                          <span className={`ipa-font text-lg font-bold ${shift.to === '∅' ? 'text-rt-muted' : 'text-rt-success'}`}>{shift.to}</span>
                          <span className="text-rt-muted font-mono text-[10px] ml-2">/ {shift.environment}</span>
                        </div>
                        <div className="sm:ml-auto flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1 mt-2 sm:mt-0">
                          <span className="text-[10px] text-rt-warning/80 font-black uppercase tracking-widest">{shift.typologicalCategory}</span>
                          <span className="text-[9px] text-rt-muted font-mono">Score: {((shift.naturalnessScore || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.generalizedLaws && result.generalizedLaws.length > 0 && (
                <div className="h-[400px] flex flex-col w-full">
                  <h3 className="text-sm font-serif font-bold uppercase text-rt-accent tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rt-accent animate-pulse"></span>
                    Generalized Sound Laws
                  </h3>
                  <div className="flex-1 bg-rt-accent/5 border border-rt-accent/20 rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-8">
                    {Array.from(new Set(result.generalizedLaws.map(l => l.stage || 1))).sort((a, b) => (a as number) - (b as number)).map(stage => (
                      <div key={stage} className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-rt-accent text-rt-bg text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">
                            Stage {stage}
                          </div>
                          <div className="h-px flex-grow bg-rt-accent/20"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {result.generalizedLaws.filter(l => (l.stage || 1) === stage).map((law, i) => (
                            <div key={i} className="flex flex-col gap-2 p-4 rounded-xl bg-rt-card border border-rt-accent/30 text-xs transition-all hover:bg-rt-input hover:border-rt-accent/50 group animate-in fade-in slide-in-from-left-2 duration-300" style={{animationDelay: `${i * 20}ms`}}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="bg-rt-bg px-2.5 py-1.5 rounded-lg font-black text-rt-accent/70 min-w-[85px] text-center truncate uppercase text-[9px] tracking-tighter w-fit">{law.language}</span>
                                </div>
                                <span className="text-[10px] text-rt-accent/80 font-black uppercase tracking-widest">{law.typologicalCategory}</span>
                                <span className="text-[9px] text-rt-muted font-mono">Score: {((law.naturalnessScore || 0) * 100).toFixed(0)}%</span>
                              </div>
                              <h4 className="text-sm font-bold text-rt-text mt-1">{law.name}</h4>
                              {law.ruleString && (
                                <div className="bg-rt-bg/50 border border-rt-accent/20 p-2 rounded-lg font-mono text-rt-accent text-xs my-1 flex justify-between items-center">
                                  <span>{law.ruleString}</span>
                                  {law.applicationRate !== undefined && (
                                    <span className="text-[9px] text-rt-muted">
                                      Rate: {(law.applicationRate * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="text-xs text-rt-muted italic">{law.description}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {law.examples.map((ex, j) => (
                                  <span key={j} className="bg-rt-bg border border-rt-border px-2 py-1 rounded text-[10px] font-mono text-rt-accent">
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.exceptions && result.exceptions.length > 0 && (
                <div className="h-[200px] flex flex-col w-full">
                  <h3 className="text-sm font-serif font-bold uppercase text-rt-error tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rt-error animate-pulse"></span>
                    Exceptions / Possible Borrowings
                  </h3>
                  <div className="flex-1 bg-rt-error/5 border border-rt-error/20 rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-2">
                    {result.exceptions.map((exc, i) => (
                      <div key={i} className="p-3 rounded-xl bg-rt-card border border-rt-error/30 text-xs text-rt-error font-mono">
                        {exc}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-[500px] border-2 border-dashed border-rt-border rounded-[3rem] flex flex-col items-center justify-center text-rt-muted animate-pulse bg-rt-input">
              <div className="w-20 h-20 bg-rt-card flex items-center justify-center rounded-full mb-8 shadow-inner">
                <svg className="w-10 h-10 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.450 0l-7 7a1 1 0 00.1 1.547L8 14.167v1.75l-4.783 1.966a1 1 0 00.328 1.917h12.91a1 1 0 00.328-1.917L12 15.917v-1.75l3.955-3.067a1 1 0 00.1-1.547l-7-7z" clipRule="evenodd" /></svg>
              </div>
              <p className="font-mono text-sm tracking-[0.5em] uppercase font-black opacity-20">Engine Idle</p>
            </div>
          )}
        </section>
      </main>
      )}

      {appMode === 'shift' && (
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-rt-card border border-rt-border rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-xl font-serif font-bold text-rt-text">Lexicon</h2>
            <p className="text-xs text-rt-muted">Enter words to evolve, one per line.</p>
            <textarea 
              value={shiftWords}
              onChange={e => setShiftWords(e.target.value)}
              className="w-full h-48 bg-rt-input border border-rt-border rounded-xl p-4 text-rt-text font-mono text-sm focus:ring-2 ring-rt-accent/50 outline-none resize-none custom-scrollbar"
              placeholder="pater&#10;mater&#10;frater"
            />
          </div>
          <div className="bg-rt-card border border-rt-border rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-xl font-serif font-bold text-rt-text">Sound Laws</h2>
            <p className="text-xs text-rt-muted leading-relaxed">
              Format: <code>target &gt; replacement / env // exception</code><br/>
              Define classes: <code>stop = p t k</code> and use as <code>@stop</code><br/>
              Use <code>V</code> for vowels, <code>C</code> for consonants, <code>#</code> for word boundaries.<br/>
              Use sets: <code>{'{p,t,k} > {b,d,g}'}</code><br/>
              Use regex repeaters in environment: <code>C+</code> or <code>V?</code>
            </p>
            <textarea 
              value={shiftRules}
              onChange={e => setShiftRules(e.target.value)}
              className="w-full h-64 bg-rt-input border border-rt-border rounded-xl p-4 text-rt-text font-mono text-sm focus:ring-2 ring-rt-accent/50 outline-none resize-none custom-scrollbar"
              placeholder="% Define classes&#10;stop = p t k&#10;fric = f θ x&#10;&#10;% Apply shifts&#10;@stop > @fric / V_V&#10;{a,o} > e / _C // _k&#10;∅ > i / C_C&#10;p > ∅ / _#"
            />
          </div>
        </section>

        <section className="lg:col-span-8">
          <div className="bg-rt-card border border-rt-border rounded-3xl p-6 shadow-sm min-h-[500px]">
            <h2 className="text-xl font-serif font-bold text-rt-text mb-6">Evolution Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-rt-border text-rt-muted text-xs uppercase tracking-wider">
                    <th className="pb-3 font-bold">Proto-Word</th>
                    <th className="pb-3 font-bold">Evolution Steps</th>
                    <th className="pb-3 font-bold text-rt-accent">Modern Form</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {shiftResults.map((res, i) => (
                    <tr key={i} className="border-b border-rt-border/50 hover:bg-rt-input/50 transition-colors">
                      <td className="py-4 font-mono font-bold text-rt-text align-top">{res.original}</td>
                      <td className="py-4 align-top">
                        {res.history.length === 0 ? <span className="text-rt-muted italic text-xs">No changes</span> : (
                          <div className="flex flex-col gap-1.5">
                            {res.history.map((step, j) => (
                              <div key={j} className="flex items-center gap-3 text-xs">
                                <span className="text-rt-muted font-mono bg-rt-bg px-2 py-0.5 rounded border border-rt-border" title={step.rule}>{step.rule}</span>
                                <span className="text-rt-text font-mono">→ {step.after}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4 font-mono font-black text-rt-accent text-lg align-top">{res.final}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      )}

      {appMode === 'evolver' && (
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in">
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-rt-card border border-rt-border rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-serif font-bold text-rt-text">Evolution Stages</h2>
              <button 
                onClick={runEvolver}
                disabled={isEvolving}
                className="w-full sm:w-auto bg-rt-accent hover:bg-rt-accent/90 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isEvolving ? 'Evolving...' : 'Auto-Evolve'}
              </button>
            </div>
            <p className="text-xs text-rt-muted mb-6 leading-relaxed">
              Define the stages of your language. Input words for each stage, and the algorithm will infer the sound laws that occurred between them, generating intermediate sub-stages if requested.
            </p>

            <div className="flex flex-col gap-2">
              <EvolverInputNode 
                node={evolverData} 
                path={[]} 
                onUpdate={handleUpdateEvolverNode} 
                onRemove={handleRemoveEvolverNode} 
                onAddDescendant={handleAddDescendantEvolverNode} 
              />
            </div>
          </div>
        </section>

        <section className="lg:col-span-8">
          <div className="bg-rt-card border border-rt-border rounded-3xl p-6 shadow-sm min-h-[500px]">
            <h2 className="text-xl font-serif font-bold text-rt-text mb-6">Inferred Sound Laws & Evolution</h2>
            {isEvolving ? (
              <div className="flex flex-col items-center justify-center h-64 text-rt-muted gap-4">
                <div className="w-8 h-8 border-4 border-rt-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="font-mono text-sm">Analyzing phonetic shifts and inferring rules...</p>
              </div>
            ) : evolverResults.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-rt-muted italic text-sm">
                Click "Auto-Evolve" to generate sound laws between stages.
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {evolverResults.map((result, idx) => (
                  <div key={idx} className="border border-rt-border rounded-2xl p-6 bg-rt-bg">
                    <h3 className="text-lg font-black text-rt-accent mb-4">
                      {result.sourceName} → {result.targetName}
                    </h3>
                    
                    <div className="mb-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rt-muted mb-3 border-b border-rt-border pb-2">Evolution Steps</h4>
                      {result.steps.length === 0 ? (
                        <p className="text-sm text-rt-muted italic">No sound laws inferred.</p>
                      ) : (
                        <div className="space-y-6">
                          {result.steps.map((step, sIdx) => (
                            <div key={sIdx} className="bg-rt-input/50 rounded-xl p-4 border border-rt-border">
                              <h5 className="text-sm font-bold text-rt-text mb-2">{step.stepName}</h5>
                              
                              <div className="mb-4">
                                <h6 className="text-[10px] uppercase tracking-widest text-rt-muted mb-1">Sound Laws Applied</h6>
                                {step.soundLaws.length === 0 ? (
                                  <span className="text-xs text-rt-muted italic">None</span>
                                ) : (
                                  <ul className="list-disc list-inside text-xs font-mono text-rt-text">
                                    {step.soundLaws.map((law, lIdx) => <li key={lIdx}>{law}</li>)}
                                  </ul>
                                )}
                              </div>

                              {step.exceptions && step.exceptions.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-[10px] uppercase tracking-widest text-rt-muted mb-1">Exceptions / Possible Borrowings</h6>
                                  <ul className="list-disc list-inside text-xs font-mono text-amber-500">
                                    {step.exceptions.map((exc, eIdx) => <li key={eIdx}>{exc}</li>)}
                                  </ul>
                                </div>
                              )}

                              {step.sporadicShifts && step.sporadicShifts.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-[10px] uppercase tracking-widest text-rt-muted mb-1">Sporadic Shifts</h6>
                                  <ul className="list-disc list-inside text-xs font-mono text-blue-400">
                                    {step.sporadicShifts.map((spor, sIdx) => <li key={sIdx}>{spor}</li>)}
                                  </ul>
                                </div>
                              )}

                              <div>
                                <h6 className="text-[10px] uppercase tracking-widest text-rt-muted mb-1">Lexicon State</h6>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {step.words.map((word, wIdx) => (
                                    <div key={wIdx} className="bg-rt-bg border border-rt-border rounded-lg p-2 text-xs flex flex-col">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-rt-muted font-mono">{word.ancestor}</span>
                                        <span className="text-rt-accent font-bold font-mono">→ {word.result}</span>
                                      </div>
                                      {word.changes.length > 0 && (
                                        <div className="text-[9px] text-rt-muted font-mono mt-1 pt-1 border-t border-rt-border/50">
                                          {word.changes.join(' → ')}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      )}

      <footer className="max-w-7xl mx-auto mt-20 pt-10 border-t border-rt-border flex flex-col md:flex-row justify-between items-center text-rt-muted gap-6">
        <p className="text-[10px] font-black uppercase tracking-widest">Powered by MCMC Sampling • RootTrace</p>
        <div className="flex gap-8 items-center">
          <span className="text-[10px] font-black uppercase tracking-widest">Phonological Coverage: 100%</span>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-rt-border"></div>)}
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {errorMsg && <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />}
    </div>
  );
}
