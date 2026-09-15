/* ==========================================================================
   SHRINKING AN IMAGE BEFORE IT GOES ANYWHERE
   One encoder, used by the chat and by the admin knowledge base.

   WHY IT IS SHARED RATHER THAN WRITTEN TWICE
   ------------------------------------------
   The two callers want different sizes and different things back, but the
   hard part is identical: draw it smaller, encode it well, and do not get
   caught by the fallback below. Two copies of that is two copies that
   drift, and the one that drifts is the one nobody is looking at.

   WEBP FIRST, JPEG IF THE BROWSER CANNOT MAKE ONE
   -----------------------------------------------
   WebP carries the same picture in about half the bytes at the same
   quality. Measured on 2026-09-15 at quality 0.85, shrunk to 1568 first:

     a screenshot of our own landing page   91 KB jpeg  ->  45 KB webp
     a photograph off the site              70 KB jpeg  ->  39 KB webp

   Those two are what people actually send. A screenshot is most of it,
   and a screenshot is where WebP wins hardest, because flat colour and
   sharp text are what it is good at.

   One number to distrust if you re-measure: pure random noise comes out
   about 6% BIGGER as WebP. That is a real result and it is also
   meaningless, because nobody uploads noise. Test on a screenshot and a
   photograph, not on something generated.

   THE FALLBACK IS NOT OPTIONAL, AND THIS IS THE TRAP IN IT
   -------------------------------------------------------
   A canvas asked for a format it cannot encode does not fail and does not
   tell you. It hands back a PNG instead. A PNG of a photograph is several
   times larger than the JPEG it replaced, so a browser without WebP would
   quietly start uploading the biggest file of the three while the code
   looked like it was saving space.

   So it does not trust what it asked for. It reads the front of the data
   URL it actually got back and only keeps it if the type matches.
   ========================================================================== */

/* 0.85 is where the eye stops noticing and the bytes stop falling much.
   Shared by both callers, because a logo and a screenshot want the same
   answer to this question. */
export const IMAGE_QUALITY = 0.85;

/* Reads the front of the data URL rather than trusting the request. See
   the header. */
function encodeCanvas(canvas, quality) {
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) {
    return { dataUrl: webp, mediaType: "image/webp", extension: "webp" };
  }
  return {
    dataUrl: canvas.toDataURL("image/jpeg", quality),
    mediaType: "image/jpeg",
    extension: "jpg",
  };
}

/* Turns a base64 data URL into a Blob, for the callers that upload the
   file rather than sending its bytes in a JSON body.

   Done by hand rather than with fetch(dataUrl), which also works and
   quietly allocates the whole thing twice. These can be several megabytes
   on a phone. */
function blobFromDataUrl(dataUrl, mediaType) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mediaType });
}

/* Draws the image at most maxEdge across its long side and re-encodes it.
   Done in the browser, because a five megabyte photo that becomes two
   hundred kilobytes before it leaves the device is faster for the person
   and cheaper for the company, and nothing downstream sees a difference.

   Comes back with everything either caller needs:
     blob        for uploading to storage
     data        base64 with no prefix, for sending to the model
     media_type  what it actually is, after the fallback above
     extension   for naming the stored object
     width, height
*/
export function shrinkImage(file, { maxEdge, quality = IMAGE_QUALITY }) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const longest = Math.max(img.width, img.height);
      /* Never scaled UP. A 300px logo asked for at 2400 stays 300px:
         enlarging it invents detail that was never there and makes the
         file bigger for a worse picture. */
      const scale = longest > maxEdge ? maxEdge / longest : 1;
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const { dataUrl, mediaType, extension } = encodeCanvas(canvas, quality);
      const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (!data) {
        reject(new Error("empty canvas"));
        return;
      }

      resolve({
        blob: blobFromDataUrl(dataUrl, mediaType),
        data,
        media_type: mediaType,
        extension,
        width,
        height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image this browser can open"));
    };

    img.src = url;
  });
}
