export default {
  async fetch(request) {
    if (new URL(request.url).pathname !== '/') {
      return new Response('Not found', { status: 404 });
    }

    return new Response(htmlPage, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  },
};

const htmlPage = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Client-side WebP Compressor</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0b172a;
        color: #f0f4ff;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 2rem;
        background: radial-gradient(circle at top, rgba(93, 106, 255, 0.2), transparent 60%),
          radial-gradient(circle at bottom, rgba(45, 205, 253, 0.2), transparent 60%),
          #0b172a;
      }
      main {
        width: min(600px, 100%);
        background: rgba(12, 24, 44, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 2.5rem;
        box-shadow: 0 30px 80px rgba(8, 13, 35, 0.45);
        backdrop-filter: blur(24px);
      }
      h1 {
        margin-top: 0;
        font-size: clamp(1.8rem, 2vw + 1rem, 2.4rem);
        text-align: center;
        letter-spacing: 0.04em;
      }
      p {
        line-height: 1.6;
        margin: 1rem 0;
      }
      label {
        display: block;
        margin-top: 1.5rem;
        font-weight: 600;
      }
      .input-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      .input-grid label {
        margin-top: 0;
      }
      input[type="file"] {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.75rem;
        border-radius: 14px;
        border: 1px dashed rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.05);
      }
      input[type="number"] {
        width: 100%;
        margin-top: 0.5rem;
        padding: 0.7rem;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.07);
        color: inherit;
      }
      input[type="number"]:focus {
        outline: none;
        border-color: rgba(64, 249, 255, 0.6);
        box-shadow: 0 0 0 3px rgba(64, 249, 255, 0.15);
      }
      button {
        margin-top: 2rem;
        width: 100%;
        padding: 0.9rem 1.4rem;
        border: none;
        border-radius: 18px;
        font-size: 1rem;
        font-weight: 600;
        color: #0b172a;
        background: linear-gradient(135deg, #5e9cff, #40f9ff);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      button:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px rgba(64, 249, 255, 0.25);
      }
      progress {
        width: 100%;
        margin-top: 1rem;
        height: 12px;
        border-radius: 6px;
        overflow: hidden;
      }
      #status {
        margin-top: 1rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.95rem;
        white-space: pre-line;
        color: rgba(214, 227, 255, 0.8);
      }
      footer {
        margin-top: 2rem;
        font-size: 0.85rem;
        text-align: center;
        opacity: 0.7;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>WebP Compressor</h1>
      <p>
        Compress any image directly in your browser. Choose your target size and
        optionally resize the output — everything happens locally on your device.
      </p>
      <label for="file-input">Choose an image</label>
      <input id="file-input" type="file" accept="image/*" />
      <label for="target-size">Target size (MB)</label>
      <input
        id="target-size"
        type="number"
        min="0.1"
        step="0.1"
        placeholder="1"
        inputmode="decimal"
      />
      <div class="input-grid">
        <label for="target-width">
          Width (px)
          <input id="target-width" type="number" min="1" step="1" inputmode="numeric" />
        </label>
        <label for="target-height">
          Height (px)
          <input id="target-height" type="number" min="1" step="1" inputmode="numeric" />
        </label>
      </div>
      <button id="convert-btn" type="button">Convert to WebP</button>
      <progress id="progress" value="0" max="100" hidden></progress>
      <div id="status" aria-live="polite"></div>
      <footer>All processing happens locally — no uploads required.</footer>
    </main>
    <script>
      const fileInput = document.getElementById('file-input');
      const targetSizeInput = document.getElementById('target-size');
      const targetWidthInput = document.getElementById('target-width');
      const targetHeightInput = document.getElementById('target-height');
      const button = document.getElementById('convert-btn');
      const progress = document.getElementById('progress');
      const status = document.getElementById('status');

      button.addEventListener('click', async () => {
        const file = fileInput.files?.[0];
        if (!file) {
          updateStatus('Please choose an image first.');
          return;
        }

        const targetSizeBytes = readTargetSize(targetSizeInput.value);
        if (targetSizeBytes <= 0) {
          updateStatus('Target size must be a positive number.');
          return;
        }

        disableUI(true);
        updateStatus('Reading file...');
        progress.hidden = false;
        progress.value = 10;

        try {
          const dataUrl = await readFileAsDataURL(file);
          updateStatus('Decoding image...');
          progress.value = 20;
          const image = await loadImage(dataUrl);

          const canvas = document.createElement('canvas');
          const { width: canvasWidth, height: canvasHeight } = resolveDimensions(
            image,
            targetWidthInput.value,
            targetHeightInput.value
          );
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(
            image,
            0,
            0,
            image.naturalWidth,
            image.naturalHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );

          updateStatus(
            \`Compressing to WebP targeting \${(targetSizeBytes / (1024 * 1024)).toFixed(2)} MB at \${canvas.width}x\${canvas.height}...\`
          );
          progress.value = 40;
          const { blob, quality } = await compressToTarget(canvas, targetSizeBytes, progress, status);

          updateStatus(
            \`Finished at quality \${quality.toFixed(2)}. Output size: \${(blob.size / 1024).toFixed(1)} KB (target \${(targetSizeBytes / (1024 * 1024)).toFixed(2)} MB)\`
          );
          progress.value = 100;

          triggerDownload(blob, file.name.replace(/\.[^.]+$/, '') + '.webp');
        } catch (error) {
          console.error(error);
          updateStatus('Something went wrong: ' + error.message);
        } finally {
          disableUI(false);
          setTimeout(() => (progress.hidden = true), 1500);
        }
      });

      function disableUI(disabled) {
        button.disabled = disabled;
        fileInput.disabled = disabled;
        targetSizeInput.disabled = disabled;
        targetWidthInput.disabled = disabled;
        targetHeightInput.disabled = disabled;
      }

      function updateStatus(message) {
        status.textContent = message;
      }

      function readTargetSize(value) {
        const trimmed = value.trim();
        if (!trimmed) {
          return 1024 * 1024;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return -1;
        }
        return parsed * 1024 * 1024;
      }

      function parseDimension(value) {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return Math.round(parsed);
      }

      function resolveDimensions(image, widthValue, heightValue) {
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;
        const desiredWidth = parseDimension(widthValue);
        const desiredHeight = parseDimension(heightValue);

        if (desiredWidth && desiredHeight) {
          return { width: desiredWidth, height: desiredHeight };
        }

        if (desiredWidth) {
          const derivedHeight = Math.max(
            1,
            Math.round((desiredWidth / naturalWidth) * naturalHeight)
          );
          return { width: desiredWidth, height: derivedHeight };
        }

        if (desiredHeight) {
          const derivedWidth = Math.max(
            1,
            Math.round((desiredHeight / naturalHeight) * naturalWidth)
          );
          return { width: derivedWidth, height: desiredHeight };
        }

        return { width: naturalWidth, height: naturalHeight };
      }

      function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Unable to read file.'));
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Invalid image file.'));
          img.src = src;
        });
      }

      async function compressToTarget(canvas, targetSize, progressEl, statusEl) {
        const maxQuality = 0.95;
        const minQuality = 0.6;
        const fallbackQuality = 0.8;
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const originalCanvas = canvas;
        let scaleFactor = 1;

        while (true) {
          const workingWidth = Math.max(1, Math.round(originalWidth * scaleFactor));
          const workingHeight = Math.max(1, Math.round(originalHeight * scaleFactor));
          const workingCanvas =
            scaleFactor === 1
              ? originalCanvas
              : createScaledCanvas(originalCanvas, workingWidth, workingHeight);

          const searchResult = await searchForQuality(
            workingCanvas,
            targetSize,
            maxQuality,
            minQuality,
            progressEl
          );

          if (searchResult.success) {
            return searchResult.payload;
          }

          // We need to reduce the resolution and try again.
          scaleFactor /= 2;
          const nextWidth = originalWidth * scaleFactor;
          const nextHeight = originalHeight * scaleFactor;

          if (statusEl) {
            statusEl.textContent = \`Reducing resolution to \${Math.round(
              Math.max(nextWidth, 1)
            )}x\${Math.round(Math.max(nextHeight, 1))} to hit the target size...\`;
          }

          if (nextWidth < 1080) {
            const fallbackWidth = Math.min(originalWidth, 1080);
            const fallbackHeight = Math.max(
              1,
              Math.round((fallbackWidth / originalWidth) * originalHeight)
            );
            if (statusEl) {
              statusEl.textContent = \`Falling back to \${fallbackWidth}x\${fallbackHeight} at quality \${fallbackQuality.toFixed(
                2
              )}.\`;
            }

            const fallbackCanvas = createScaledCanvas(
              originalCanvas,
              fallbackWidth,
              fallbackHeight
            );
            const fallbackBlob = await canvasToBlob(
              fallbackCanvas,
              'image/webp',
              fallbackQuality
            );
            if (!fallbackBlob) throw new Error('Failed to produce WebP output.');
            return { blob: fallbackBlob, quality: fallbackQuality };
          }
        }
      }

      async function searchForQuality(
        canvas,
        targetSize,
        maxQuality,
        minQuality,
        progressEl
      ) {
        const initialBlob = await canvasToBlob(canvas, 'image/webp', maxQuality);
        if (!initialBlob) throw new Error('WebP compression is not supported in this browser.');
        if (initialBlob.size <= targetSize) {
          return { success: true, payload: { blob: initialBlob, quality: maxQuality } };
        }

        let low = minQuality;
        let high = maxQuality;
        let best = null;
        let bestQuality = maxQuality;

        for (let i = 0; i < 10; i++) {
          const quality = low + (high - low) / 2;
          const blob = await canvasToBlob(canvas, 'image/webp', quality);
          if (!blob) throw new Error('Failed to compress image.');

          const percentage = 40 + ((i + 1) / 10) * 40;
          if (progressEl) progressEl.value = Math.min(percentage, 90);

          if (blob.size > targetSize) {
            high = quality - 0.02;
            if (high < minQuality) {
              break;
            }
          } else {
            best = blob;
            bestQuality = quality;
            low = Math.min(maxQuality, quality + 0.02);
          }

          if (high <= low) break;
        }

        if (best) {
          return { success: true, payload: { blob: best, quality: bestQuality } };
        }

        const minQualityBlob = await canvasToBlob(canvas, 'image/webp', minQuality);
        if (!minQualityBlob) throw new Error('Failed to produce WebP output.');
        if (minQualityBlob.size <= targetSize) {
          return { success: true, payload: { blob: minQualityBlob, quality: minQuality } };
        }

        return { success: false };
      }

      function createScaledCanvas(sourceCanvas, width, height) {
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = Math.max(1, Math.round(width));
        scaledCanvas.height = Math.max(1, Math.round(height));
        const context = scaledCanvas.getContext('2d');
        context.drawImage(
          sourceCanvas,
          0,
          0,
          sourceCanvas.width,
          sourceCanvas.height,
          0,
          0,
          scaledCanvas.width,
          scaledCanvas.height
        );
        return scaledCanvas;
      }

      function canvasToBlob(canvas, type, quality) {
        return new Promise((resolve) => {
          canvas.toBlob(resolve, type, quality);
        });
      }

      function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        requestAnimationFrame(() => {
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        });
      }
    </script>
  </body>
</html>`;
