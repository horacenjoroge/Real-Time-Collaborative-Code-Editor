export interface Document {
  id: string;
  title: string;
  language: string;
  content: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface DocumentUser {
  document_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  last_seen: Date;
}

export interface DocumentWithPermissions extends Document {
  role?: 'owner' | 'editor' | 'viewer';
}

export interface CreateDocumentInput {
  title: string;
  language?: string;
  content?: string;
  created_by: string;
}

export interface UpdateDocumentInput {
  title?: string;
  language?: string;
  content?: string;
}

export interface DocumentPermissionInput {
  document_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}
