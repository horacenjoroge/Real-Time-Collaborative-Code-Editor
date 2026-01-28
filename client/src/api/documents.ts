import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Document {
  id: string;
  title: string;
  language: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  role?: 'owner' | 'editor' | 'viewer';
}

export interface CreateDocumentInput {
  title: string;
  language?: string;
  content?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  language?: string;
  content?: string;
}

// Get user ID from localStorage or generate one
function getUserId(): string {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', userId);
  }
  return userId;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add user ID to all requests
api.interceptors.request.use((config) => {
  config.headers['x-user-id'] = getUserId();
  if (config.params) {
    config.params.userId = getUserId();
  }
  return config;
});

export const documentApi = {
  /**
   * List all user's documents
   */
  async listDocuments(): Promise<Document[]> {
    const response = await api.get<{ documents: Document[] }>('/documents');
    return response.data.documents;
  },

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await api.get<{ document: Document }>(`/documents/${id}`);
    return response.data.document;
  },

  /**
   * Create new document
   */
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const response = await api.post<{ document: Document }>('/documents', input);
    return response.data.document;
  },

  /**
   * Update document
   */
  async updateDocument(
    id: string,
    input: UpdateDocumentInput
  ): Promise<Document> {
    const response = await api.put<{ document: Document }>(
      `/documents/${id}`,
      input
    );
    return response.data.document;
  },

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  /**
   * Get document users/permissions
   */
  async getDocumentUsers(id: string): Promise<Array<{
    user_id: string;
    role: string;
    last_seen: string;
  }>> {
    const response = await api.get<{ users: Array<{
      user_id: string;
      role: string;
      last_seen: string;
    }> }>(`/documents/${id}/users`);
    return response.data.users;
  },
};
