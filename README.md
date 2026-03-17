# RootTrace Novus

RootTrace Novus is a sophisticated computational historical linguistics environment designed to reconstruct ancestral linguistic forms from sets of cognates. By applying Bayesian inference, Markov Chain Monte Carlo (MCMC) simulations, and AI-driven analysis, the engine identifies the most probable phonetic trajectories across diverging lineages.

## Core Features

RootTrace Novus operates across three primary modes:

### 1. Proto-Reconstructor
Work backwards from descendant languages to recover the ancestral Proto-form.
* **Bayesian MCMC Sampler:** Replaces simple majority-vote logic with a robust algorithm that samples thousands of hypotheses to find the Bayesian optimal root (Global Medoid).
* **Interactive Alignment Matrix:** Click on any reconstructed segment to inspect its posterior probability distribution and view the statistical likelihood of alternative phonemes.
* **Generalized Sound Law Extraction:** Automatically detects and formats regular sound laws, sporadic shifts, and exceptions directly from the alignment matrix.
* **Phylogenetic Trees:** Interactive SVG tree visualizations that map hierarchical descent and highlight the volume of sound changes along each edge.

### 2. Sound Shift Creator
A dedicated sandbox mode allowing users to write custom sound laws and apply them instantly to a lexicon to see step-by-step evolutionary histories.
* Define phoneme classes (e.g., `stop = p t k`).
* Write standard linguistic rules (e.g., `t > d / V_V`, `@stop > @fric / _#`).
* Apply rules sequentially to observe the evolution of entire word lists.

### 3. Language Evolution (Auto-Evolver)
Simulate long-term language evolution across multiple intermediate stages.
* **AI-Powered Inference:** Analyzes source and target lexicons to infer the exact sound laws that occurred between them.
* **Intermediate Stages:** Automatically generates hypothesized intermediate sub-stages and their corresponding sound changes.

## The 5 Pillars of Reconstruction

The reconstruction engine weighs hypotheses against five strict linguistic criteria to ensure diachronic realism:

1. **Phonotactic & Syllabic Constraints:** Penalizes sonority violations and excessive clustering.
2. **Inventory Systemics:** Evaluates feature economy and symmetry, penalizing reconstructions that use many features for few phonemes.
3. **Weighted Diachronic Transducers:** Rewards chain shifts (push/drag shifts) that maintain phonemic contrast and penalizes massive, unnatural mergers.
4. **Joint Alignment (EM Loop):** Iteratively re-aligns descendant words to the hypothesized proto-word to refine the reconstruction.
5. **Archaic Retention Weighting:** Dynamically weights conservative vs. innovative descendant languages based on their phonetic distance from the root.

## Data-Driven Naturalness

RootTrace Novus integrates real-world diachronic data (parsed from the Index Diachronica) to actively reward common cross-linguistic shifts (e.g., lenition in intervocalic positions) and heavily penalize unnatural fortitions based on empirical linguistic data.

## Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd RootTrace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Data Portability

RootTrace Novus supports importing and exporting cognate sets via JSON and standard CLDF (Cross-Linguistic Data Formats) CSVs, making it easy to integrate with existing linguistic databases and workflows.
