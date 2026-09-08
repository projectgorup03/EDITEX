/**
 * Mandatory Polyfill Suite
 * Forced at entry point prior to any other modules or pdfjs-dist initialization.
 * Provides critical compatibility for legacy WebKit, older Safari, and constrained environments.
 */

// 1. Promise.withResolvers polyfill (essential for pdfjs-dist v4+ on legacy WebKit)
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// 2. Object.hasOwn polyfill
if (typeof Object.hasOwn === 'undefined') {
  (Object as any).hasOwn = function (obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 3. Array.prototype.at, TypedArray.prototype.at, String.prototype.at
if (!Array.prototype.at) {
  Array.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

if (!String.prototype.at) {
  String.prototype.at = function (n: number) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return '';
    return this.charAt(n);
  };
}

const typedArrayConstructors = [
  typeof Uint8Array !== 'undefined' ? Uint8Array : null,
  typeof Int8Array !== 'undefined' ? Int8Array : null,
  typeof Uint16Array !== 'undefined' ? Uint16Array : null,
  typeof Int16Array !== 'undefined' ? Int16Array : null,
  typeof Uint32Array !== 'undefined' ? Uint32Array : null,
  typeof Int32Array !== 'undefined' ? Int32Array : null,
  typeof Float32Array !== 'undefined' ? Float32Array : null,
  typeof Float64Array !== 'undefined' ? Float64Array : null,
].filter(Boolean) as (new (...args: any[]) => any)[];

typedArrayConstructors.forEach((typedArray) => {
  if (typedArray && !typedArray.prototype.at) {
    (typedArray.prototype as any).at = function (n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }
});

// 4. globalThis fallback
if (typeof globalThis === 'undefined') {
  if (typeof window !== 'undefined') {
    (window as any).globalThis = window;
  } else if (typeof global !== 'undefined') {
    (global as any).globalThis = global;
  } else if (typeof self !== 'undefined') {
    (self as any).globalThis = self;
  }
}

// 5. structuredClone fallback for legacy WebKit / Safari
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = function <T>(obj: T): T {
    if (obj === undefined) return undefined as any;
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  };
}

// 6. ReadableStream Symbol.asyncIterator polyfill
if (
  typeof ReadableStream !== 'undefined' &&
  !(ReadableStream.prototype as any)[Symbol.asyncIterator]
) {
  (ReadableStream.prototype as any)[Symbol.asyncIterator] = function () {
    const reader = this.getReader();
    return {
      next() {
        return reader.read();
      },
      return() {
        return reader.cancel();
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
}

// 7. URL.canParse fallback
if (typeof (URL as any).canParse !== 'function') {
  (URL as any).canParse = function (url: string, base?: string): boolean {
    try {
      new URL(url, base);
      return true;
    } catch {
      return false;
    }
  };
}

// 8. requestIdleCallback fallback
if (typeof window !== 'undefined' && !(window as any).requestIdleCallback) {
  (window as any).requestIdleCallback = function (cb: any) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };
  (window as any).cancelIdleCallback = function (id: number) {
    clearTimeout(id);
  };
}

if (typeof window !== 'undefined') {
  (window as any).__PDFJS_POLYFILLS_LOADED__ = true;
}

console.info('[Polyfills] Mandatory polyfill suite initialized successfully at entry point.');

export {};
