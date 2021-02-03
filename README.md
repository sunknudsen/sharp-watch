# sharp-watch

## Resize images in folder recursively using sharp.

This project was developed to resize all images in a given folder (recursively) to create optimized assets.

## Features

- Super simple to use
- Uses trusted dependencies ([chokidar](https://www.npmjs.com/package/chokidar), [commander](https://www.npmjs.com/package/commander), [sharp](https://www.npmjs.com/package/sharp), etc…)
- Very light codebase to audit (less than 300 lines of code)
- Written in TypeScript

## Installation

```shell
npm install sharp-watch -g
```

## Usage

```console
$ sharp-watch -h
Usage: sharp-watch [options]

Options:
  --src <source>         path to image folder
  --filter <filter>      filter used to select which image formats will be resized
                         (choices: "dz", "fits", "gif", "heif", "jpeg", "jpg",
                         "magick", "openslide", "pdf", "png", "ppm", "raw", "svg",
                         "tiff", "vips", "webp", default: "gif,jpeg,jpg,png,webp")
  --sizes <sizes>        sizes at which images will be resized (example:
                         "640x360,1280x720,1920x1080")
  --without-enlargement  do not enlarge images
  --fit <fit>            fit at which images will be resized (choices: "contain",
                         "cover", "fill", "inside", "outside", default: "outside")
  --format <format>      format at which images will be transcoded (choices: "dz",
                         "fits", "gif", "heif", "jpeg", "magick", "openslide", "pdf",
                         "png", "ppm", "raw", "svg", "tiff", "vips", "webp")
  --quality <quality>    quality at which images will be transcoded (default: "80")
  --dest <destination>   path to resized image folder (default: source)
  --purge                purge resized image folder
  --watch                watch source for changes
  --verbose              show more debug info
  --yes                  skip confirmation prompt
  -h, --help             display help for command
```

For [CRA](https://www.npmjs.com/package/create-react-app) projects, consider using [concurrently](https://www.npmjs.com/package/concurrently) to run both `start` and `sharp` scripts concurrently using `npm run code`.

```json
{
  "scripts": {
    "start": "react-scripts start",
    "sharp": "sharp-watch --src example --sizes 640x360,1280x720,1920x1080 --without-enlargement --format jpeg --dest example-resized --watch",
    "code": "concurrently -n start,sharp npm:start npm:sharp"
  }
}
```

Notice the `--watch` argument? This runs `sharp-watch` in the background, resizing and deleting images as they are created, updated and deleted.

## Example

In following example, we resize and transcode images in [example](example) to `jpeg` format and save processed images to [example-resized](example-resized).

```console
$ pwd
/Users/sunknudsen/Code/sunknudsen/sharp-watch

$ tree example
example
├── foo
│   ├── bar
│   │   └── courtney-read-EWhLexezAkA-unsplash.jpg
│   └── michael-james-IEbeDBPeIfs-unsplash.jpg
├── jonathan-auh-z99iWocuDt0-unsplash.jpg
└── jonathan-gallegos-PgHc0Ka1E0A-unsplash.png

$ sharp-watch --src example --sizes 640x360,1280x720,1920x1080 --without-enlargement --format jpeg --dest example-resized --purge
Purging /Users/sunknudsen/Code/sunknudsen/sharp-watch/example-resized…
? Do you wish to proceed? Yes
Purged /Users/sunknudsen/Code/sunknudsen/sharp-watch/example-resized successfully!
Resizing images…
Resized images successfully!

$ tree example-resized
example-resized
├── foo
│   ├── bar
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1280x720.jpeg
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1920x1080.jpeg
│   │   └── courtney-read-EWhLexezAkA-unsplash-640x360.jpeg
│   ├── michael-james-IEbeDBPeIfs-unsplash-1280x720.jpeg
│   ├── michael-james-IEbeDBPeIfs-unsplash-1920x1080.jpeg
│   └── michael-james-IEbeDBPeIfs-unsplash-640x360.jpeg
├── jonathan-auh-z99iWocuDt0-unsplash-1280x720.jpeg
├── jonathan-auh-z99iWocuDt0-unsplash-1920x1080.jpeg
├── jonathan-auh-z99iWocuDt0-unsplash-640x360.jpeg
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-1280x720.jpeg
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-1920x1080.jpeg
└── jonathan-gallegos-PgHc0Ka1E0A-unsplash-640x360.jpeg
```

## Contributors

[Sun Knudsen](https://sunknudsen.com/)

## Licence

MIT
