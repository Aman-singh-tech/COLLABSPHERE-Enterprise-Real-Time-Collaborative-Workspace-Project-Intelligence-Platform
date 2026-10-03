import { X, Share2, MoreVertical, FileText, FileImage, File as FileIcon, Trash2 } from 'lucide-react';
import { formatFullDate } from '../../utils/formatDate';
import { formatFileSize } from '../../utils/validators';

const getFileIcon = (mimeType) => {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (mimeType === 'application/pdf') return FileText;
  return FileIcon;
};

const FileDetailsPanel = ({ file, versions = [], onClose, onShare, onDelete, onDownload, onToggleLock, onUploadVersion, onRestoreVersion }) => {
  if (!file) return null;
  const Icon = getFileIcon(file.mimeType);

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Details</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>

      <div className="mb-4 flex h-32 items-center justify-center rounded-lg border border-gray-100 bg-gray-50">
        <Icon size={40} className="text-red-500" />
      </div>

      <p className="truncate font-semibold text-gray-900">{file.originalName}</p>
      <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase text-gray-500">
        {file.mimeType?.split('/')[1] || 'file'}
      </span>
      <span className="ml-2 text-xs text-gray-400">{formatFileSize(file.size)}</span>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Owner</span>
          <span className="font-medium text-gray-700">
            {file.owner?.firstName} {file.owner?.lastName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Created</span>
          <span className="font-medium text-gray-700">{formatFullDate(file.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Modified</span>
          <span className="font-medium text-gray-700">{formatFullDate(file.updatedAt)}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => onShare(file)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Share2 size={14} />
          Share
        </button>
        <button
          onClick={() => onDelete(file)}
          className="flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
          title="Delete file"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {!file.isFolder && <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <button onClick={() => onDownload(file)} className="rounded border px-3 py-2">Download</button>
        <button onClick={() => onToggleLock(file)} className="rounded border px-3 py-2">{file.isLocked ? 'Unlock' : 'Lock'}</button>
        <button disabled={file.isLocked} onClick={onUploadVersion} className="rounded border px-3 py-2 disabled:opacity-50">Upload New Version</button>
      </div>}
      {versions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Version History
          </p>
          <div className="space-y-2">
            {versions.map((v, idx) => (
              <div key={v._id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    idx === 0 ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-700">{v.versionLabel}</p>
                  <button disabled={file.isLocked} onClick={() => onRestoreVersion(v._id)} className="text-primary-600 disabled:opacity-50">Restore</button>
                  <p className="text-xs text-gray-400">
                    {formatFullDate(v.createdAt)} by {v.uploadedBy?.firstName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDetailsPanel;
