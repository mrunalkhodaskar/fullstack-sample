const DATABASE_NAME = 'orderly-offline';
const STORE_NAME = 'orderPages';
const MAX_CACHED_PAGES = 20;

let databasePromise;

function openDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support offline order storage.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'accountKey' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open offline order storage.'));
      request.onblocked = () => reject(new Error('Offline order storage is blocked by another open tab.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

function accountKeyFor(email) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('An account is required to access cached orders.');
  return normalizedEmail;
}

function pageKeyFor({ page = 0, size = 10, sort = 'newest', status = '', search = '' } = {}) {
  return JSON.stringify({
    page,
    size,
    sort,
    status: status === 'ALL' ? '' : status,
    search: search.trim()
  });
}

export async function getCachedOrders(email, options) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(accountKeyFor(email));
    request.onsuccess = () => {
      const entry = request.result?.pages?.[pageKeyFor(options)];
      resolve(entry || null);
    };
    request.onerror = () => reject(request.error || new Error('Unable to read cached orders.'));
    transaction.onerror = () => reject(transaction.error || new Error('Unable to read cached orders.'));
  });
}

export async function saveCachedOrders(email, options, data) {
  const database = await openDatabase();
  const accountKey = accountKeyFor(email);
  const pageKey = pageKeyFor(options);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(accountKey);

    request.onsuccess = () => {
      const pages = request.result?.pages || {};
      pages[pageKey] = { data, savedAt: Date.now() };

      const oldestFirst = Object.entries(pages)
        .sort(([, first], [, second]) => first.savedAt - second.savedAt);
      while (oldestFirst.length > MAX_CACHED_PAGES) {
        const [oldestKey] = oldestFirst.shift();
        delete pages[oldestKey];
      }

      store.put({ accountKey, pages });
    };
    request.onerror = () => reject(request.error || new Error('Unable to save cached orders.'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Unable to save cached orders.'));
    transaction.onabort = () => reject(transaction.error || new Error('Unable to save cached orders.'));
  });
}

export async function clearCachedOrders(email) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(accountKeyFor(email));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Unable to clear cached orders.'));
    transaction.onabort = () => reject(transaction.error || new Error('Unable to clear cached orders.'));
  });
}
