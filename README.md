# RootTrace

RootTrace is an easy-to-use Proto Lexicon reconstructor for conlangers and linguistics enthusiasts. It takes descendant words in IPA and reconstructs proto-forms using both majority and feature-based (weighted) methods, with support for randomness and phonetic interpolation.

## Features

- **IPA Input:** Enter descendant words in IPA, one group per paragraph.
- **Flexible Settings:**  
  - Consider syllabification (dots)
  - Consider primary stress (ˈ)
  - Handle multi-character phonemes (like [t͡ʃ])
  - Compare using phonetic features (not just spelling)
- **Reconstruction Methods:**  
  - Majority Vote  
  - Weighted (Feature-Based)
- **Randomness:**  
  - Enable a random factor to explore alternative reconstructions
  - Adjustable strength for the random effect
- **Featural Interpolation:**  
  - Intermediate forms in diagrams interpolate features between proto and descendants
- **Supra-segmental & Secondary Articulation Support:**  
  - Handles length (ː, ˑ, ːː), nasalization (̃), palatalization (ʲ), labialization (ʷ), aspiration (ʰ, ʱ), syllabic (̩), non-syllabic (̯), extra-short (̆), and combinations (e.g., gʲʷʱ, aː̃)
- **Evolution Diagrams:**  
  - Visualizes the relationship between proto, intermediates, and descendants using Mermaid.js

## Example Input

```
kyn koŋ
```

## Output

- Proto reconstructions (with possible alternatives)
- Evolutionary diagram showing interpolated forms

## License

MIT License

---

*RootTrace is designed for experimentation and fun. For serious historical linguistics, always consult the literature!*
