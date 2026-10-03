import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markReadLocally, markAllReadLocally } from '../store/notificationSlice';
import { notificationService } from '../services/notification.service';
import { formatRelativeTime } from '../utils/formatDate';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const dispatch = useDispatch();
  const { items, status, unreadCount } = useSelector((state) => state.notification);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    setError('');
    dispatch(fetchNotifications({ page, limit: 20 })).unwrap().catch(setError);
  }, [dispatch, page]);
  const read = async (id) => {
    try { await notificationService.markAsRead(id); dispatch(markReadLocally(id)); }
    catch { toast.error('Could not mark notification as read.'); }
  };
  const readAll = async () => {
    try { await notificationService.markAllAsRead(); dispatch(markAllReadLocally()); }
    catch { toast.error('Could not mark notifications as read.'); }
  };
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Notifications</h1><button disabled={!unreadCount} onClick={readAll} className="text-primary-600 disabled:opacity-40">Mark all as read</button></div>
    {status === 'loading' ? <Loader /> : error ? <p role="alert">{error}</p> : <>
      {!items.length && <p>No notifications.</p>}
      {items.map((item) => <article key={item._id} className={`rounded border p-4 ${item.isRead ? 'bg-white' : 'bg-primary-50'}`}>
        <h2 className="font-semibold">{item.title}</h2><p>{item.message}</p><p className="text-xs text-gray-500">{formatRelativeTime(item.createdAt)}</p>
        {item.link?.startsWith('/workspaces/') && <Link onClick={() => read(item._id)} className="mr-4 text-primary-600" to={item.link}>Open</Link>}
        {!item.isRead && <button onClick={() => read(item._id)} className="text-primary-600">Mark as read</button>}
      </article>)}
    </>}
    <div className="flex gap-4"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page}</span><button disabled={items.length < 20} onClick={() => setPage((value) => value + 1)}>Next</button></div>
  </div>;
};
export default NotificationsPage;
