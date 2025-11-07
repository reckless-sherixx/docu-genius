import { Router } from 'express';
import { templateController } from '../controllers/template-v2.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload, handleMulterError } from '../config/multer.config.js';

const router : Router = Router();

// Direct upload using Multer (for backward compatibility)
router.post('/upload', authMiddleware, upload.single('file'), handleMulterError, (req: any, res: any) =>
  templateController.directUpload(req, res)
);

// Generate pre-signed URL for upload
router.post('/presigned-url', authMiddleware, (req, res) => 
  templateController.generateUploadUrl(req, res)
);

// Confirm upload and start processing
router.post('/confirm-upload', authMiddleware, (req, res) =>
  templateController.confirmUpload(req, res)
);

// Get single template with fields
router.get('/:id', authMiddleware, (req, res) =>
  templateController.getTemplate(req, res)
);

// Get all templates for organization
router.get('/', authMiddleware, (req, res) =>
  templateController.getTemplates(req, res)
);

// Delete template
router.delete('/:id', authMiddleware, (req, res) =>
  templateController.deleteTemplate(req, res)
);

// Approve template (admin only - add role check middleware if needed)
router.put('/:id/approve', authMiddleware, (req, res) =>
  templateController.approveTemplate(req, res)
);

export default router;
