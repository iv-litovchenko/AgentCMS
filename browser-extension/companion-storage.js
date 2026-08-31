(function initCompanionStorage(global) {
  "use strict";

  const STORAGE_PREFIX = "agent-shell-companion:";

  function readChromeStorageApi() {
    try {
      return global.chrome?.storage ?? global.browser?.storage ?? null;
    } catch {
      return null;
    }
  }

  function createLocalStorageBucket() {
    function readKey(key) {
      try {
        const raw = global.localStorage?.getItem(STORAGE_PREFIX + key);
        return raw == null ? undefined : JSON.parse(raw);
      } catch {
        return undefined;
      }
    }

    function writeKey(key, value) {
      try {
        global.localStorage?.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch {
        // ignore
      }
    }

    return {
      get(keys) {
        return Promise.resolve().then(() => {
          const result = {};
          if (keys == null) {
            for (let i = 0; i < (global.localStorage?.length || 0); i += 1) {
              const fullKey = global.localStorage.key(i);
              if (!fullKey || !fullKey.startsWith(STORAGE_PREFIX)) continue;
              const key = fullKey.slice(STORAGE_PREFIX.length);
              result[key] = readKey(key);
            }
            return result;
          }

          const keyList = Array.isArray(keys)
            ? keys
            : typeof keys === "object"
              ? Object.keys(keys)
              : [keys];

          for (const key of keyList) {
            const value = readKey(key);
            if (value !== undefined) result[key] = value;
            else if (typeof keys === "object" && keys[key] !== undefined) result[key] = keys[key];
          }
          return result;
        });
      },
      set(items) {
        return Promise.resolve().then(() => {
          for (const [key, value] of Object.entries(items || {})) {
            writeKey(key, value);
          }
        });
      }
    };
  }

  let localBucket = null;
  let syncBucket = null;

  function getExtensionStorage(kind) {
    const api = readChromeStorageApi();
    const bucket = kind === "sync" ? api?.sync : api?.local;
    if (bucket) return bucket;

    if (kind === "sync") {
      if (!syncBucket) syncBucket = createLocalStorageBucket();
      return syncBucket;
    }

    if (!localBucket) localBucket = createLocalStorageBucket();
    return localBucket;
  }

  function onChanged() {
    const api = readChromeStorageApi();
    if (api?.onChanged) return api.onChanged;
    return {
      addListener() {
        // localStorage fallback: no cross-tab sync
      },
      removeListener() {}
    };
  }

  function hasRuntimeMessaging() {
    try {
      return Boolean(global.chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  global.CompanionStorage = {
    local: () => getExtensionStorage("local"),
    sync: () => getExtensionStorage("sync"),
    onChanged,
    hasRuntimeMessaging,
    readChromeStorageApi
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
