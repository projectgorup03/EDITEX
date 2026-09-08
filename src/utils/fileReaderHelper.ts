/**
 * Strict FileReader Buffer Pipeline
 * Strictly executes file reading via the browser's FileReader API into an ArrayBuffer,
 * subsequently converted into a Uint8Array buffer.
 * Bypasses direct Response / Blob.prototype.arrayBuffer modern stream abstractions.
 */

/**
 * Reads any File or Blob strictly via the FileReader API, returning a Uint8Array buffer.
 */
export function readFileAsUint8Array(file: File | Blob): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      reject(new TypeError('Invalid input: Expected a File or Blob instance.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        const uint8Array = new Uint8Array(reader.result);
        resolve(uint8Array);
      } else {
        reject(new Error('FileReader did not return a valid ArrayBuffer.'));
      }
    };

    reader.onerror = () => {
      reject(reader.error || new Error('FileReader encountered an error while reading file.'));
    };

    reader.onabort = () => {
      reject(new Error('FileReader operation was aborted.'));
    };

    // Strict execution of readAsArrayBuffer
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normalizes input (File, Blob, ArrayBuffer, or Uint8Array) strictly into a Uint8Array buffer.
 * If input is a File or Blob, strictly forces FileReader execution.
 */
export async function toStrictUint8Array(
  input: File | Blob | ArrayBuffer | ArrayBufferView | any
): Promise<Uint8Array> {
  if (input instanceof File || input instanceof Blob) {
    return await readFileAsUint8Array(input);
  }

  if (input instanceof Uint8Array) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }

  // Fallback for other binary sources
  const fallbackBlob = new Blob([input]);
  return await readFileAsUint8Array(fallbackBlob);
}
