import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useRef } from 'react';

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

interface EditorComponentProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  config: EditorConfig;
  onEditorMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

export function EditorComponent({
  value,
  onChange,
  config,
  onEditorMount,
}: EditorComponentProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (
    editorInstance: editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editorInstance;
    onEditorMount?.(editorInstance);
  };

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
