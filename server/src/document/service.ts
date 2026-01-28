import { pool } from '../database/connection';
import {
  Document,
  DocumentWithPermissions,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentPermissionInput,
} from '../database/types';

export class DocumentService {
  /**
   * Create a new document
   */
  async createDocument(
    input: CreateDocumentInput
  ): Promise<DocumentWithPermissions> {
    const { title, language = 'plaintext', content = '', created_by } = input;

    const result = await pool.query<Document>(
      `INSERT INTO documents (title, language, content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, language, content, created_by]
    );

    const document = result.rows[0];

    // Add creator as owner
    await this.addDocumentPermission({
      document_id: document.id,
      user_id: created_by,
      role: 'owner',
    });

    return {
      ...document,
      role: 'owner',
    };
  }

  /**
   * Get document by ID with permission check
   */
  async getDocumentById(
    documentId: string,
    userId: string
  ): Promise<DocumentWithPermissions | null> {
    const result = await pool.query<DocumentWithPermissions>(
      `SELECT d.*, du.role
       FROM documents d
       LEFT JOIN document_users du ON d.id = du.document_id AND du.user_id = $2
       WHERE d.id = $1 AND d.deleted_at IS NULL
       LIMIT 1`,
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const doc = result.rows[0];
    
    // If user is creator but not in document_users, they're owner
    if (!doc.role && doc.created_by === userId) {
      doc.role = 'owner';
    }

    return doc;
  }

  /**
   * Update document content
   */
  async updateDocument(
    documentId: string,
    userId: string,
    input: UpdateDocumentInput
  ): Promise<Document | null> {
    // Check permissions
    const doc = await this.getDocumentById(documentId, userId);
    if (!doc || (doc.role !== 'owner' && doc.role !== 'editor')) {
      throw new Error('Permission denied');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(input.language);
    }
    if (input.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(input.content);
    }

    if (updates.length === 0) {
      return doc;
    }

    values.push(documentId);

    const result = await pool.query<Document>(
      `UPDATE documents
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Soft delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    // Check if user is owner
    const doc = await this.getDocumentById(documentId, userId);
    if (!doc || doc.role !== 'owner') {
      throw new Error('Permission denied: Only owner can delete document');
    }

    const result = await pool.query(
      `UPDATE documents
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL`,
      [documentId]
    );

    return result.rowCount > 0;
  }

  /**
   * List user's documents
   */
  async listUserDocuments(userId: string): Promise<DocumentWithPermissions[]> {
    const result = await pool.query<DocumentWithPermissions>(
      `SELECT d.*, COALESCE(du.role, 
         CASE WHEN d.created_by = $1 THEN 'owner'::VARCHAR ELSE NULL END
       ) as role
       FROM documents d
       LEFT JOIN document_users du ON d.id = du.document_id AND du.user_id = $1
       WHERE (d.created_by = $1 OR du.user_id = $1)
         AND d.deleted_at IS NULL
       ORDER BY d.updated_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Add document permission
   */
  async addDocumentPermission(
    input: DocumentPermissionInput
  ): Promise<void> {
    await pool.query(
      `INSERT INTO document_users (document_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, user_id)
       DO UPDATE SET role = EXCLUDED.role`,
      [input.document_id, input.user_id, input.role]
    );
  }

  /**
   * Remove document permission
   */
  async removeDocumentPermission(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM document_users
       WHERE document_id = $1 AND user_id = $2`,
      [documentId, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(documentId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE document_users
       SET last_seen = CURRENT_TIMESTAMP
       WHERE document_id = $1 AND user_id = $2`,
      [documentId, userId]
    );
  }

  /**
   * Get document users/permissions
   */
  async getDocumentUsers(documentId: string): Promise<Array<{
    user_id: string;
    role: string;
    last_seen: Date;
  }>> {
    const result = await pool.query(
      `SELECT user_id, role, last_seen
       FROM document_users
       WHERE document_id = $1
       ORDER BY role, last_seen DESC`,
      [documentId]
    );

    return result.rows;
  }
}

export const documentService = new DocumentService();
