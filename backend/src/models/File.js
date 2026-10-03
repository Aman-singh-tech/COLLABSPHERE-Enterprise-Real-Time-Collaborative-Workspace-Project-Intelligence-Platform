const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    path: { type: String, required() { return !this.isFolder; }, default: '' },
    url: { type: String, required() { return !this.isFolder; }, default: '' },

    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null }, // parent folder (self-ref)
    isFolder: { type: Boolean, default: false },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    permissions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        access: { type: String, enum: ['view', 'edit', 'manage'], default: 'view' },
      },
    ],

    isLocked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

fileSchema.index({ workspace: 1, folder: 1 });

module.exports = mongoose.model('File', fileSchema);
