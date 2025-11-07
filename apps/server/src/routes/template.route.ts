import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload, handleMulterError } from '../config/multer.config.js';

const router:Router = Router();

// All template routes require authentication
router.use(authMiddleware);

// Direct upload using Multer (recommended)
router.post('/upload', upload.single('file'), handleMulterError, TemplateController.uploadTemplate);

// Presigned URL upload (alternative method)
router.post('/upload-url', TemplateController.getUploadUrl);
router.post('/confirm-upload', TemplateController.confirmUpload);

// Template management
router.get('/:organizationId', TemplateController.getTemplates);
router.get('/:templateId/download', TemplateController.getDownloadUrl);
router.delete('/:templateId', TemplateController.deleteTemplate);

export default router;
