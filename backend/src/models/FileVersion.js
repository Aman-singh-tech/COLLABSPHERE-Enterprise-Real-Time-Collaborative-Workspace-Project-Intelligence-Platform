const mongoose = require('mongoose');

const fileVersionSchema = new mongoose.Schema(
  {
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: String,
    versionLabel: { type: String, default: '' }, // e.g. "V1 - Initial Draft"
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileVersion', fileVersionSchema);
