import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { useRef, useEffect } from 'react';

export type Language = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'sql'
  | 'xml'
  | 'yaml';

export type Theme = 'light' | 'dark' | 'vs-dark' | 'hc-black';

export interface EditorConfig {
  language: Language;
  theme: Theme;
  fontSize: number;
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  minimap: { enabled: boolean };
  readOnly: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  tabSize: number;
  insertSpaces: boolean;
}

export interface RemoteCursor {
  userId: string;
  line: number;
  column: number;
  color: string;
}

interface EditorComponentProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  config: EditorConfig;
  onEditorMount?: (editor: editor.IStandaloneCodeEditor) => void;
  remoteCursors?: RemoteCursor[];
}

function sanitizeUserId(userId: string): string {
  return userId.replace(/\W/g, '_').slice(0, 32) || 'u';
}

export function EditorComponent({
  value,
  onChange,
  config,
  onEditorMount,
  remoteCursors = [],
}: EditorComponentProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  const handleEditorDidMount = (
    editorInstance: editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editorInstance;
    onEditorMount?.(editorInstance);
  };

  // Inject CSS for per-user cursor colors (Monaco decorations use these classes)
  useEffect(() => {
    let styleEl = document.getElementById('remote-cursor-styles') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'remote-cursor-styles';
      document.head.appendChild(styleEl);
    }
    const rules = remoteCursors
      .map((c) => {
        const cls = sanitizeUserId(c.userId);
        return `.remote-cursor-${cls} { border-left-color: ${c.color} !important; } .remote-cursor-glyph.remote-cursor-${cls} { background-color: ${c.color} !important; }`;
      })
      .join('\n');
    styleEl.textContent = rules;
  }, [remoteCursors]);

  // Apply remote cursor decorations when remoteCursors or editor changes
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = remoteCursors.map(
      (c) => ({
        range: new monaco.Range(c.line, c.column, c.line, c.column),
        options: {
          className: `remote-cursor remote-cursor-${sanitizeUserId(c.userId)}`,
          glyphMarginClassName: `remote-cursor-glyph remote-cursor-${sanitizeUserId(c.userId)}`,
        },
      })
    );

    decorationIdsRef.current = ed.deltaDecorations(
      decorationIdsRef.current,
      newDecorations
    );
  }, [remoteCursors]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={config.language}
        theme={config.theme}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: config.fontSize,
          lineNumbers: config.lineNumbers,
          minimap: config.minimap,
          readOnly: config.readOnly,
          wordWrap: config.wordWrap,
          tabSize: config.tabSize,
          insertSpaces: config.insertSpaces,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'allDocuments',
          fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
        }}
      />
    </div>
  );
}
