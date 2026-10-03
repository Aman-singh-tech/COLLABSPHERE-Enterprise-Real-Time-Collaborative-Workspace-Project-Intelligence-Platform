const express = require('express');
const documentController = require('../controllers/document.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDocumentValidator } = require('../validators/document.validator');

const router = express.Router();

router.use(protect);

router.post('/', createDocumentValidator, validate, documentController.createDocument);
router.get('/', documentController.getDocuments);
router.use('/:id', documentController.requireDocumentAccess);
router.patch('/:id/content', documentController.saveContent);
router.post('/:id/comments', documentController.addComment);
router.get('/:id', documentController.getDocumentById);
router.patch('/:id', documentController.updateDocumentMeta);
router.delete('/:id', documentController.archiveDocument);

router.post('/:id/versions', documentController.createVersion);
router.get('/:id/versions', documentController.getVersionHistory);
router.post('/:id/versions/:versionId/restore', documentController.restoreVersion);

router.post('/:id/collaborators', documentController.addCollaborator);

module.exports = router;
