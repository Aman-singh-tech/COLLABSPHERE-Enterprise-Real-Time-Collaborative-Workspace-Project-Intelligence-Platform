import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { History } from 'lucide-react';
import DocumentOutline from '../components/documents/DocumentOutline';
import DocumentEditor from '../components/documents/DocumentEditor';
import CommentsPanel from '../components/documents/CommentsPanel';
import VersionHistory from '../components/documents/VersionHistory';
import Loader from '../components/common/Loader';
import { documentService } from '../services/document.service';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { documentContentHtml } from '../utils/documentContent';

const DocumentEditorPage = () => {
  const { documentId } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const editorRef = useRef(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await editorRef.current?.save(); toast.success('Document saved.'); }
    catch (error) { toast.error(error.response?.data?.message || 'Could not save. Please retry.'); throw error; }
    finally { setSaving(false); }
  };
  const handleSnapshot = async () => {
    try {
      await handleSave();
      await documentService.createVersion(documentId, `Snapshot ${new Date().toLocaleString()}`);
      await handleShowVersions();
      toast.success('Version saved.');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save version.'); }
  };
  const handleComment = async (content) => {
    try {
      const response = await documentService.addComment(documentId, content);
      setDocument((previous) => ({ ...previous, comments: response.data.comments }));
    } catch (error) { toast.error(error.response?.data?.message || 'Could not add comment.'); throw error; }
  };

  useEffect(() => {
    documentService
      .getById(documentId)
      .then((res) => setDocument(res.data.document))
      .catch(() => toast.error('Could not load this document.'))
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleShowVersions = async () => {
    const res = await documentService.getVersionHistory(documentId);
    setVersions(res.data.versions);
    setShowVersions(true);
  };

  const handleRestore = async (versionId) => {
    try {
    await editorRef.current?.save();
    const res = await documentService.restoreVersion(documentId, versionId);
    setDocument(res.data.document);
    setEditorRevision((value) => value + 1);
    setShowVersions(false);
    toast.success('Document restored.');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not restore version.'); }
  };

  const handleTitleChange = async (e) => {
    const title = e.target.value;
    if (title && title !== document.title) {
      const res = await documentService.updateMeta(documentId, { title });
      setDocument((previous) => ({ ...previous, title: res.data.document.title }));
    }
  };

  if (loading) return <Loader />;
  if (!document) return <p className="py-12 text-center text-gray-400">Document not found.</p>;

  return (
    <div className="-m-6 flex h-[calc(100vh-64px)] flex-col">
      <div className="flex flex-wrap items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
        <input
          defaultValue={document.title}
          onBlur={handleTitleChange}
          className="min-w-0 flex-1 border-none bg-transparent text-lg font-semibold text-gray-900 outline-none"
        />
        <button onClick={() => handleSave().catch(() => {})} disabled={saving} className="rounded px-3 py-1.5 text-sm text-primary-600">{saving ? 'Saving…' : 'Save'}</button>
        <button onClick={handleSnapshot} disabled={saving} className="rounded px-3 py-1.5 text-sm text-primary-600">Save Version</button>
        <button onClick={() => setShowComments((value) => !value)} className="rounded px-3 py-1.5 text-sm text-primary-600 xl:hidden">Comments</button>
        <button
          onClick={handleShowVersions}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          <History size={15} />
          Version History
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white">
        <div className="hidden lg:block"><DocumentOutline outline={document.outline} /></div>
        <div className="min-w-0 flex-1 overflow-y-auto">
          <DocumentEditor
            key={`${documentId}:${editorRevision}`}
            ref={editorRef}
            documentId={documentId}
            initialContentHtml={documentContentHtml(document.content) || document.contentHtml || ''}
            socket={socket}
            currentUser={user}
          />
        </div>
        <CommentsPanel expanded={showComments} comments={document.comments || []} onAddComment={handleComment} />
      </div>

      {showVersions && (
        <VersionHistory
          versions={versions}
          onRestore={handleRestore}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
};

export default DocumentEditorPage;
