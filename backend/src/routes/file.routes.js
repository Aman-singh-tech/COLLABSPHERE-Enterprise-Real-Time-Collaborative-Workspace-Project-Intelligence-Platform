const express = require('express');
const fileController = require('../controllers/file.controller');
const { protect } = require('../middlewares/auth.middleware');
const { uploadFile } = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const { createFolderValidator } = require('../validators/file.validator');

const router = express.Router();

router.use(protect);

router.post('/upload', uploadFile.single('file'), fileController.uploadFile);
router.post('/folders', createFolderValidator, validate, fileController.createFolder);
router.get('/', fileController.listFiles);
router.use('/:id', fileController.requireFileAccess);
router.get('/:id', fileController.getFileDetails);
router.post('/:id/versions', uploadFile.single('file'), fileController.uploadNewVersion);
router.post('/:id/versions/:versionId/restore', fileController.restoreVersion);
router.patch('/:id/lock', fileController.toggleLock);
router.post('/:id/share', fileController.shareFile);
router.get('/:id/download', fileController.trackDownload);
router.delete('/:id', fileController.deleteFile);

module.exports = router;
