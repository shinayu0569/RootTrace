import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { LanguageInput, ReconstructionMethod, ReconstructionResult, TreeNode, SoundChangeNote, EvolverNode, Paradigm, ParadigmCell } from './types';
import { reconstructProtoWord, performMSA_to_proto, AnnotatedCandidate } from './services/engine';
import { GAP_CHAR, describeFeatures, getPhonemesByFeatures, matchFeatures } from './services/phonetics';
import { autoEvolveEdge, algorithmicEvolveEdge, EvolverEdgeResult } from './services/evolver';
import { phonemeDistance, nearestNeighbours } from './services/phonemeDistance';
import { featureMatrix } from './services/featureMatrix';
import { DistinctiveFeatures } from './types';
import SoundChangeApplier from './src/components/SoundChangeApplier';

// Global XMLSerializer for SVG export
declare global {
  interface XMLSerializer {
    new (): XMLSerializer;
  }
}

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
  const isUnattested = node.isUnattested || false;
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
        stroke={isUnattested ? "#f59e0b" : (isSelected ? "#34d399" : "var(--border)")}
        strokeWidth={isUnattested ? 3 : 2}
        strokeDasharray={isUnattested ? "5,3" : "none"}
        className="shadow-2xl transition-colors duration-300" 
      />
      {/* Asterisk indicator for unattested nodes */}
      {isUnattested && !isRoot && (
        <g transform={`translate(${NODE_WIDTH - 15}, 15)`}>
          <circle cx="0" cy="0" r="8" fill="#f59e0b" opacity="0.9"/>
          <text x="0" y="4" textAnchor="middle" fill="white" className="text-[12px] font-black">*</text>
        </g>
      )}
      <text x={NODE_WIDTH/2} y={isRoot ? 35 : 30} textAnchor="middle" fill={isRoot ? "#ffffff" : "var(--text)"} className={`font-bold ipa-font ${isRoot ? 'text-xl' : 'text-base'} ${isUnattested ? 'italic' : ''}`}>{isRoot ? node.name : node.reconstruction}</text>
      {!isRoot && <text x={NODE_WIDTH/2} y={15} textAnchor="middle" fill={isUnattested ? "#f59e0b" : "var(--muted)"} className={`text-[10px] uppercase font-black tracking-tighter ${isUnattested ? 'font-bold' : ''}`}>{node.name}</text>}
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
  const svgRef = useRef<SVGSVGElement>(null);
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

    // Calculate actual bounds by finding min/max coordinates of all nodes
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    nodes.forEach(node => {
      const nodeLeft = node.x - NODE_WIDTH/2;
      const nodeRight = node.x + NODE_WIDTH/2;
      minX = Math.min(minX, nodeLeft);
      maxX = Math.max(maxX, nodeRight);
      maxY = Math.max(maxY, node.y);
    });
    
    // Add padding and ensure minimum width for root
    const padding = 40;
    const totalWidth = Math.max(maxX + padding, rootLayout.x + NODE_WIDTH + X_GAP, currentLeafX);
    const totalHeight = maxY + NODE_HEIGHT + 60;

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

  // Download function for PNG export
  const downloadAsPNG = () => {
    if (!svgRef.current) return;

    // Clone the SVG to apply computed styles
    const svgElement = svgRef.current;
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Get the actual SVG dimensions from the viewBox or bounding box
    let svgWidth = viewWidth;
    let svgHeight = viewHeight;
    
    // Try to get more accurate dimensions from the SVG content
    try {
      const bbox = svgElement.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        // Add padding to ensure all content is captured
        const padding = 20;
        svgWidth = Math.max(viewWidth, bbox.width + bbox.x + padding);
        svgHeight = Math.max(viewHeight, bbox.height + bbox.y + padding);
      }
    } catch (e) {
      // Fallback to viewBox dimensions
    }
    
    // Set the cloned SVG dimensions explicitly
    clonedSvg.setAttribute('width', String(svgWidth));
    clonedSvg.setAttribute('height', String(svgHeight));
    clonedSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    
    // Get computed styles from the original and apply to clone
    const allElements = svgElement.querySelectorAll('*');
    const clonedElements = clonedSvg.querySelectorAll('*');
    
    // Apply white background
    clonedSvg.style.backgroundColor = '#ffffff';
    
    // Map CSS variables to actual colors
    const styleMap: Record<string, string> = {
      'var(--card-bg)': '#fafaf9',
      'var(--text)': '#292524',
      'var(--border)': '#e7e5e4',
      'var(--accent)': '#ea580c',
      'var(--muted)': '#78716c',
      'var(--bg)': '#f5f5f4'
    };
    
    // Process all elements and inline styles
    allElements.forEach((el, i) => {
      const computed = window.getComputedStyle(el);
      const clonedEl = clonedElements[i];
      
      if (clonedEl) {
        const fill = computed.fill;
        const stroke = computed.stroke;
        
        if (fill && fill !== 'none') {
          (clonedEl as SVGElement).setAttribute('fill', fill);
        }
        if (stroke && stroke !== 'none') {
          (clonedEl as SVGElement).setAttribute('stroke', stroke);
        }
      }
    });

    // Manually fix colors based on attributes
    const fixColors = (el: Element) => {
      const attrs = ['fill', 'stroke'];
      attrs.forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && styleMap[val]) {
          el.setAttribute(attr, styleMap[val]);
        }
      });
      Array.from(el.children).forEach(fixColors);
    };
    fixColors(clonedSvg);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale up for high quality
    const scale = 2;
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;
    ctx.scale(scale, scale);

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, svgWidth, svgHeight);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reconstruction-tree-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    };
    img.src = URL.createObjectURL(svgBlob);
  };

  return (
    <div className="w-full h-full bg-rt-card rounded-2xl border border-rt-border p-2 sm:p-4 flex flex-col min-h-[300px] sm:min-h-[400px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 gap-2">
        <h3 className="text-xs sm:text-sm font-serif font-bold uppercase text-rt-muted tracking-[0.2em] flex items-center gap-2 sm:gap-3">
          <span className="w-2 h-2 rounded-full bg-rt-accent"></span>
          Evolutionary Tree
        </h3>
        <button
          onClick={downloadAsPNG}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-rt-accent text-white rounded-lg text-xs font-bold hover:bg-rt-accent/90 transition-colors flex items-center gap-1.5 sm:gap-2"
          title="Download tree as PNG image"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-4-4l4.586-4.586a2 2 0 012.828 0L16 16m-4-4l4.586-4.586a2 2 0 012.828 0L16 16m-4-4l4.586-4.586a2 2 0 012.828 0L16 16M3 8l7.893 7.893a2 2 0 012.828 0L21 8M3 8l7.893 7.893a2 2 0 012.828 0L21 8M3 8l7.893 7.893a2 2 0 012.828 0L21 8" />
          </svg>
          <span className="hidden sm:inline">Download PNG</span>
          <span className="sm:hidden">Save</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <svg 
          ref={svgRef}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: '300px', minHeight: '200px' }}
          onClick={() => onSelect(null)}
          className="touch-manipulation"
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
    </div>
  );
};

const LanguageInputNode: React.FC<{
  lang: LanguageInput;
  path: number[];
  onUpdate: (path: number[], field: keyof LanguageInput, val: any) => void;
  onRemove: (path: number[]) => void;
  onAddDescendant: (path: number[]) => void;
  onAddParent?: (path: number[]) => void;
  selectedLang: string | null;
  onSelectLang: (name: string | null) => void;
  // Feature 5.7: Multi-selection for subgrouping
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (name: string) => void;
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
  // Feature 5.7 props
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  depth = 0
}) => {
  const isUnattested = lang.isUnattested || false;
  
  return (
    <div className={`mt-3 ${depth > 0 ? 'ml-2 sm:ml-6 border-l-2 border-rt-border pl-2 sm:pl-4' : ''}`}>
      <div 
        className={`bg-rt-card border p-4 rounded-2xl group relative transition-all ${
          isUnattested 
            ? 'border-dashed border-amber-500/50 bg-amber-500/5' 
            : isSelected
              ? 'border-rt-accent bg-rt-accent/10 shadow-lg shadow-rt-accent/10'
              : selectedLang === lang.name || selectedLang === `${lang.name} (Spelling)` 
                ? 'border-rt-accent bg-rt-accent/10' 
                : 'border-rt-border hover:border-rt-accent/50'
        }`}
        onClick={(e) => { 
          e.stopPropagation(); 
          if (isSelectionMode && depth === 0 && onToggleSelect) {
            onToggleSelect(lang.name);
          } else {
            onSelectLang(selectedLang === lang.name ? null : lang.name); 
          }
        }}
      >
        {/* Selection checkbox - visible during selection mode */}
        {isSelectionMode && depth === 0 && onToggleSelect && (
          <div 
            className="absolute top-3 left-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
              isSelected 
                ? 'bg-rt-accent border-rt-accent' 
                : 'bg-rt-input border-rt-border hover:border-rt-accent/50'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(lang.name);
            }}
            >
              {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
        )}
        
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(path); }} 
          className="absolute top-3 right-3 text-rt-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >✕</button>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Label</label>
            <div className="relative">
              <input 
                onClick={(e) => e.stopPropagation()} 
                type="text" 
                value={lang.name} 
                onChange={e => onUpdate(path, 'name', e.target.value)} 
                className={`w-full border rounded-lg px-2 py-1.5 text-xs outline-none transition-all ${
                  isUnattested 
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-300 placeholder:text-amber-500/30 focus:border-amber-500' 
                    : 'bg-rt-input border-rt-border text-rt-text placeholder:text-rt-muted/50 focus:border-rt-accent'
                }`} 
              />
              {isUnattested && (
                <div className="absolute inset-0 pointer-events-none rounded-lg border border-amber-500/30"></div>
              )}
            </div>
          </div>
          
          <div className="col-span-1">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">
              {isUnattested 
                ? (lang.word ? 'Reconstructed Form (IPA)' : 'Form (Auto-Reconstructed)') 
                : 'Pronunciation (IPA)'
              }
              {isUnattested && <span className="ml-1 text-[8px] text-amber-500">(optional)</span>}
            </label>
            <div className="relative">
              <input 
                onClick={(e) => e.stopPropagation()} 
                type="text" 
                value={lang.word} 
                onChange={e => onUpdate(path, 'word', e.target.value)} 
                className={`w-full border rounded-lg px-2 py-1.5 text-sm ipa-font outline-none transition-all ${
                  isUnattested 
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-300 placeholder:text-amber-500/30 focus:border-amber-500 italic' 
                    : 'bg-rt-input border-rt-border text-rt-text placeholder:text-rt-muted/50 focus:border-rt-accent'
                }`} 
                placeholder={isUnattested ? "Leave empty for auto-reconstruction" : "pʰaːtēr"}
                disabled={isUnattested && lang.word === ''}  // Show as disabled until user types or reconstruction happens
              />
              {isUnattested && !lang.word && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="text-[9px] text-amber-500">→ auto</span>
                </div>
              )}
              {isUnattested && (
                <div className="absolute inset-0 pointer-events-none rounded-lg border border-amber-500/30"></div>
              )}
            </div>
          </div>
          
          <div className="col-span-1">
            <label className="text-[9px] text-rt-muted font-bold uppercase mb-1 block">Spelling (IPA) - Optional</label>
            <input 
              onClick={(e) => e.stopPropagation()} 
              type="text" 
              value={lang.spelling || ''} 
              onChange={e => onUpdate(path, 'spelling', e.target.value)} 
              className="w-full bg-rt-input border border-rt-border rounded-lg px-2 py-1.5 text-sm ipa-font outline-none focus:border-rt-accent text-rt-muted placeholder:text-rt-muted/50" 
              placeholder="Older form..." 
            />
          </div>
        </div>
        
        {/* Unattested toggle */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`unattested-${lang.id}`}
              checked={isUnattested}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate(path, 'isUnattested', e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 text-amber-600 bg-rt-input border-rt-border rounded focus:ring-amber-500 focus:ring-2 transition-all"
            />
            <label 
              htmlFor={`unattested-${lang.id}`}
              className="text-[10px] text-rt-muted font-medium cursor-pointer hover:text-rt-text transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Mark as unattested (no direct phonetic evidence)
            </label>
          </div>
          
          <div className="flex gap-2">
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
        
        {/* Info message for unattested nodes */}
        {isUnattested && (
          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-[10px] text-amber-700 dark:text-amber-300">
              <span className="font-bold">Unattested language:</span> No direct phonetic evidence required. 
              Form will be <span className="font-semibold">automatically reconstructed</span> from descendants.
              {lang.descendants && lang.descendants.length > 0 && (
                <span className="block mt-1 text-[9px] text-amber-600 dark:text-amber-400">
                  → Bidirectional: If preceded by attested ancestor, reconstruction combines both directions.
                </span>
              )}
            </p>
          </div>
        )}
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
  // Ensure subStageWeights matches subStages count
  const effectiveWeights = node.subStageWeights || [];
  const needsWeights = node.subStages > 0;
  
  // Initialize weights if needed (equal distribution)
  React.useEffect(() => {
    if (needsWeights && effectiveWeights.length !== node.subStages) {
      const equalWeight = 1 / node.subStages;
      const newWeights = Array(node.subStages).fill(equalWeight);
      onUpdate(path, 'subStageWeights', newWeights);
    }
  }, [node.subStages, needsWeights, effectiveWeights.length, onUpdate, path]);
  
  const handleWeightChange = (idx: number, value: number) => {
    const newWeights = [...(node.subStageWeights || Array(node.subStages).fill(1 / node.subStages))];
    newWeights[idx] = Math.max(0, Math.min(1, value));
    onUpdate(path, 'subStageWeights', newWeights);
  };
  
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
          
          {/* Stage Weights UI */}
          {depth > 0 && node.subStages > 0 && (
            <div className="sm:col-span-2 border-t border-rt-border pt-3 mt-1">
              <label className="text-[9px] text-rt-muted font-bold uppercase mb-2 block flex items-center gap-2">
                Stage Weights (temporal distribution)
                <span className="text-[8px] text-rt-accent font-normal normal-case">Weights determine when changes occurred</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(node.subStageWeights || Array(node.subStages).fill(1 / node.subStages)).map((w, i) => (
                  <div key={i} className="flex items-center gap-1 bg-rt-input rounded-lg px-2 py-1 border border-rt-border">
                    <span className="text-[9px] text-rt-muted">Stage {i + 1}:</span>
                    <input 
                      type="number" 
                      min="0.1" 
                      max="1" 
                      step="0.1"
                      value={w.toFixed(1)} 
                      onChange={e => handleWeightChange(i, parseFloat(e.target.value))}
                      className="w-12 bg-transparent text-xs text-rt-text outline-none text-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-rt-muted mt-1">Lower weights = earlier changes, Higher weights = later changes</p>
            </div>
          )}
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
  const [isDirty, setIsDirty] = useState(false);
  const [inputs, setInputs] = useState<LanguageInput[]>(INITIAL_DATA);
  const [result, setResult] = useState<ReconstructionResult | null>(null);
  const [method, setMethod] = useState<ReconstructionMethod>(ReconstructionMethod.BAYESIAN_AI);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inspectedCol, setInspectedCol] = useState<number | null>(null);
  
  // New state for interaction
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  
  // Multi-selection state for subgrouping (Feature 5.7)
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Custom Parameters
  // Feature 2.3: Increased default iterations to 10,000 for multi-chain MCMC convergence
  const [mcmcIterations, setMcmcIterations] = useState<number>(10000);
  const [gapPenalty, setGapPenalty] = useState<number>(10);
  const [unknownCharPenalty, setUnknownCharPenalty] = useState<number>(8);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Modes
  const [appMode, setAppMode] = useState<'reconstruct' | 'shift' | 'evolver'>('reconstruct');
  
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await featureMatrix.init();
      setIsInitialized(true);
    };
    init();
  }, []);

  // Auto-Evolver state
  const [evolverData, setEvolverData] = useState<EvolverNode>(INITIAL_EVOLVER_DATA);
  const [evolverResults, setEvolverResults] = useState<EvolverEdgeResult[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Feature 5.3: Paradigm/Conjugation Layer State
  const [paradigms, setParadigms] = useState<Paradigm[]>([]);
  const [activeParadigmId, setActiveParadigmId] = useState<string | null>(null);
  const [showParadigmPanel, setShowParadigmPanel] = useState(false);
  
  // Feature 6.0: Multi-Word Batch Input State
  const [showMultiWordInput, setShowMultiWordInput] = useState(false);
  const [multiWordText, setMultiWordText] = useState('');
  const [batchResults, setBatchResults] = useState<any>(null);
  
  // New Auto-Evolver settings
  const [evolverMode, setEvolverMode] = useState<'ai' | 'algorithmic'>('ai');
  const [evolverModel, setEvolverModel] = useState('gpt-4o-mini');
  const [algorithmicMethod, setAlgorithmicMethod] = useState<'bayesian' | 'medoid'>('bayesian');

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
  };

  const runReconstruction = () => {
    // Check if there are any valid inputs
    const hasValidInput = (nodes: LanguageInput[]): boolean => {
      for (const node of nodes) {
        if (node.word && node.word.trim() !== '') return true;
        if (node.descendants && hasValidInput(node.descendants)) return true;
      }
      return false;
    };

    if (!hasValidInput(inputs)) {
      setErrorMsg("Please enter at least one word to reconstruct.");
      return;
    }

    setIsProcessing(true);
    setInspectedCol(null);
    setSelectedLang(null); // Reset selection on new run
    setIsDirty(false); // Clear dirty flag
    setTimeout(() => {
      try { setResult(reconstructProtoWord(inputs, method, { mcmcIterations, gapPenalty, unknownCharPenalty })); }
      catch (e) { console.error(e); setErrorMsg("Reconstruction engine error."); }
      finally { setIsProcessing(false); }
    }, 800);
  };

  const switchCandidate = (candidate: AnnotatedCandidate) => {
    if (!result) return;
    
    // Flatten inputs to get all words for alignment
    const getWords = (nodes: LanguageInput[]): { word: string }[] => {
      let words: { word: string }[] = [];
      for (const node of nodes) {
        if (node.word && node.word.trim() !== '') {
          words.push({ word: node.word });
        }
        if (node.descendants) {
          words = words.concat(getWords(node.descendants));
        }
      }
      return words;
    };
    
    const allInputs = getWords(inputs);
    
    const { alignmentMatrix: newAlignment, protoTokens: newProtoTokens } = performMSA_to_proto(
      allInputs,
      candidate.chars,
      { mcmcIterations, gapPenalty, unknownCharPenalty }
    );
    
    setResult({
      ...result,
      protoForm: candidate.form,
      protoTokens: newProtoTokens,
      alignmentMatrix: newAlignment
    });
  };

  const exportToEvolver = () => {
    if (!result) return;
    
    // Helper to convert LanguageInput to EvolverNode while preserving hierarchy
    const convertToEvolverNode = (input: LanguageInput): EvolverNode => ({
      id: input.id,
      name: input.name,
      wordsText: input.word,
      subStages: 0,
      descendants: input.descendants ? input.descendants.map(convertToEvolverNode) : []
    });
    
    // Create the evolver node structure with proper hierarchy
    const protoNode: EvolverNode = {
      id: 'proto-' + Date.now(),
      name: 'Proto-' + (inputs[0]?.name ?? 'Language'),
      wordsText: result.protoForm.replace(/^\*/, ''), // Remove asterisk prefix if present
      subStages: 0,
      descendants: inputs.map(convertToEvolverNode)
    };
    
    setEvolverData(protoNode);
    setAppMode('evolver');
  };

  useEffect(() => { runReconstruction(); }, []);

  const handleUpdateNode = (path: number[], field: keyof LanguageInput, val: any) => {
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
    setIsDirty(true);
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
    setIsDirty(true);
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
    setIsDirty(true);
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
    setIsDirty(true);
  };

  /**
   * Feature 5.7: Subgrouping Architecture - Group selected languages as siblings under a new unattested parent
   */
  const cancelSelection = () => {
    setSelectedLanguages(new Set());
    setIsSelectionMode(false);
  };

  const handleGroupAsSiblings = () => {
    if (selectedLanguages.size < 2) return;
    
    const selectedArray = Array.from(selectedLanguages);
    const selectedIndices = selectedArray.map(name => inputs.findIndex(n => n.name === name)).filter(idx => idx !== -1).sort((a, b) => b - a);
    
    if (selectedIndices.length < 2) return;
    
    // Extract selected nodes (in reverse order to maintain indices)
    const selectedNodes: LanguageInput[] = [];
    const remainingNodes = [...inputs];
    
    for (const idx of selectedIndices) {
      selectedNodes.unshift(remainingNodes.splice(idx, 1)[0]);
    }
    
    // Create new unattested parent node
    const parentName = selectedNodes[0]?.name ? 'Proto-' + selectedNodes[0].name : 'Proto-Subgroup';
    const newParent: LanguageInput = {
      id: Date.now().toString(),
      name: parentName,
      word: '',
      isUnattested: true,
      descendants: selectedNodes
    };
    
    // Add parent back to inputs
    remainingNodes.push(newParent);
    
    setInputs(remainingNodes);
    setSelectedLanguages(new Set());
    setIsSelectionMode(false); // Exit selection mode after grouping
    setIsDirty(true);
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
          let steps;
          if (evolverMode === 'algorithmic') {
            throw new Error("Algorithmic mode is currently a Work In Progress and is disabled.");
          } else {
            steps = await autoEvolveEdge(node.name, desc.name, sourceWords, targetWords, desc.subStages, desc.subStageWeights, evolverModel);
          }
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
              setIsDirty(true);
            }
          });
        } else {
          // Standard JSON import
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setInputs(parsed);
            setIsDirty(true);
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

  // Feature 5.3: Paradigm management functions
  const addParadigm = (lexeme: string, paradigmType: Paradigm['paradigmType'], languageId: string, languageName: string) => {
    const newParadigm: Paradigm = {
      id: Date.now().toString(),
      lexeme,
      paradigmType,
      languageId,
      languageName,
      cells: []
    };
    setParadigms([...paradigms, newParadigm]);
    setActiveParadigmId(newParadigm.id);
  };

  const updateParadigmCell = (paradigmId: string, cellIndex: number, updates: Partial<ParadigmCell>) => {
    setParadigms(paradigms.map(p => {
      if (p.id !== paradigmId) return p;
      const newCells = [...p.cells];
      newCells[cellIndex] = { ...newCells[cellIndex], ...updates };
      return { ...p, cells: newCells };
    }));
  };

  const addParadigmCell = (paradigmId: string, form: string, gloss: string) => {
    setParadigms(paradigms.map(p => {
      if (p.id !== paradigmId) return p;
      return { 
        ...p, 
        cells: [...p.cells, { form, gloss, isIrregular: false }]
      };
    }));
  };

  const removeParadigm = (paradigmId: string) => {
    setParadigms(paradigms.filter(p => p.id !== paradigmId));
    if (activeParadigmId === paradigmId) {
      setActiveParadigmId(null);
    }
  };

  /**
   * Feature 6.0: Multi-Word Batch Input Handlers
   * 
   * Parses multi-line text input where each line represents a cognate set.
   * Format: Language: word1, word2, word3
   * or: word1 (Language1), word2 (Language2)
   */
  const parseMultiWordInput = (text: string): { gloss: string; forms: LanguageInput[] }[] => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const cognateSets: { gloss: string; forms: LanguageInput[] }[] = [];
    
    // Try to detect format: if lines contain colons, use Language: word format
    const hasColonFormat = lines.some(l => l.includes(':'));
    
    if (hasColonFormat) {
      // Format: Language: word1, word2 OR Language: word
      const languageMap = new Map<string, string[]>();
      
      lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const langName = line.substring(0, colonIndex).trim();
          const wordsStr = line.substring(colonIndex + 1).trim();
          // Split by comma or space
          const words = wordsStr.split(/[,\s]+/).filter(w => w.trim());
          
          if (!languageMap.has(langName)) {
            languageMap.set(langName, []);
          }
          languageMap.get(langName)!.push(...words);
        }
      });
      
      // Convert to cognate sets - each word position is a gloss
      const maxWords = Math.max(...Array.from(languageMap.values()).map(w => w.length));
      
      for (let i = 0; i < maxWords; i++) {
        const forms: LanguageInput[] = [];
        let wordIndex = 0;
        
        languageMap.forEach((words, langName) => {
          if (words[i]) {
            forms.push({
              id: `batch-${langName}-${i}`,
              name: langName,
              word: words[i]
            });
          }
        });
        
        if (forms.length >= 2) {
          cognateSets.push({
            gloss: `cognate-${i + 1}`,
            forms
          });
        }
      }
    } else {
      // Simple format: one word per line, grouped by consecutive lines
      // Assume alternating languages or use a header row
      const words = lines.map(l => l.trim()).filter(l => l);
      
      // Try to detect language from word patterns or use generic names
      const chunkSize = Math.max(2, Math.floor(words.length / 2));
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize);
        const forms: LanguageInput[] = chunk.map((word, idx) => ({
          id: `batch-${i}-${idx}`,
          name: `Language ${(i / chunkSize) + 1}`,
          word
        }));
        
        if (forms.length >= 2) {
          cognateSets.push({
            gloss: `cognate-${Math.floor(i / chunkSize) + 1}`,
            forms
          });
        }
      }
    }
    
    return cognateSets;
  };

  const runBatchReconstruction = async () => {
    if (!multiWordText.trim()) {
      setErrorMsg('Please enter multiple words for batch reconstruction.');
      return;
    }
    
    const cognateSets = parseMultiWordInput(multiWordText);
    
    if (cognateSets.length === 0) {
      setErrorMsg('Could not parse input. Use format: Language: word1, word2');
      return;
    }
    
    setIsProcessing(true);
    setErrorMsg(null);
    
    try {
      const { reconstructBatchEnhanced } = await import('./services/engine');
      const result = await reconstructBatchEnhanced(
        cognateSets,
        paradigms.length > 0 ? paradigms : undefined,
        method,
        { mcmcIterations, gapPenalty, unknownCharPenalty }
      );
      setBatchResults(result);
    } catch (e) {
      console.error(e);
      setErrorMsg('Batch reconstruction failed. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyBatchToInputs = () => {
    if (!batchResults) return;
    
    // Convert batch results back to single-word inputs for display
    const newInputs: LanguageInput[] = [];
    let id = 1;
    
    // Get all unique languages from first cognate set
    const firstSet = batchResults.individualResults?.values().next().value;
    if (firstSet) {
      const langNames = new Set<string>();
      firstSet.soundChanges?.forEach((sc: SoundChangeNote) => {
        langNames.add(sc.language);
      });
      
      langNames.forEach(name => {
        newInputs.push({
          id: String(id++),
          name,
          word: ''
        });
      });
    }
    
    if (newInputs.length > 0) {
      setInputs(newInputs);
      setShowMultiWordInput(false);
      setIsDirty(true);
    }
  };

  return (
    <div className="min-h-screen bg-rt-bg text-rt-text p-6 md:p-10 font-sans selection:bg-rt-accent/30 transition-colors duration-300">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-rt-border pb-10 relative">
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-black text-rt-accent tracking-tighter leading-none mb-2">RootTrace</h1>
          <p className="text-rt-muted font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.3em] font-bold">Probabilistic Phonological Solver</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-2 mx-auto md:mx-0 w-full md:w-auto">
          <div className="md:hidden w-full">
            <select
              value={appMode}
              onChange={(e) => setAppMode(e.target.value as any)}
              className="w-full bg-rt-input border border-rt-border text-sm rounded-xl p-3 text-rt-text outline-none focus:ring-2 ring-rt-accent/50 transition-all cursor-pointer font-bold"
            >
              <option value="reconstruct">Proto-Reconstructor</option>
              <option value="shift">RootTrace's SCA</option>
              <option value="evolver">Language Evolution</option>
            </select>
          </div>
          <div className="hidden md:flex flex-wrap justify-center gap-1 bg-rt-input p-1 rounded-xl border border-rt-border w-full md:w-auto">
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
              RootTrace's SCA
            </button>
            <button 
              onClick={() => setAppMode('evolver')}
              className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${appMode === 'evolver' ? 'bg-rt-card text-rt-text shadow-sm' : 'text-rt-muted hover:text-rt-text'}`}
            >
              Language Evolution
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <div className="hidden lg:block text-right">
            <p className="text-[10px] text-rt-muted font-bold uppercase tracking-wider mb-1">Convergence Engine</p>
            <p className="text-xs text-rt-accent font-mono">{(inputs.length * mcmcIterations / 1000).toFixed(1)}k MCMC Samples</p>
          </div>
          <select 
            value={method} 
            onChange={e => { setMethod(e.target.value as ReconstructionMethod); setIsDirty(true); }}
            className="bg-rt-input border border-rt-border text-sm rounded-xl p-3 text-rt-text outline-none focus:ring-2 ring-rt-accent/50 transition-all cursor-pointer"
          >
            <option value={ReconstructionMethod.BAYESIAN_AI}>Bayesian (Recommended)</option>
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
                  type="range" min="1000" max="20000" step="500" 
                  value={mcmcIterations} 
                  onChange={e => { setMcmcIterations(Number(e.target.value)); setIsDirty(true); }}
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
                  onChange={e => { setGapPenalty(Number(e.target.value)); setIsDirty(true); }}
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
                  onChange={e => { setUnknownCharPenalty(Number(e.target.value)); setIsDirty(true); }}
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
              <button onClick={() => { setInputs([...inputs, { id: Date.now().toString(), name: 'New', word: '' }]); setIsDirty(true); }} className="text-[10px] font-bold bg-rt-card hover:bg-rt-input px-3 py-2 rounded-xl border border-rt-border transition-all uppercase tracking-widest text-rt-muted hover:text-rt-text">
                Add Lang
              </button>
              <button 
                onClick={() => setShowMultiWordInput(!showMultiWordInput)} 
                className={`text-[10px] font-bold px-3 py-2 rounded-xl border transition-all uppercase tracking-widest ${showMultiWordInput ? 'bg-rt-accent text-white border-rt-accent' : 'bg-rt-card hover:bg-rt-input border-rt-border text-rt-muted hover:text-rt-text'}`}
                title="Input multiple cognate sets at once"
              >
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  Multi-Word
                </span>
              </button>
            </div>
          </div>
          
          {/* Feature 6.0: Multi-Word Batch Input Panel */}
          {showMultiWordInput && (
            <div className="mb-4 bg-rt-accent/5 border border-rt-accent/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-rt-accent uppercase tracking-wider flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  Batch Reconstruction Mode
                </h3>
                <button 
                  onClick={() => setShowMultiWordInput(false)}
                  className="text-rt-muted hover:text-rt-text text-xs"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-[10px] text-rt-muted mb-2">
                Enter words for multiple cognate sets. Format:
                <code className="block bg-rt-input p-1.5 rounded mt-1 font-mono text-[9px]">
                  Language: word1, word2, word3<br/>
                  Language2: word1, word2, word3
                </code>
              </p>
              
              <textarea
                value={multiWordText}
                onChange={e => setMultiWordText(e.target.value)}
                placeholder="Latin: pater, mater, frater&#10;Greek: pater, meter, phrater&#10;Sanskrit: pitr, matr, bhratr"
                className="w-full h-32 bg-rt-input border border-rt-border rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-rt-accent text-rt-text resize-none custom-scrollbar mb-3"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={runBatchReconstruction}
                  disabled={isProcessing || !multiWordText.trim()}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    isProcessing || !multiWordText.trim()
                      ? 'bg-rt-input text-rt-muted cursor-not-allowed'
                      : 'bg-rt-accent hover:bg-rt-accent/90 text-white'
                  }`}
                >
                  {isProcessing ? 'Reconstructing...' : 'Run Batch Reconstruction'}
                </button>
                
                {batchResults && (
                  <button
                    onClick={() => setBatchResults(null)}
                    className="px-3 py-2.5 bg-rt-input hover:bg-rt-border border border-rt-border rounded-xl text-rt-muted text-xs"
                    title="Clear results"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {/* Batch Results Display */}
              {batchResults && (
                <div className="mt-4 space-y-3">
                  <div className="bg-rt-card border border-rt-border rounded-xl p-3">
                    <h4 className="text-[10px] font-bold text-rt-muted uppercase tracking-wider mb-2">
                      Batch Results ({batchResults.individualResults?.size || 0} sets)
                    </h4>
                    
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                      {Array.from(batchResults.individualResults?.entries() || []).map(([gloss, result]: [string, any], idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-2 bg-rt-input rounded-lg cursor-pointer hover:bg-rt-accent/10 transition-colors"
                          onClick={() => {
                            // Load this cognate set into single view
                            const forms = batchResults.accumulatedCorrespondences ? 
                              Object.keys(batchResults.accumulatedCorrespondences).map((key, i) => ({
                                id: `batch-${i}`,
                                name: key.split('-')[0] || `Lang ${i+1}`,
                                word: result.alignmentMatrix?.[i]?.filter((c: string) => c !== '-').join('') || ''
                              })).filter(f => f.word) : [];
                            
                            if (forms.length > 0) {
                              setInputs(forms);
                              setResult(result);
                              setShowMultiWordInput(false);
                            }
                          }}
                        >
                          <span className="text-xs font-medium text-rt-text">{gloss}</span>
                          <span className="text-xs font-mono text-rt-accent">{result.protoForm}</span>
                        </div>
                      ))}
                    </div>
                    
                    {batchResults.allomorphSets && batchResults.allomorphSets.size > 0 && (
                      <div className="mt-3 pt-3 border-t border-rt-border">
                        <h5 className="text-[9px] font-bold text-rt-muted uppercase tracking-wider mb-2">
                          Detected Allomorphs ({batchResults.allomorphSets.size} lexemes)
                        </h5>
                        {Array.from(batchResults.allomorphSets.entries()).map(([lexeme, allomorphData]: [string, any], idx) => (
                          <div key={idx} className="text-[10px] text-rt-text">
                            <span className="font-medium">{lexeme}:</span>{' '}
                            <span className="text-rt-accent">{allomorphData.allomorphs?.map((a: any) => a.protoForm).join(', ') || 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setShowMultiWordInput(false);
                        // Keep the last result as the main result
                        const lastEntry = Array.from(batchResults.individualResults?.entries() || []).pop();
                        if (lastEntry) {
                          setResult(lastEntry[1]);
                        }
                      }}
                      className="mt-3 w-full py-2 bg-rt-accent/10 hover:bg-rt-accent/20 border border-rt-accent/30 rounded-lg text-rt-accent text-xs font-bold transition-colors"
                    >
                      Apply to Main View
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-3 custom-scrollbar relative">
            {/* Feature 5.7: Selection mode controls */}
            {!isSelectionMode ? (
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-rt-muted">{inputs.length} language{inputs.length !== 1 ? 's' : ''}</span>
                {inputs.length >= 2 && (
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="flex items-center gap-1.5 text-[10px] font-bold bg-rt-input hover:bg-rt-accent/10 hover:text-rt-accent px-3 py-1.5 rounded-lg border border-rt-border hover:border-rt-accent/30 transition-all"
                    title="Select multiple languages to group as siblings"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    Group Languages
                  </button>
                )}
              </div>
            ) : (
              /* Floating action bar during selection mode */
              <div className="sticky top-0 z-20 bg-rt-card border border-rt-accent/30 rounded-xl p-3 mb-3 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rt-accent">
                      {selectedLanguages.size} selected
                    </span>
                    {selectedLanguages.size < 2 && (
                      <span className="text-[9px] text-rt-muted">(select 2+ to group)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelSelection}
                      className="text-[9px] font-bold bg-rt-input hover:bg-rt-border px-3 py-1.5 rounded-lg border border-rt-border transition-all text-rt-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGroupAsSiblings}
                      disabled={selectedLanguages.size < 2}
                      className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        selectedLanguages.size >= 2
                          ? 'bg-rt-accent text-white border-rt-accent hover:bg-rt-accent/90'
                          : 'bg-rt-input text-rt-muted border-rt-border cursor-not-allowed'
                      }`}
                    >
                      Group {selectedLanguages.size > 0 && `(${selectedLanguages.size})`}
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-rt-muted mt-2">Click languages to select/deselect them</p>
              </div>
            )}
            
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
                // Feature 5.7: Pass selection props
                isSelectionMode={isSelectionMode}
                isSelected={selectedLanguages.has(lang.name)}
                onToggleSelect={(name) => {
                  const newSet = new Set(selectedLanguages);
                  if (newSet.has(name)) {
                    newSet.delete(name);
                  } else {
                    newSet.add(name);
                  }
                  setSelectedLanguages(newSet);
                }}
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
                      <button key={i} onClick={() => switchCandidate(c)} className={`px-4 py-2 rounded-full text-xs font-mono transition-all border ${result.protoForm === c.form ? 'bg-rt-accent border-rt-accent text-white shadow-lg' : 'bg-rt-input border-rt-border text-rt-muted hover:border-rt-muted'}`}>
                        {c.form} ({((c.probability || 0) * 100).toFixed(0)}%)
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Export to Evolver Button - Feature 5.4 */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={exportToEvolver}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rt-accent/10 hover:bg-rt-accent/20 border border-rt-accent/30 hover:border-rt-accent/50 rounded-xl text-rt-accent text-xs font-bold uppercase tracking-wider transition-all"
                    title="Transfer reconstruction to Auto-Evolver for sound law analysis"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                    Export to Evolver
                  </button>
                </div>
              </div>

              <div className="bg-rt-card border border-rt-border rounded-3xl p-4 sm:p-8 overflow-hidden backdrop-blur-sm shadow-xl">
                {isDirty && (
                  <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    Results may be stale — re-run reconstruction
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2 mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-rt-text">Alignment Matrix</h3>
                    <p className="text-[10px] text-rt-muted mt-1 uppercase font-bold tracking-widest">Feature-Sensitive Segment Mapping</p>
                    {result.regularityScores && result.regularityScores.length > 0 && (
                      <p className="text-[10px] text-rt-warning/70 mt-1 italic">
                        Note: Regularity scores are most meaningful in batch mode with multiple cognate sets. 
                        Single-word regularity is computed but lacks statistical support.
                      </p>
                    )}
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
                      {(() => {
                        const flattenInputs = (nodes: LanguageInput[]): LanguageInput[] => {
                          let flat: LanguageInput[] = [];
                          for (const node of nodes) {
                            if (node.word && node.word.trim() !== '') flat.push(node);
                            if (node.descendants) flat = flat.concat(flattenInputs(node.descendants));
                          }
                          return flat;
                        };
                        const flatInputs = flattenInputs(inputs);
                        return flatInputs.map((l, idx) => (
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
                        ));
                      })()}
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
              <div className="h-[350px] sm:h-[450px] lg:h-[550px] flex flex-col w-full">
                <h3 className="text-xs sm:text-sm font-serif font-bold uppercase text-rt-muted tracking-[0.2em] mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3">
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

              <div className="h-[350px] sm:h-[400px] lg:h-[500px] flex flex-col w-full">
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
                <div className="h-[300px] sm:h-[350px] lg:h-[400px] flex flex-col w-full">
                  <h3 className="text-xs sm:text-sm font-serif font-bold uppercase text-rt-warning tracking-[0.2em] mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3">
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
                <div className="h-[300px] sm:h-[350px] lg:h-[400px] flex flex-col w-full">
                  <h3 className="text-xs sm:text-sm font-serif font-bold uppercase text-rt-accent tracking-[0.2em] mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3">
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
                <div className="h-[150px] sm:h-[200px] flex flex-col w-full">
                  <h3 className="text-xs sm:text-sm font-serif font-bold uppercase text-rt-error tracking-[0.2em] mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3">
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
            <div className="h-[300px] sm:h-[400px] lg:h-[500px] border-2 border-dashed border-rt-border rounded-[3rem] flex flex-col items-center justify-center text-rt-muted animate-pulse bg-rt-input">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rt-card flex items-center justify-center rounded-full mb-4 sm:mb-8 shadow-inner">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 opacity-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.450 0l-7 7a1 1 0 00.1 1.547L8 14.167v1.75l-4.783 1.966a1 1 0 00.328 1.917h12.91a1 1 0 00.328-1.917L12 15.917v-1.75l3.955-3.067a1 1 0 00.1-1.547l-7-7z" clipRule="evenodd" /></svg>
              </div>
              <p className="font-mono text-xs sm:text-sm tracking-[0.5em] uppercase font-black opacity-20">Engine Idle</p>
            </div>
          )}
        </section>
      </main>
      )}

      {appMode === 'shift' && (
        <main className="max-w-7xl mx-auto space-y-12 pb-20 animate-in">
          <SoundChangeApplier />
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
              Define the stages of your language. Input words for each stage, and the AI will infer the sound laws that occurred between them, generating intermediate sub-stages if requested.
            </p>

            <div className="mb-6 p-4 bg-rt-input border border-rt-border rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-rt-muted">Execution Mode</span>
                <div className="flex bg-rt-bg rounded-lg p-1 border border-rt-border">
                  <button 
                    disabled
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all text-rt-muted opacity-50 cursor-not-allowed flex items-center gap-1.5"
                    title="Algorithmic Auto-Evolver is currently a Work In Progress"
                  >
                    Algorithmic
                    <span className="bg-rt-warning/20 text-rt-warning text-[8px] px-1 rounded leading-tight">WIP</span>
                  </button>
                  <button 
                    onClick={() => setEvolverMode('ai')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${evolverMode === 'ai' ? 'bg-rt-accent text-white shadow-sm' : 'text-rt-muted hover:text-rt-text'}`}
                  >
                    AI-Powered
                  </button>
                </div>
              </div>

              {evolverMode === 'algorithmic' ? (
                <div className="flex flex-col gap-2 animate-in fade-in">
                  <span className="text-xs font-black uppercase tracking-widest text-rt-muted">Method</span>
                  <select 
                    value={algorithmicMethod}
                    onChange={e => setAlgorithmicMethod(e.target.value as 'bayesian' | 'medoid')}
                    className="w-full bg-rt-input border border-rt-border rounded-lg px-3 py-2 text-xs outline-none focus:border-rt-accent text-rt-text"
                  >
                    <option value="bayesian">Bayesian</option>
                    <option value="medoid">Medoid</option>
                  </select>
                  <p className="text-[10px] text-rt-muted mt-1 italic">
                    Algorithmic mode uses statistical thresholding to identify regular laws, exceptions, and sporadic shifts.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 animate-in fade-in">
                  <span className="text-xs font-black uppercase tracking-widest text-rt-muted">AI Model</span>
                  <select 
                    value={evolverModel}
                    onChange={e => setEvolverModel(e.target.value)}
                    className="w-full bg-rt-input border border-rt-border rounded-lg px-3 py-2 text-xs outline-none focus:border-rt-accent text-rt-text"
                  >
                    <optgroup label="OpenAI (via Puter)">
                      <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                      <option value="gpt-4o">GPT-4o (Powerful)</option>
                      <option value="o4-mini">o4 Mini</option>
                      <option value="o3-mini">o3 Mini</option>
                      <option value="o1">o1</option>
                    </optgroup>
                    <optgroup label="Anthropic (via Puter)">
                      <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                      <option value="claude-opus-4-6">Claude Opus 4.6</option>
                      <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                    </optgroup>
                    <optgroup label="Google (via Puter)">
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    </optgroup>
                    <optgroup label="xAI (via Puter)">
                      <option value="grok-beta">Grok Beta</option>
                      <option value="grok-2">Grok 2</option>
                      <option value="grok-3-beta">Grok 3 Beta</option>
                    </optgroup>
                    <optgroup label="DeepSeek (via Puter)">
                      <option value="deepseek-chat">DeepSeek V3</option>
                      <option value="deepseek-reasoner">DeepSeek R1</option>
                    </optgroup>
                  </select>
                  <p className="text-[9px] text-rt-muted mt-1">
                    Powered by Puter.js. No API key required for free tier.
                  </p>
                </div>
              )}
            </div>

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
        .touch-manipulation { touch-action: manipulation; }
        @media (hover: hover) {
          .touch-manipulation:hover { transform: scale(1.02); }
        }
      `}</style>
      
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {errorMsg && <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />}
    </div>
  );
}
