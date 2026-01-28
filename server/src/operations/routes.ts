import { Router, Request, Response } from 'express';
import { operationHistoryService } from './service';
import { documentService } from '../document/service';

const router = Router();

// Basic helper to get user id in the same way as document routes.
function getUserId(req: Request): string {
  return (
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    'anonymous'
  );
}

/**
 * GET /api/documents/:id/operations
 * Fetch operations for a document from a given version.
 *
 * Query params:
 * - fromVersion (required): integer, last known version on the client
 * - limit (optional): max number of operations to return
 */
router.get(
  '/:id/operations',
  async (req: Request<{ id: string }, unknown, unknown, { fromVersion?: string; limit?: string }>, res: Response) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const fromVersionParam = req.query.fromVersion;
      const limitParam = req.query.limit;

      if (fromVersionParam == null) {
        return res.status(400).json({ error: 'fromVersion is required' });
      }

      const fromVersion = Number(fromVersionParam);
      if (Number.isNaN(fromVersion) || fromVersion < 0) {
        return res.status(400).json({ error: 'fromVersion must be a non-negative number' });
      }

      const limit = limitParam ? Number(limitParam) : undefined;
      if (limit != null && (Number.isNaN(limit) || limit <= 0)) {
        return res.status(400).json({ error: 'limit must be a positive number when provided' });
      }

      // Ensure the user has access to the document
      const doc = await documentService.getDocumentById(id, userId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const operations = await operationHistoryService.getOperationsFromVersion({
        documentId: id,
        fromVersion,
        limit,
      });

      return res.json({ operations });
    } catch (error) {
      console.error('Error fetching operations:', error);
      return res.status(500).json({ error: 'Failed to fetch operations' });
    }
  }
);

export default router;

