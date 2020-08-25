# sharp-watch

## Resize images in folder recursively using sharp.

This project was developed to resize all images in a given folder (recursively) to create optimized assets.

## Features

- Super simple to use
- Uses trusted dependencies ([chokidar](https://www.npmjs.com/package/chokidar), [commander](https://www.npmjs.com/package/commander), [sharp](https://www.npmjs.com/package/sharp), etc...)
- Actively maintained and used by the [Lickstats](https://lickstats.com/) team
- Very light codebase to audit
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
  --sizes <sizes>        sizes at which images should be resized (example: "1280x720,1920x1080")
  --fit <fit>            selected fit for images within sizes (default: "outside")
  --without-enlargement  disable image enlargement
  --dest <destination>   path to resized image folder (default: source)
  --purge                purge resized images before running
  --watch                watch source for changes
  -h, --help             output usage information
```

For [CRA](https://www.npmjs.com/package/create-react-app) projects, consider using [concurrently](https://www.npmjs.com/package/concurrently) to run both `start` and `sharp` scripts concurrently using `npm run code`.

```json
{
  "scripts": {
    "start": "react-scripts start",
    "sharp": "sharp-watch --src src/images --dest src/images-resized --sizes=\"1280x720,1920x1080\" --without-enlargement --watch",
    "code": "concurrently -n start,sharp npm:start npm:sharp"
  }
}
```

Notice the `--watch` argument? This runs `sharp-watch` in the background, resizing or deleting images as they are created, updated and deleted.

## Example

**Resize images in [example](example) and save resized images to [example-resized](example-resized)**

**NOTICE:** When using `--without-enlargement`, small images (example: `small.jpg`) are renamed (to follow a predictable naming convention) but not enlarged.

```console
$ tree example
example
├── foo
│   ├── bar
│   │   └── courtney-read-EWhLexezAkA-unsplash.jpg
│   └── michael-james-IEbeDBPeIfs-unsplash.jpg
├── jonathan-auh-z99iWocuDt0-unsplash.jpg
└── small.jpg

$ sharp-watch --src example --dest example-resized --sizes="1280x720,1920x1080" --without-enlargement --purge

$ tree example-resized
example-resized
├── foo
│   ├── bar
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1280x720.jpg
│   │   └── courtney-read-EWhLexezAkA-unsplash-1920x1080.jpg
│   ├── michael-james-IEbeDBPeIfs-unsplash-1280x720.jpg
│   └── michael-james-IEbeDBPeIfs-unsplash-1920x1080.jpg
├── jonathan-auh-z99iWocuDt0-unsplash-1280x720.jpg
├── jonathan-auh-z99iWocuDt0-unsplash-1920x1080.jpg
├── small-1280x720.jpg
└── small-1920x1080.jpg
```

## Contributors

[Sun Knudsen](https://sunknudsen.com/)

## Licence

MIT
