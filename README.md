# WebP Compressor Worker

This Cloudflare Worker serves a single-page web app that converts any user-provided image to a WebP file client-side. The conversion keeps the original resolution while targeting a maximum size of 1 MB. All compression happens in the browser so the worker never receives the file contents.

## Running locally

Use [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) to preview the worker:

```bash
wrangler dev
```

Then open the printed preview URL to access the web interface. Select an image and click **Convert to WebP** to generate a compressed download.
