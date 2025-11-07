import { Router } from 'express';
import { pdfEditorController } from '../controllers/pdf-editor.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

// Open PDF for editing (with OCR if scanned)
router.get('/:id/edit', authMiddleware, (req, res) =>
  pdfEditorController.openForEditing(req, res)
);

// Download PDF through backend proxy (avoids CORS)
router.get('/:id/download', authMiddleware, (req, res) =>
  pdfEditorController.downloadPDF(req, res)
);

// Save edited PDF (expires in 2 hours)
router.post('/save', authMiddleware, (req, res) =>
  pdfEditorController.saveEditedPDF(req, res)
);

// Save editable PDF (Sejda-style with text manipulation)
router.post('/save-editable', authMiddleware, (req, res) =>
  pdfEditorController.saveEditablePDF(req, res)
);

// PDF editing operations
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

export default router;
