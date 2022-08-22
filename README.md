# Shopify Project Image Downloader

## Usage

```bash
 pnpx github:davidwarrington/download-shopify-images --out=./downloads --cdn=https://cdn.shopify.com/...
 # or using npm
 pnpx github:davidwarrington/download-shopify-images --out=./downloads --cdn=https://cdn.shopify.com/...
```

## Options

### CDN Path, `---cdn`
Required
Default Value: `undefined`

This path will be prepended to all Shopify image URLs in order to download them. To get the CDN path visit your live store, open an image in a new tab and copy everything before the filename in the URL.

### Input, `--in`
Default Value: `.`

If value resolves to a directory, the script will search for images referenced inside Shopify data files (`settings/**/*.json` and `templates/**/*.json`). Otherwise a plaintext file is assumed, where each line contains the full URL of an image on the CDN.

### Output, `--out`
Default Value: `.`

The directory images will be downloaded to.
