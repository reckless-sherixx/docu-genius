import { Router } from 'express';
import { pdfEditorController } from '../controllers/pdf-editor.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

router.get('/:id/open', authMiddleware, (req, res) =>
  pdfEditorController.openForEditing(req, res)
);

router.get('/:id/edit', authMiddleware, (req, res) =>
  pdfEditorController.openForEditing(req, res)
);

router.get('/:id/download', authMiddleware, (req, res) =>
  pdfEditorController.downloadPDF(req, res)
);

router.post('/save', authMiddleware, (req, res) =>
  pdfEditorController.saveEditedPDF(req, res)
);

router.post('/prepare-editable', authMiddleware, (req, res) =>
  pdfEditorController.prepareEditablePDF(req, res)
);

router.post('/save-editable', authMiddleware, (req, res) =>
  pdfEditorController.saveEditablePDF(req, res)
);

router.post('/add-text', authMiddleware, (req, res) =>
  pdfEditorController.addText(req, res)
);

router.post('/add-image', authMiddleware, (req, res) =>
  pdfEditorController.addImage(req, res)
);

router.post('/add-signature', authMiddleware, (req, res) =>
  pdfEditorController.addSignature(req, res)
);

router.post('/highlight', authMiddleware, (req, res) =>
  pdfEditorController.highlightText(req, res)
);

router.post('/draw-shape', authMiddleware, (req, res) =>
  pdfEditorController.drawShape(req, res)
);

router.post('/save-permanent', authMiddleware, (req, res) =>
  pdfEditorController.savePermanentTemplate(req, res)
);

export default router;
