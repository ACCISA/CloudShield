/**
 * Compresses an image File/Blob using the Canvas API.
 *
 * @param {File|Blob} file - The source image file
 * @param {object} options
 * @param {number} [options.maxWidth=512]  - Max output width in pixels
 * @param {number} [options.maxHeight=512] - Max output height in pixels
 * @param {number} [options.quality=0.75]  - JPEG quality (0–1)
 * @returns {Promise<string>} Compressed image as a base64 data URL
 */
export function compressImage(
  file,
  { maxWidth = 512, maxHeight = 512, quality = 0.75 } = {},
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down proportionally if either dimension exceeds the max
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}
