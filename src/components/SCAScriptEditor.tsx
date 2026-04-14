import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { StreamLanguage } from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';

// Define Script syntax highlighting (Lua/Python-style)
const scriptParser: StreamParser<unknown> = {
  token(stream) {
    // Comments (Script syntax: -- only)
    if (stream.match('--')) {
      stream.skipToEnd();
      return 'comment';
    }

    // Strings
    if (stream.match('"')) {
      while (!stream.eol() && !stream.match('"', false)) stream.next();
      stream.match('"');
      return 'string';
    }

    // Chain shift arrows (>> and >>>)
    if (stream.match('>>>') || stream.match('>>')) {
      return 'keyword';
    }

    // Change operator (Script syntax: = instead of >)
    if (stream.match('=') && !stream.match('==')) {
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

    // Keywords (Script syntax specific)
    const keywords = [
      // Declaration keywords
      'class', 'element', 'syllables', 'stress',
      // Block keywords
      'rule', 'deromanizer', 'romanizer', 'deferred', 'cleanup', 'chain',
      // Control flow
      'if', 'then', 'else', 'end',
      // Block types
      'block', 'next', 'apply',
      // Modifiers
      'drag', 'push', 'propagate', 'ltr', 'rtl'
    ];

    for (const kw of keywords) {
      if (stream.match(kw) && !/[a-zA-Z0-9_-]/.test(stream.peek() || '')) {
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

const scriptLanguage = StreamLanguage.define(scriptParser);

interface SCAScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SCAScriptEditor({ value, onChange, className = '' }: SCAScriptEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={oneDark}
      extensions={[scriptLanguage]}
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

export default SCAScriptEditor;
