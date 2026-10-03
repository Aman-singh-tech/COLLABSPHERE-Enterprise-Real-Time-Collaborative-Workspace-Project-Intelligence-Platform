import Avatar from '../common/Avatar';
import { useState } from 'react';
import { formatRelativeTime } from '../../utils/formatDate';

const CommentsPanel = ({ comments = [], onAddComment, expanded = false }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true);
    try { await onAddComment(text.trim()); setText(''); } catch { /* parent displays the error; keep the draft */ } finally { setSaving(false); }
  };
  return (
    <div className={`${expanded ? 'block' : 'hidden xl:block'} w-64 flex-shrink-0 overflow-y-auto border-l border-gray-100 bg-white p-4`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Comments</p>
      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-xs text-gray-400">Add a comment to start a discussion.</p>
        )}
        {comments.map((c) => (
          <div key={c._id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <Avatar user={c.author} size="xs" />
              <span className="text-xs font-semibold text-gray-900">
                {c.author?.firstName} {c.author?.lastName}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{c.content}</p>
            <p className="mt-1 text-[11px] text-gray-400">{formatRelativeTime(c.createdAt)}</p>
          </div>
        ))}
      </div>
      {onAddComment && <form onSubmit={submit} className="mt-4 space-y-2">
        <textarea aria-label="Document comment" placeholder="Write a document comment..." value={text} onChange={(event) => setText(event.target.value)} maxLength={5000} className="w-full rounded border p-2 text-sm" />
        <button disabled={saving || !text.trim()} className="rounded bg-primary-600 px-3 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Adding…' : 'Add Comment'}</button>
      </form>}
    </div>
  );
};

export default CommentsPanel;
