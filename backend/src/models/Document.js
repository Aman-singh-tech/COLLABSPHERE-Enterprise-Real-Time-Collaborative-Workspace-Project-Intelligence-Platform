const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

    content: { type: mongoose.Schema.Types.Mixed, default: {} }, // TipTap/ProseMirror JSON
    outline: [{ heading: String, level: Number, anchor: String }],

    collaborators: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'editor', 'commenter', 'viewer'], default: 'editor' },
      },
    ],

    tags: [{ type: String }],
    comments: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: String, required: true, trim: true, maxlength: 5000 },
      createdAt: { type: Date, default: Date.now },
    }],
    isArchived: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
