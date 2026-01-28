import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi, Document } from '../api/documents';

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await documentApi.listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      const newDoc = await documentApi.createDocument({
        title: 'Untitled',
        language: 'typescript',
        content: '',
      });
      navigate(`/editor/${newDoc.id}`);
    } catch (err) {
      setError('Failed to create document');
      console.error('Error creating document:', err);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentApi.deleteDocument(id);
      setDocuments(documents.filter((doc) => doc.id !== id));
    } catch (err) {
      setError('Failed to delete document');
      console.error('Error deleting document:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Documents</h1>
          <button
            onClick={handleCreateDocument}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
          >
            + New Document
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-600 rounded text-white">
            {error}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">No documents yet</p>
            <button
              onClick={handleCreateDocument}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
            >
              Create Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/editor/${doc.id}`)}
                className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold truncate flex-1">
                    {doc.title}
                  </h3>
                  {doc.role === 'owner' && (
                    <button
                      onClick={(e) => handleDeleteDocument(doc.id, e)}
                      className="ml-2 text-red-400 hover:text-red-300 text-sm"
                      title="Delete document"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  <span className="px-2 py-1 bg-gray-700 rounded">
                    {doc.language}
                  </span>
                  {doc.role && (
                    <span className="ml-2 px-2 py-1 bg-blue-900 rounded">
                      {doc.role}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  Updated: {formatDate(doc.updated_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
