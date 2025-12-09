import { Router } from 'express';
import { templateController } from '../controllers/template.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload, handleMulterError } from '../config/multer.config.js';

const router : Router = Router();

router.post('/upload', authMiddleware, upload.single('file'), handleMulterError, (req: any, res: any) =>
  templateController.directUpload(req, res)
);


router.post('/presigned-url', authMiddleware, (req, res) => 
  templateController.generateUploadUrl(req, res)
);

router.post('/confirm-upload', authMiddleware, (req, res) =>
  templateController.confirmUpload(req, res)
);

router.get('/:id', authMiddleware, (req, res) =>
  templateController.getTemplate(req, res)
);

router.get('/', authMiddleware, (req, res) =>
  templateController.getTemplates(req, res)
);

router.delete('/:id', authMiddleware, (req, res) =>
  templateController.deleteTemplate(req, res)
);

router.put('/:id/approve', authMiddleware, (req, res) =>
  templateController.approveTemplate(req, res)
);

export default router;
