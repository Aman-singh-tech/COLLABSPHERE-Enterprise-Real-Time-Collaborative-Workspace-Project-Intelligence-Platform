import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';

const SearchPage = () => {
  const { workspaceId } = useParams();
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setResults({});
    api.get('/search', { params: { q: query, workspaceId }, signal: controller.signal })
      .then((response) => setResults(response.data.data.results))
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.response?.data?.message || 'Search failed.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, workspaceId]);
  const target = (type, item) => {
    const base = `/workspaces/${workspaceId}`;
    if (type === 'documents') return `${base}/documents/${item._id}`;
    if (type === 'tasks' || type === 'comments') return `${base}/projects/${item.projectId}`;
    if (type === 'workspaces') return `/workspaces/${item._id}`;
    if (type === 'files') return `${base}/files`;
    if (type === 'messages') return `${base}/chat`;
    return `${base}/settings`;
  };
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold">Search results for “{query}”</h1>
    {loading ? <Loader /> : error ? <p role="alert" className="text-red-600">{error}</p> : <>
      {!Object.values(results).some((items) => items.length) && <p>No results in this workspace.</p>}
      {Object.entries(results).filter(([, items]) => items.length).map(([type, items]) => <section key={type}>
        <h2 className="mb-2 text-lg font-semibold capitalize">{type}</h2>
        <ul className="space-y-2">{items.map((item) => <li key={item._id}><Link className="block rounded border bg-white p-3 text-primary-700 hover:bg-primary-50" to={target(type, item)}>{item.title || item.originalName || item.content || item.name || `${item.firstName} ${item.lastName || ''}`}</Link></li>)}</ul>
      </section>)}
    </>}
  </div>;
};
export default SearchPage;
