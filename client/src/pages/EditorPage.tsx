import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EditorComponent, EditorConfig, Language } from '../editor/EditorComponent';
import { Toolbar } from '../components/Toolbar';
import { DisconnectionBanner } from '../components/DisconnectionBanner';
import { useWebSocket } from '../websocket/useWebSocket';
import { documentApi, Document, getUserId } from '../api/documents';
import { saveFileToStorage } from '../editor/fileOperations';
import {
  applyOperations,
  diffToOperations,
  type Operation as OtOperation,
} from '../editor/otClient';

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

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<string>('');
  const [config, setConfig] = useState<EditorConfig>(DEFAULT_CONFIG);
  const [isModified, setIsModified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSaveRef = useRef<() => Promise<void>>();
  const lastContentRef = useRef<string>('');
  const localVersionRef = useRef<number>(0);
  const userIdRef = useRef<string>(getUserId());

  // WebSocket connection
  const {
    status: connectionStatus,
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected,
  } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      if (id) {
        emit('join-document', { documentId: id });
      }
    },
  });

  // Load document from API
  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    void loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const doc = await documentApi.getDocument(id!);
      setDocument(doc);
      setContent(doc.content);
      lastContentRef.current = doc.content;
      setConfig((prev) => ({
        ...prev,
        language: doc.language as Language,
      }));
      setIsModified(false);
    } catch (err) {
      setError('Failed to load document');
      console.error('Error loading document:', err);
    } finally {
      setLoading(false);
    }
  };

  // Join document room when connected
  useEffect(() => {
    if (isConnected && id) {
      emit('join-document', { documentId: id });
    }
  }, [isConnected, id, emit]);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleJoinedDocument = (data: { documentId: string; users: unknown[] }) => {
      console.log('Joined document:', data);
    };

    const handleUserJoined = (data: { userId: string; username: string }) => {
      console.log('User joined:', data);
    };

    const handleUserLeft = (data: {
      userId: string;
      username: string;
      reason?: string;
    }) => {
      console.log('User left:', data);
    };

    const handleError = (data: { message: string }) => {
      console.error('Socket error:', data.message);
    };

    const handleDocumentOperation = (data: {
      documentId: string;
      userId: string;
      version: number;
      operations: OtOperation[];
      timestamp: number;
    }) => {
      if (!document || data.documentId !== document.id) return;

      const newContent = applyOperations(lastContentRef.current, data.operations);
      lastContentRef.current = newContent;
      setContent(newContent);
    };

    on('joined-document', handleJoinedDocument);
    on('user-joined', handleUserJoined);
    on('user-left', handleUserLeft);
    on('error', handleError);
    on('document-operation', handleDocumentOperation as never);

    return () => {
      off('joined-document', handleJoinedDocument);
      off('user-joined', handleUserJoined);
      off('user-left', handleUserLeft);
      off('error', handleError);
      off('document-operation', handleDocumentOperation as never);
    };
  }, [on, off, document]);

  // Auto-save with debounce
  useEffect(() => {
    if (!document || !isModified) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveRef.current?.();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, document, isModified, handleSaveRef]);

  const handleContentChange = (value: string | undefined) => {
    const newValue = value ?? '';

    // Compute OT operations from previous content to new content
    const ops: OtOperation[] = diffToOperations(lastContentRef.current, newValue);

    if (ops.length > 0 && document) {
      const message = {
        documentId: document.id,
        userId: userIdRef.current,
        version: localVersionRef.current + 1,
        operations: ops,
        timestamp: Date.now(),
      };

      emit('document-operation', message as never);
      localVersionRef.current += 1;
    }

    lastContentRef.current = newValue;
    setContent(newValue);
    setIsModified(true);
  };

  const handleConfigChange = (newConfig: Partial<EditorConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleSave = async () => {
    if (!document || !isModified) return;

    try {
      const updated = await documentApi.updateDocument(document.id, {
        content,
        language: config.language,
        title: document.title,
      });
      setDocument(updated);
      setIsModified(false);
    } catch (err) {
      console.error('Error saving document:', err);
      // Fallback to localStorage
      const fileData = {
        id: document.id,
        name: document.title,
        content,
        language: config.language,
        lastModified: Date.now(),
      };
      saveFileToStorage(fileData);
    }
  };

  // Update ref when handleSave changes
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [document, content, config.language, isModified]);

  const handleReconnect = () => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, content, isModified]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading document...
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Document not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <DisconnectionBanner
        status={connectionStatus}
        onReconnect={handleReconnect}
      />
      <Toolbar
        config={config}
        onConfigChange={handleConfigChange}
        onNewFile={() => navigate('/')}
        onOpenFile={() => navigate('/')}
        onSaveFile={handleSave}
        currentFileName={document.title}
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

      {/* Status Bar */}
      <div className="bg-gray-800 text-gray-300 px-4 py-1 text-xs flex items-center justify-between border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span>Language: {config.language}</span>
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
          {document.role && (
            <span className="px-2 py-0.5 bg-blue-900 rounded">
              {document.role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <span className="text-yellow-400">● Modified (auto-saving...)</span>
          )}
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Documents
          </button>
        </div>
      </div>
    </div>
  );
}
