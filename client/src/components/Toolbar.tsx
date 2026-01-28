import { EditorConfig, Language, Theme } from '../editor/EditorComponent';
import { ConnectionStatus } from './ConnectionStatus';
import { ConnectionStatus as Status } from '../websocket/types';

interface ToolbarProps {
  config: EditorConfig;
  onConfigChange: (config: Partial<EditorConfig>) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  currentFileName: string;
  isModified: boolean;
  connectionStatus?: Status;
  onReconnect?: () => void;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'vs-dark', label: 'VS Dark' },
  { value: 'hc-black', label: 'High Contrast' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24];

export function Toolbar({
  config,
  onConfigChange,
  onNewFile,
  onOpenFile,
  onSaveFile,
  currentFileName,
  isModified,
  connectionStatus,
  onReconnect,
}: ToolbarProps) {
  return (
    <div className="bg-gray-800 text-white px-4 py-2 flex items-center gap-4 flex-wrap border-b border-gray-700">
      {/* Connection Status */}
      {connectionStatus && (
        <>
          <ConnectionStatus status={connectionStatus} onReconnect={onReconnect} />
          <div className="h-6 w-px bg-gray-600" />
        </>
      )}
      {/* File Operations */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewFile}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
          title="New File"
        >
          New
        </button>
        <button
          onClick={onOpenFile}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
          title="Open File"
        >
          Open
        </button>
        <button
          onClick={onSaveFile}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save File"
          disabled={!isModified}
        >
          Save {isModified && '*'}
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600" />

      {/* Current File Name */}
      <div className="text-sm text-gray-300 font-mono">
        {currentFileName}
      </div>

      <div className="h-6 w-px bg-gray-600" />

      {/* Language Selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Language:</label>
        <select
          value={config.language}
          onChange={(e) =>
            onConfigChange({ language: e.target.value as Language })
          }
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Theme Selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Theme:</label>
        <select
          value={config.theme}
          onChange={(e) => onConfigChange({ theme: e.target.value as Theme })}
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          {THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Font Size:</label>
        <select
          value={config.fontSize}
          onChange={(e) =>
            onConfigChange({ fontSize: parseInt(e.target.value, 10) })
          }
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </div>

      {/* Editor Options */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.minimap.enabled}
            onChange={(e) =>
              onConfigChange({ minimap: { enabled: e.target.checked } })
            }
            className="rounded"
          />
          Minimap
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.readOnly}
            onChange={(e) => onConfigChange({ readOnly: e.target.checked })}
            className="rounded"
          />
          Read Only
        </label>
      </div>
    </div>
  );
}
