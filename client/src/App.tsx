import { useState, useEffect, useRef } from 'react';
import { EditorComponent, EditorConfig, Language, Theme } from './editor/EditorComponent';
import { Toolbar } from './components/Toolbar';
import { DisconnectionBanner } from './components/DisconnectionBanner';
import { useWebSocket } from './websocket/useWebSocket';
import {
  FileData,
  createNewFile,
  saveFileToStorage,
  getFilesFromStorage,
  getFileFromStorage,
  saveCurrentFileId,
  getCurrentFileId,
  downloadFile,
  loadFileFromInput,
} from './editor/fileOperations';

const DEFAULT_CONFIG: EditorConfig = {
  language: 'typescript',
  theme: 'vs-dark',
  fontSize: 14,
  lineNumbers: 'on',
  minimap: { enabled: true },
  readOnly: false,
  wordWrap: 'off',
  tabSize: 2,
  insertSpaces: true,
};

function App() {
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [content, setContent] = useState<string>('');
  const [config, setConfig] = useState<EditorConfig>(DEFAULT_CONFIG);
  const [isModified, setIsModified] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket connection
  const { status: connectionStatus, connect, disconnect, emit, on, off, isConnected } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      console.log('WebSocket connected');
      // Join document room when connected and file is loaded
      if (currentFile) {
        emit('join-document', { documentId: currentFile.id });
      }
    },
    onDisconnect: (reason) => {
      console.log('WebSocket disconnected:', reason);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Load saved file on mount
  useEffect(() => {
    const savedFileId = getCurrentFileId();
    if (savedFileId) {
      const file = getFileFromStorage(savedFileId);
      if (file) {
        setCurrentFile(file);
        setContent(file.content);
        setConfig((prev) => ({ ...prev, language: file.language as Language }));
        setIsModified(false);
        return;
      }
    }
    // Create a new file if no saved file
    const newFile = createNewFile('untitled.ts');
    setCurrentFile(newFile);
    setContent('');
    setIsModified(false);
  }, []);

  // Join document room when file changes and socket is connected
  useEffect(() => {
    if (isConnected && currentFile) {
      emit('join-document', { documentId: currentFile.id });
    }
  }, [isConnected, currentFile?.id, emit]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleJoinedDocument = (data: { documentId: string; users: unknown[] }) => {
      console.log('Joined document:', data);
    };

    const handleUserJoined = (data: { userId: string; username: string }) => {
      console.log('User joined:', data);
    };

    const handleUserLeft = (data: { userId: string; username: string; reason?: string }) => {
      console.log('User left:', data);
    };

    const handleError = (data: { message: string }) => {
      console.error('Socket error:', data.message);
    };

    on('joined-document', handleJoinedDocument);
    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);
    on('error', handleError);

    return () => {
      off('joined-document', handleJoinedDocument);
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
      off('error', handleError);
    };
  }, [on, off]);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('editor-config', JSON.stringify(config));
  }, [config]);

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('editor-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Use default config
      }
    }
  }, []);

  const handleContentChange = (value: string | undefined) => {
    setContent(value || '');
    setIsModified(true);
  };

  const handleConfigChange = (newConfig: Partial<EditorConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleSaveFile = () => {
    if (!currentFile) return;

    const updatedFile: FileData = {
      ...currentFile,
      content,
      language: config.language,
      lastModified: Date.now(),
    };

    saveFileToStorage(updatedFile);
    setCurrentFile(updatedFile);
    setIsModified(false);
  };

  const handleNewFile = () => {
    if (isModified && currentFile) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Do you want to save before creating a new file?'
      );
      if (shouldSave) {
        handleSaveFile();
      }
    }
    
    // Leave current document room
    if (currentFile && isConnected) {
      emit('leave-document', {});
    }
    
    const newFile = createNewFile('untitled.ts');
    setCurrentFile(newFile);
    setContent('');
    setIsModified(false);
    saveCurrentFileId(newFile.id);
    
    // Join new document room
    if (isConnected) {
      emit('join-document', { documentId: newFile.id });
    }
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadFileFromInput(file, (fileData) => {
        // Leave current document room
        if (currentFile && isConnected) {
          emit('leave-document', {});
        }
        
        setCurrentFile(fileData);
        setContent(fileData.content);
        setConfig((prev) => ({
          ...prev,
          language: fileData.language as Language,
        }));
        setIsModified(false);
        saveFileToStorage(fileData);
        saveCurrentFileId(fileData.id);
        
        // Join new document room
        if (isConnected) {
          emit('join-document', { documentId: fileData.id });
        }
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isModified && currentFile) {
          handleSaveFile();
        }
      }
      // Ctrl+N or Cmd+N for new file
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewFile();
      }
      // Ctrl+O or Cmd+O to open file
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModified, currentFile, content, config.language]);

  const handleDownload = () => {
    if (!currentFile) return;
    const fileToDownload: FileData = {
      ...currentFile,
      content,
    };
    downloadFile(fileToDownload);
  };

  const handleReconnect = () => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <DisconnectionBanner
        status={connectionStatus}
        onReconnect={handleReconnect}
      />
      <Toolbar
        config={config}
        onConfigChange={handleConfigChange}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        currentFileName={currentFile?.name || 'untitled'}
        isModified={isModified}
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />

      <div className="flex-1 overflow-hidden">
        <EditorComponent
          value={content}
          onChange={handleContentChange}
          config={config}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.html,.css,.json,.md,.sql,.xml,.yaml,.yml"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Status Bar */}
      <div className="bg-gray-800 text-gray-300 px-4 py-1 text-xs flex items-center justify-between border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span>Language: {config.language}</span>
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <span className="text-yellow-400">● Modified</span>
          )}
          <button
            onClick={handleDownload}
            className="text-blue-400 hover:text-blue-300"
            title="Download File"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
