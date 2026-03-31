import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { StreamLanguage } from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';

// Define SCA syntax highlighting
const scaParser: StreamParser<unknown> = {
  token(stream) {
    // Comments
    if (stream.match('//') || stream.match(';')) {
      stream.skipToEnd();
      return 'comment';
    }

    // Strings
    if (stream.match('"')) {
      while (!stream.eol() && !stream.match('"', false)) stream.next();
      stream.match('"');
      return 'string';
    }

    // Arrows
    if (stream.match('>>') || stream.match('=>') || stream.match('->') || stream.match('→') || stream.match('>')) {
      return 'keyword';
    }

    // Class references
    if (stream.match('@')) {
      while (/[a-zA-Z0-9_-]/.test(stream.peek() || '')) stream.next();
      return 'variableName';
    }

    // Feature specs [+voice], [-nasal]
    if (stream.match('[')) {
      while (!stream.eol() && !stream.match(']', false)) stream.next();
      stream.match(']');
      return 'attribute';
    }

    // Keywords
    const keywords = [
      'Class', 'class', 'Element', 'element', 'Stress', 'stress', 'Syllables', 'syllables',
      'Deromanizer', 'deromanizer', 'Romanizer', 'romanizer', 'Deferred', 'deferred',
      'Cleanup', 'cleanup', 'Apply', 'apply', 'IF', 'if', 'THEN', 'then', 'ELSE', 'else',
      'Next', 'next', 'chain', 'block', 'end', 'def', 'feat'
    ];
    
    for (const kw of keywords) {
      if (stream.match(kw) && !/[a-zA-Z0-9_]/.test(stream.peek() || '')) {
        return 'keyword';
      }
    }

    // Numbers
    if (stream.match(/\d+/)) {
      return 'number';
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Everything else
    stream.next();
    return null;
  },
  startState() {
    return {};
  },
};

const scaLanguage = StreamLanguage.define(scaParser);

interface SCAEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SCAEditor({ value, onChange, className = '' }: SCAEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={[scaLanguage]}
      className={className}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: false,
        highlightActiveLine: false,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: false,
      }}
      style={{
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '14px',
      }}
    />
  );
}

export default SCAEditor;
