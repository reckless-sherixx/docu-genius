import { NextFunction, Request, Response, Router } from 'express';
import { templateController } from '../controllers/template.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload, handleMulterError } from '../config/multer.config.js';
import { uploadLimiter } from '../config/rateLimit.config.js';

const router : Router = Router();

router.post('/upload', authMiddleware, uploadLimiter, upload.single('file'), handleMulterError, (req: Request, res: Response, next: NextFunction) =>
  templateController.directUpload(req, res, next)
);


router.post('/presigned-url', authMiddleware, uploadLimiter, (req: Request, res: Response, next: NextFunction) => 
  templateController.generateUploadUrl(req, res, next)
);

router.post('/confirm-upload', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  templateController.confirmUpload(req, res, next)
);

router.get('/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  templateController.getTemplate(req, res, next)
);

router.get('/', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  templateController.getTemplates(req, res, next)
);

router.delete('/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  templateController.deleteTemplate(req, res, next)
);

router.put('/:id/approve', authMiddleware, (req: Request, res: Response, next: NextFunction) =>
  templateController.approveTemplate(req, res, next)
);

export default router;
