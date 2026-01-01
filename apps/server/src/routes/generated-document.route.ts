import { Router } from 'express';
import { generatedDocumentController } from '../controllers/generated-document.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Get all generated documents for an organization
router.get('/:organizationId', authMiddleware, (req, res) =>
  generatedDocumentController.getGeneratedDocuments(req, res)
);

// Delete a generated document
router.delete('/:id', authMiddleware, (req, res) =>
  generatedDocumentController.deleteGeneratedDocument(req, res)
);

export default router;
