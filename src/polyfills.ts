// Polyfill Promise.withResolvers for Mobile WebKit / Safari (< 17.4) and legacy browsers
// Required by PDF.js 4+ on mobile devices

declare global {
  interface PromiseConstructor {
    withResolvers<T = any>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: any) => void;
    };
  }
}

if (typeof Promise !== 'undefined' && typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function <T = any>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
