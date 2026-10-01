import { useCallback, useEffect, useState } from 'react';
import { isCloudConfigured } from '../cloud/cloudClient.js';
import { listTeacherClasses } from '../cloud/classCloud.js';
import { listClassMeetings } from '../cloud/classMeetings.js';
import { cacheMessages, fetchRecentMessages, getCachedMessages, getMyCloudId, getReadMarks, mergeMessages, unreadCounts } from '../cloud/chatCloud.js';
import { readJSON, writeJSON } from '../utils/storage.js';

const MEETING_CACHE = 'guarania:meetingNotifications';
const POLL_MS = 45_000;

export default function useClassNotifications(user, classPackage) {
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  const refresh = useCallback(async () => {
    if (!isCloudConfigured()) {
      setMessageNotifications([]); setUpcomingMeetings([]); return;
    }
    try {
      const myId = await getMyCloudId();
      const classes = user?.role === 'maestro'
        ? (await listTeacherClasses()).map(group => ({ id: group.id, title: group.title, code: group.code }))
        : classPackage?.classId ? [{ id: classPackage.classId, title: classPackage.title, code: classPackage.code }] : [];
      const storedMeetings = readJSON(MEETING_CACHE, {});
      const cachedMeetings = storedMeetings && typeof storedMeetings === 'object' && !Array.isArray(storedMeetings) ? storedMeetings : {};
      const messagesByClass = await Promise.all(classes.map(async group => {
        try {
          const incoming = await fetchRecentMessages(group.id);
          const merged = mergeMessages(getCachedMessages(group.id), Array.isArray(incoming) ? incoming : []);
          cacheMessages(group.id, merged);
          return { group, messages: merged };
        } catch { return { group, messages: getCachedMessages(group.id) }; }
      }));
      const meetingResults = await Promise.all(classes.map(async group => {
        try {
          const meetings = await listClassMeetings(group.id);
          cachedMeetings[group.id] = meetings;
          return { group, meetings };
        } catch { return { group, meetings: cachedMeetings[group.id] ?? [] }; }
      }));
      writeJSON(MEETING_CACHE, cachedMeetings);

      const unread = messagesByClass.flatMap(({ group, messages }) => {
        const counts = unreadCounts(messages, myId, getReadMarks(group.id));
        const count = Object.values(counts).reduce((sum, value) => sum + value, 0);
        return count > 0 ? [{ classId: group.id, title: group.title, count }] : [];
      });
      const now = Date.now();
      const meetings = meetingResults.flatMap(({ group, meetings: items }) => items
        .filter(item => new Date(item.starts_at).getTime() > now)
        .map(item => ({ ...item, classTitle: group.title, classCode: group.code })))
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
      setMessageNotifications(unread);
      setUpcomingMeetings(meetings);
    } catch {
      // El centro de avisos sigue mostrando el último estado guardado localmente.
    }
  }, [classPackage?.classId, classPackage?.code, classPackage?.title, user?.role]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener('online', refresh);
    return () => { clearInterval(timer); window.removeEventListener('online', refresh); };
  }, [refresh]);

  const messageCount = messageNotifications.reduce((sum, item) => sum + item.count, 0);
  return { messageNotifications, upcomingMeetings, messageCount, notificationCount: messageCount + upcomingMeetings.length, refresh };
}
