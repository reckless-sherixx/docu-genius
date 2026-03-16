import { Router } from 'express';
import { generatedDocumentController } from '../controllers/generated-document.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Get all generated documents for an organization
router.get('/:organizationId', authMiddleware, (req, res, next) =>
  generatedDocumentController.getGeneratedDocuments(req, res, next)
);

// Delete a generated document
router.delete('/:id', authMiddleware, (req, res, next) =>
  generatedDocumentController.deleteGeneratedDocument(req, res, next)
);

// Email a generated document to a candidate
router.post('/:id/email', authMiddleware, (req, res, next) =>
  generatedDocumentController.emailDocument(req, res, next)
);

export default router;
