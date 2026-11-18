type MapUpsert<K, V> = {
  getOrInsert(key: K, defaultValue: V): V
  getOrInsertComputed(key: K, callback: (key: K) => V): V
}

const mapProto = Map.prototype as Map<unknown, unknown> & MapUpsert<unknown, unknown>

if (typeof mapProto.getOrInsert !== 'function') {
  mapProto.getOrInsert = function (key, defaultValue) {
    if (this.has(key)) return this.get(key)
    this.set(key, defaultValue)
    return defaultValue
  }
}

if (typeof mapProto.getOrInsertComputed !== 'function') {
  mapProto.getOrInsertComputed = function (key, callback) {
    if (this.has(key)) return this.get(key)
    const value = callback(key)
    this.set(key, value)
    return value
  }
}

const PromiseCtor = Promise as PromiseConstructor & {
  withResolvers<T>(): {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: unknown) => void
  }
}

if (typeof PromiseCtor.withResolvers !== 'function') {
  PromiseCtor.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
