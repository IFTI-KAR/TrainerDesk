const QUEUE_STORAGE_KEY = 'td_offline_session_queue_v1';

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function writeQueue(queueObj) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueObj));
  } catch (_err) {
    // Ignore quota errors
  }
}

export function enqueueSessionLog(sessionId, payload) {
  const queue = readQueue();
  queue[sessionId] = {
    sessionId,
    payload,
    updatedAt: new Date().toISOString(),
  };
  writeQueue(queue);
}

export function getQueuedSessionLog(sessionId) {
  const queue = readQueue();
  return queue[sessionId] || null;
}

export function removeQueuedSessionLog(sessionId) {
  const queue = readQueue();
  if (queue[sessionId]) {
    delete queue[sessionId];
    writeQueue(queue);
  }
}

export function getPendingQueueCount() {
  return Object.keys(readQueue()).length;
}

export async function flushSessionQueue(syncFn) {
  const queue = readQueue();
  const entries = Object.values(queue);
  const results = [];

  for (const entry of entries) {
    try {
      const res = await syncFn(entry.sessionId, entry.payload);
      removeQueuedSessionLog(entry.sessionId);
      results.push({ sessionId: entry.sessionId, ok: true, data: res });
    } catch (err) {
      results.push({ sessionId: entry.sessionId, ok: false, error: err });
    }
  }

  return results;
}
