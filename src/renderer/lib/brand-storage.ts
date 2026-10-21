/** Copy the old renderer preferences once; keep the originals for rollback. */
export function migrateBrandStorage(storage: Storage): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
  for (const key of keys) {
    if (!key?.startsWith('clipora')) continue
    const nextKey = key.replace(/^clipora/, 'orbe')
    if (storage.getItem(nextKey) === null) {
      const value = storage.getItem(key)
      if (value !== null) storage.setItem(nextKey, value.replace(/clipora-media:/g, 'orbe-media:'))
    }
  }
}
