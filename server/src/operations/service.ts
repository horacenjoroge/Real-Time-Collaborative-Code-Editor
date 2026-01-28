import { pool } from '../database/connection';
import type { Operation } from '../crdt/ot';
import { applyOperations } from '../crdt/ot';

export interface StoredOperation {
  id: string;
  document_id: string;
  user_id: string;
  version: number;
  operation: Operation[];
  timestamp: Date;
}

export class OperationHistoryService {
  /**
   * Persist a single document operation to the operations table.
   */
  async storeOperation(params: {
    documentId: string;
    userId: string;
    version: number;
    operations: Operation[];
    timestamp: number;
  }): Promise<void> {
    const { documentId, userId, version, operations, timestamp } = params;

    await pool.query(
      `INSERT INTO operations (document_id, user_id, version, operation, timestamp)
       VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))`,
      [documentId, userId, version, JSON.stringify(operations), timestamp]
    );
  }

  /**
   * Fetch operations for a document starting from a specific version (exclusive)
   * up to an optional limit.
   */
  async getOperationsFromVersion(params: {
    documentId: string;
    fromVersion: number;
    limit?: number;
  }): Promise<StoredOperation[]> {
    const { documentId, fromVersion, limit = 500 } = params;

    const result = await pool.query<StoredOperation>(
      `SELECT id, document_id, user_id, version, operation, timestamp
       FROM operations
       WHERE document_id = $1 AND version > $2
       ORDER BY version ASC
       LIMIT $3`,
      [documentId, fromVersion, limit]
    );

    // pg returns JSONB as any; ensure it's typed as Operation[]
    return result.rows.map((row) => ({
      ...row,
      operation: row.operation as unknown as Operation[],
    }));
  }

  /**
   * Rebuild the current content of a document from its operations, starting
   * from an initial snapshot.
   */
  async rebuildDocumentContent(params: {
    documentId: string;
    baseContent: string;
    fromVersion: number;
  }): Promise<{ content: string; lastVersion: number }> {
    const { documentId, baseContent, fromVersion } = params;

    const ops = await this.getOperationsFromVersion({
      documentId,
      fromVersion,
      limit: 10_000,
    });

    let content = baseContent;
    let lastVersion = fromVersion;

    for (const op of ops) {
      content = applyOperations(content, op.operation);
      lastVersion = op.version;
    }

    return { content, lastVersion };
  }
}

export const operationHistoryService = new OperationHistoryService();

