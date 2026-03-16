import { Router } from 'express';
import { pdfEditorController } from '../controllers/pdf-editor.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { generateDocLimiter } from '../config/rateLimit.config.js';

const router: Router = Router();

router.get('/:id/open', authMiddleware, (req, res, next) =>
  pdfEditorController.openForEditing(req, res, next)
);

router.get('/:id/edit', authMiddleware, (req, res, next) =>
  pdfEditorController.openForEditing(req, res, next)
);

router.get('/:id/download', authMiddleware, (req, res, next) =>
  pdfEditorController.downloadPDF(req, res, next)
);

router.post('/save', authMiddleware, (req, res, next) =>
  pdfEditorController.saveEditedPDF(req, res, next)
);

router.post('/prepare-editable', authMiddleware, (req, res, next) =>
  pdfEditorController.prepareEditablePDF(req, res, next)
);

router.post('/save-editable', authMiddleware, (req, res, next) =>
  pdfEditorController.saveEditablePDF(req, res, next)
);

router.post('/save-permanent', authMiddleware, (req, res, next) =>
  pdfEditorController.savePermanentTemplate(req, res, next)
);

router.post('/generate-document', authMiddleware, generateDocLimiter, (req, res, next) =>
  pdfEditorController.generateDocument(req, res, next)
);

export default router;
