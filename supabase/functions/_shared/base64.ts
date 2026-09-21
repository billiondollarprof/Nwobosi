/* ==========================================================================
   BASE64 FOR SOMETHING PICTURE SIZED

   WHY THIS IS NOT ONE LINE
   The obvious version is btoa(String.fromCharCode(...bytes)), and it works
   on every small test file and throws on every real photograph. Spreading
   a two megabyte array passes two million arguments to one call and blows
   the stack. A brand asset is capped at 2400px on its long edge, which is
   comfortably past that.

   Chunked at 32k it just works, and it produces byte for byte the same
   string. scripts/tests/read-image.test.mjs proves both halves of that:
   that the naive one really does throw, and that this one matches Node's
   own base64 exactly.

   Its own file so the test can import the real thing rather than a copy,
   because a test that checks a copy proves nothing about what ships.
   ========================================================================== */

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}
