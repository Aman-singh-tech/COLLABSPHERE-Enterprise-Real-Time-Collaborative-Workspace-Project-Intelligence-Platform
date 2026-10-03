import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import DOMPurify from 'dompurify';
import { documentService } from '../../services/document.service';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Minus,
  Printer,
  Undo,
  Redo,
  Sparkles,
  Type,
} from 'lucide-react';
import Avatar from '../common/Avatar';

const FONT_FAMILIES = [
  { name: 'Inter (Sans)', value: 'Inter, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia (Serif)', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Courier (Mono)', value: '"Courier New", monospace' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];

const TEXT_COLORS = ['#111827', '#4B5563', '#DC2626', '#D97706', '#059669', '#2563EB', '#7C3AED', '#DB2777'];
const HIGHLIGHT_COLORS = ['transparent', '#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA'];

const DocumentEditor = forwardRef(({ documentId, initialContentHtml, socket, currentUser, onSave }, ref) => {
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const [activeEditors, setActiveEditors] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const pendingContent = useRef(null);
  const saveQueue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const revision = useRef(0);

  const flushSave = useCallback(() => {
    clearTimeout(saveTimeoutRef.current);
    if (pendingContent.current === null) return saveQueue.current;
    const html = pendingContent.current;
    const savedRevision = revision.current;
    pendingContent.current = null;
    if (mounted.current) setSaveStatus('saving');
    const request = saveQueue.current.catch(() => {}).then(() => documentService.saveContent(documentId, html));
    saveQueue.current = request;
    return request.then((response) => {
      if (mounted.current && savedRevision === revision.current) {
        setLastSavedAt(response.data.savedAt);
        setSaveStatus('saved');
      }
      onSave?.(html);
      return response;
    }).catch((error) => {
      if (mounted.current) {
        if (savedRevision === revision.current) pendingContent.current = html;
        setSaveStatus('error');
      }
      throw error;
    });
  }, [documentId, onSave]);

  useImperativeHandle(ref, () => ({ save: flushSave }), [flushSave]);
  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!['pending', 'saving', 'error'].includes(saveStatus)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [saveStatus]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; flushSave().catch(() => {}); };
  }, [flushSave]);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [selectedFont, setSelectedFont] = useState(FONT_FAMILIES[0].value);
  const [selectedSize, setSelectedSize] = useState('16px');

  const isRemoteUpdate = useRef(false);

  const updateStats = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    setCharCount(text.length);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(initialContentHtml || '');
      updateStats();
    }
  }, [initialContentHtml]);

  useEffect(() => {
    if (!socket || !documentId) return;

    socket.emit('document:join', documentId);

    const handleRemoteChange = ({ changes, userId }) => {
      if (userId === currentUser?._id) return;
      isRemoteUpdate.current = true;
      if (editorRef.current) {
        editorRef.current.innerHTML = DOMPurify.sanitize(changes);
        updateStats();
      }
      isRemoteUpdate.current = false;
    };

    const handleTypingUpdate = ({ userId, name, isTyping }) => {
      setActiveEditors((prev) => {
        const next = { ...prev };
        if (isTyping) next[userId] = name;
        else delete next[userId];
        return next;
      });
    };

    const handleSaved = ({ savedAt }) => setLastSavedAt(savedAt);

    socket.on('document:changed', handleRemoteChange);
    socket.on('document:typing:update', handleTypingUpdate);
    socket.on('document:saved', handleSaved);

    return () => {
      socket.emit('document:leave', documentId);
      socket.off('document:changed', handleRemoteChange);
      socket.off('document:typing:update', handleTypingUpdate);
      socket.off('document:saved', handleSaved);
    };
  }, [socket, documentId, currentUser]);

  const handleInput = useCallback(() => {
    if (isRemoteUpdate.current) return;

    updateStats();
    const html = editorRef.current.innerHTML;

    socket?.emit('document:change', { documentId, changes: html, version: Date.now() });
    socket?.emit('document:typing', { documentId, isTyping: true });
    pendingContent.current = html;
    revision.current += 1;
    setSaveStatus('pending');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      flushSave().catch(() => {});
      socket?.emit('document:typing', { documentId, isTyping: false });
    }, 1200);
  }, [socket, documentId, flushSave]);

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleFontFamily = (font) => {
    setSelectedFont(font);
    exec('fontName', font);
  };

  const handleHeading = (e) => {
    const format = e.target.value;
    if (format) exec('formatBlock', `<${format}>`);
  };

  const handlePrint = () => {
    window.print();
  };

  const editorNames = Object.values(activeEditors);

  return (
    <div className="flex flex-1 flex-col bg-gray-100 min-h-[calc(100vh-112px)]">
      {/* MS Word Toolbar Ribbon */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo */}
          <button onClick={() => exec('undo')} title="Undo" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Undo size={15} />
          </button>
          <button onClick={() => exec('redo')} title="Redo" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Redo size={15} />
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          {/* Heading Dropdown */}
          <select
            onChange={handleHeading}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 outline-none hover:border-gray-300"
          >
            <option value="p">Normal Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          {/* Font Family Selector */}
          <select
            value={selectedFont}
            onChange={(e) => handleFontFamily(e.target.value)}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 outline-none hover:border-gray-300 max-w-[130px]"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          {/* Formatting Buttons */}
          <button onClick={() => exec('bold')} title="Bold" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Bold size={15} />
          </button>
          <button onClick={() => exec('italic')} title="Italic" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Italic size={15} />
          </button>
          <button onClick={() => exec('underline')} title="Underline" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Underline size={15} />
          </button>
          <button onClick={() => exec('strikeThrough')} title="Strikethrough" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Strikethrough size={15} />
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          {/* Text Color Picker */}
          <div className="flex items-center gap-0.5 rounded border border-gray-200 px-1 py-0.5">
            <Type size={14} className="text-gray-500" />
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => exec('foreColor', c)}
                className="h-3.5 w-3.5 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Highlight Color Picker */}
          <div className="flex items-center gap-0.5 rounded border border-gray-200 px-1 py-0.5">
            <span className="text-xs font-bold text-yellow-600 px-0.5">H</span>
            {HIGHLIGHT_COLORS.slice(1).map((c) => (
              <button
                key={c}
                onClick={() => exec('hiliteColor', c)}
                className="h-3.5 w-3.5 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          {/* Alignment */}
          <button onClick={() => exec('justifyLeft')} title="Align Left" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <AlignLeft size={15} />
          </button>
          <button onClick={() => exec('justifyCenter')} title="Align Center" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <AlignCenter size={15} />
          </button>
          <button onClick={() => exec('justifyRight')} title="Align Right" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <AlignRight size={15} />
          </button>
          <button onClick={() => exec('justifyFull')} title="Justify" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <AlignJustify size={15} />
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          {/* Lists & Extras */}
          <button onClick={() => exec('insertUnorderedList')} title="Bullet List" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <List size={15} />
          </button>
          <button onClick={() => exec('insertOrderedList')} title="Numbered List" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <ListOrdered size={15} />
          </button>
          <button onClick={() => exec('formatBlock', 'blockquote')} title="Quote" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Quote size={15} />
          </button>
          <button onClick={() => exec('insertHorizontalRule')} title="Divider Line" className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <Minus size={15} />
          </button>

          <div className="mx-1 h-5 w-px bg-gray-200" />

          {/* Print Button */}
          <button onClick={handlePrint} title="Print Document" className="flex items-center gap-1 rounded bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200">
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>

        {/* Live Collaborators & Save Status */}
        <div className="flex items-center gap-3">
          {editorNames.length > 0 && (
            <span className="text-xs italic text-primary-600 font-medium">{editorNames.join(', ')} typing...</span>
          )}
          <div className="flex -space-x-2">
            {editorNames.slice(0, 4).map((name) => (
              <Avatar key={name} user={{ firstName: name.split(' ')[0] }} size="xs" />
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {saveStatus === 'error' ? 'Save failed — use Save to retry' : saveStatus === 'pending' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Saving…' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'No unsaved changes'}
          </span>
        </div>
      </div>

      {/* A4 Paper Canvas */}
      <div className="flex-1 overflow-y-auto py-8 px-4 flex justify-center">
        <div className="w-full max-w-[850px] min-h-[900px] bg-white shadow-xl rounded-sm border border-gray-200 p-12 relative transition-all">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            suppressContentEditableWarning
            style={{ fontFamily: selectedFont }}
            className="prose prose-slate max-w-none outline-none min-h-[800px] text-gray-900 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500 [&_blockquote]:pl-4 [&_blockquote]:italic"
          />
        </div>
      </div>

      {/* MS Word Bottom Status Bar */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Words: <strong>{wordCount}</strong></span>
          <span>Characters: <strong>{charCount}</strong></span>
          <span>Reading Time: <strong>{Math.ceil(wordCount / 200)} min</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-primary-600" />
          <span className="font-semibold text-gray-700">MS Word Studio View</span>
        </div>
      </div>
    </div>
  );
});

export default DocumentEditor;
