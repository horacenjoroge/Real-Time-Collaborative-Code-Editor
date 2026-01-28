import { Router, Request, Response } from 'express';
import { documentService } from './service';
import { CreateDocumentInput, UpdateDocumentInput } from '../database/types';

const router = Router();

// Helper to get user ID from request (for now, using query param or header)
// In production, this would come from JWT token
function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 
         (req.query.userId as string) || 
         'anonymous';
}

/**
 * GET /api/documents
 * List user's documents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const documents = await documentService.listUserDocuments(userId);
    return res.json({ documents });
  } catch (error) {
    console.error('Error listing documents:', error);
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * GET /api/documents/:id
 * Get document by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const document = await documentService.getDocumentById(id, userId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update last seen
    await documentService.updateLastSeen(id, userId);

    return res.json({ document });
  } catch (error) {
    console.error('Error getting document:', error);
    return res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * POST /api/documents
 * Create new document
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const input: CreateDocumentInput = {
      title: req.body.title || 'Untitled',
      language: req.body.language || 'plaintext',
      content: req.body.content || '',
      created_by: userId,
    };

    const document = await documentService.createDocument(input);
    return res.status(201).json({ document });
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

/**
 * PUT /api/documents/:id
 * Update document
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const input: UpdateDocumentInput = {
      title: req.body.title,
      language: req.body.language,
      content: req.body.content,
    };

    const document = await documentService.updateDocument(id, userId, input);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ document });
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

/**
 * DELETE /api/documents/:id
 * Soft delete document
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const deleted = await documentService.deleteDocument(id, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Permission denied')) {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * GET /api/documents/:id/users
 * Get document users/permissions
 */
router.get('/:id/users', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    // Check if user has access
    const doc = await documentService.getDocumentById(id, userId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const users = await documentService.getDocumentUsers(id);
    return res.json({ users });
  } catch (error) {
    console.error('Error getting document users:', error);
    return res.status(500).json({ error: 'Failed to get document users' });
  }
});

/**
 * POST /api/documents/:id/users
 * Add document permission
 */
router.post('/:id/users', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const { user_id, role } = req.body;

    // Check if requester is owner
    const doc = await documentService.getDocumentById(id, userId);
    if (!doc || doc.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await documentService.addDocumentPermission({
      document_id: id,
      user_id,
      role,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error adding document permission:', error);
    return res.status(500).json({ error: 'Failed to add permission' });
  }
});

export default router;
