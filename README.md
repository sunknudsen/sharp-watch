# sharp-watch

## Resize images in folder recursively using sharp.

This project was developed to resize all images in a given folder (recursively) to create optimized assets.

## Features

- Super simple to use
- Uses trusted dependencies ([chokidar](https://www.npmjs.com/package/chokidar), [commander](https://www.npmjs.com/package/commander), [sharp](https://www.npmjs.com/package/sharp), etc…)
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
  --src <source>                 path to image folder
  --filter <filter>              filter used to select which image formats
                                 will be resized (choices: "dz", "fits",
                                 "gif", "heif", "jpeg", "jpg", "magick",
                                 "openslide", "pdf", "png", "ppm", "raw",
                                 "svg", "tiff", "vips", "webp", default:
                                 "gif,jpeg,jpg,png,webp")
  --formats <formats>            formats at which images will be transcoded
                                 (choices: "dz", "fits", "gif", "heif",
                                 "jpeg", "magick", "openslide", "original",
                                 "pdf", "png", "ppm", "raw", "svg", "tiff",
                                 "vips", "webp", default: "original,webp")
  --quality <quality>            quality at which images will be transcoded
                                 (default: "80")
  --sizes <sizes>                sizes at which images will be resized
                                 (example: 640x360,1280x720,1920x1080)
  --without-enlargement          do not enlarge images
  --fit <fit>                    fit at which images will be resized
                                 (choices: "contain", "cover", "fill",
                                 "inside", "outside", default: "outside")
  --dest <destination>           path to resized image folder (default:
                                 source)
  --content-hash                 append content hash to filenames
  --manifest                     generate resized image manifest
  --manifest-dest <destination>  path to resized image manifest file
                                 (default: source/manifest.json)
  --blurhash                     compute image blurhash
  --purge                        purge resized image folder
  --watch                        watch source for changes
  --verbose                      show more debug info
  --yes                          skip confirmation prompt
  -h, --help                     display help for command
```

For [CRA](https://www.npmjs.com/package/create-react-app) projects, consider using [concurrently](https://www.npmjs.com/package/concurrently) to run both `start` and `sharp` scripts concurrently using `npm run code`.

```json
{
  "scripts": {
    "start": "react-scripts start",
    "sharp": "sharp-watch --src example --sizes 640x360,1280x720,1920x1080 --without-enlargement --dest example-resized --content-hash --manifest --blurhash --watch",
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
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash.jpg
├── foo
│   ├── bar
│   │   └── courtney-read-EWhLexezAkA-unsplash.jpg
│   └── michael-james-IEbeDBPeIfs-unsplash.jpg
└── jonathan-gallegos-PgHc0Ka1E0A-unsplash.png

$ sharp-watch --src example --sizes 640x360,1280x720,1920x1080 --without-enlargement --dest example-resized --content-hash --manifest --blurhash --purge
Purging /Users/sunknudsen/Code/sunknudsen/sharp-watch/example-resized…
? Do you wish to proceed? Yes
Purged /Users/sunknudsen/Code/sunknudsen/sharp-watch/example-resized successfully!
Resizing images…
Resized images successfully!

$ tree example-resized
example-resized
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash-1280x720.93f2a8b8.webp
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash-1280x720.aec7607d.jpg
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash-1920x1080.0b197338.webp
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash-1920x1080.a69a3cdf.jpg
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash-640x360.08fd2cea.jpg
├── eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash-640x360.6e0a14e6.webp
├── foo
│   ├── bar
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1280x720.35e19f7b.jpg
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1280x720.75111d84.webp
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1920x1080.3a7a711c.jpg
│   │   ├── courtney-read-EWhLexezAkA-unsplash-1920x1080.e03f199d.webp
│   │   ├── courtney-read-EWhLexezAkA-unsplash-640x360.60237a34.jpg
│   │   └── courtney-read-EWhLexezAkA-unsplash-640x360.b1fa8959.webp
│   ├── michael-james-IEbeDBPeIfs-unsplash-1280x720.cf682d4c.jpg
│   ├── michael-james-IEbeDBPeIfs-unsplash-1280x720.e67aa80f.webp
│   ├── michael-james-IEbeDBPeIfs-unsplash-1920x1080.8621c62c.webp
│   ├── michael-james-IEbeDBPeIfs-unsplash-1920x1080.93af2d7e.jpg
│   ├── michael-james-IEbeDBPeIfs-unsplash-640x360.85c3c1b2.jpg
│   └── michael-james-IEbeDBPeIfs-unsplash-640x360.d77ab9ab.webp
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-1280x720.3ab1abfc.png
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-1280x720.75345407.webp
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-1920x1080.3ab1abfc.png
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-1920x1080.75345407.webp
├── jonathan-gallegos-PgHc0Ka1E0A-unsplash-640x360.48c8ff0d.png
└── jonathan-gallegos-PgHc0Ka1E0A-unsplash-640x360.aafcb051.webp

$ cat example/manifest.json
{
  "eberhard-grossgasteiger-S-2Ukb_VqpA-unsplash.jpg": {
    "original": {
      "640x360": {
        "width": 640,
        "height": 960,
        "ratio": 0.6666666666666666,
        "fileSize": 28098,
        "contentHash": "08fd2cea",
        "color": "#f8d8d8",
        "blurhash": "UjQu:9}[RP%2{1J7ayniODW;s:WoxaoLbbkC"
      },
      "1280x720": {
        "width": 1280,
        "height": 1920,
        "ratio": 0.6666666666666666,
        "fileSize": 93109,
        "contentHash": "aec7607d",
        "color": "#f8d8d8",
        "blurhash": "UiQu:9}[M{%2{1J7ayniODW;s:WVxaoLbbkC"
      },
      "1920x1080": {
        "width": 1920,
        "height": 2880,
        "ratio": 0.6666666666666666,
        "fileSize": 220456,
        "contentHash": "a69a3cdf",
        "color": "#f8d8d8",
        "blurhash": "UiQu:9}[M{%2{1J7ayniODW;s:WVxaoLbbkC"
      }
    },
    "webp": {
      "640x360": {
        "width": 640,
        "height": 960,
        "ratio": 0.6666666666666666,
        "fileSize": 10568,
        "contentHash": "6e0a14e6",
        "color": "#f8d8d8",
        "blurhash": "UjQu:9}[RP%2{1J7ayniODW;s:WoxaoLbbkC"
      },
      "1280x720": {
        "width": 1280,
        "height": 1920,
        "ratio": 0.6666666666666666,
        "fileSize": 30500,
        "contentHash": "93f2a8b8",
        "color": "#f8d8d8",
        "blurhash": "UiQu:9}[M{%2{1J7ayniODW;s:WVxaoLbbkC"
      },
      "1920x1080": {
        "width": 1920,
        "height": 2880,
        "ratio": 0.6666666666666666,
        "fileSize": 64920,
        "contentHash": "0b197338",
        "color": "#f8d8d8",
        "blurhash": "UiQu:9}[M{%2{1J7ayniODW;s:WVxaoLbbkC"
      }
    }
  },
  "jonathan-gallegos-PgHc0Ka1E0A-unsplash.png": {
    "original": {
      "640x360": {
        "width": 640,
        "height": 895,
        "ratio": 0.7150837988826816,
        "fileSize": 757615,
        "contentHash": "48c8ff0d",
        "color": "#080808",
        "blurhash": "U^HL_6RPaet8_NjZayofxutRkCWBt7kCfkae"
      },
      "1280x720": {
        "width": 915,
        "height": 1280,
        "ratio": 0.71484375,
        "fileSize": 1491315,
        "contentHash": "3ab1abfc",
        "color": "#080808",
        "blurhash": "U_HL}DRPaet8_NjZayofxutRkCWBt7kCfkae"
      },
      "1920x1080": {
        "width": 915,
        "height": 1280,
        "ratio": 0.71484375,
        "fileSize": 1491315,
        "contentHash": "3ab1abfc",
        "color": "#080808",
        "blurhash": "U_HL}DRPaet8_NjZayofxutRkCWBt7kCfkae"
      }
    },
    "webp": {
      "640x360": {
        "width": 640,
        "height": 895,
        "ratio": 0.7150837988826816,
        "fileSize": 36118,
        "contentHash": "aafcb051",
        "color": "#080808",
        "blurhash": "U^HL_6RPaet8_NjZayofxutRkCWBt7kCfkae"
      },
      "1280x720": {
        "width": 915,
        "height": 1280,
        "ratio": 0.71484375,
        "fileSize": 72308,
        "contentHash": "75345407",
        "color": "#080808",
        "blurhash": "U_HL}DRPaet8_NjZayofxutRkCWBt7kCfkae"
      },
      "1920x1080": {
        "width": 915,
        "height": 1280,
        "ratio": 0.71484375,
        "fileSize": 72308,
        "contentHash": "75345407",
        "color": "#080808",
        "blurhash": "U_HL}DRPaet8_NjZayofxutRkCWBt7kCfkae"
      }
    }
  },
  "foo/michael-james-IEbeDBPeIfs-unsplash.jpg": {
    "original": {
      "640x360": {
        "width": 640,
        "height": 395,
        "ratio": 1.620253164556962,
        "fileSize": 49207,
        "contentHash": "85c3c1b2",
        "color": "#282828",
        "blurhash": "UhEMdwxuRPkC_4ofaeof_Nt7jZof_Nt7axof"
      },
      "1280x720": {
        "width": 1280,
        "height": 791,
        "ratio": 1.618204804045512,
        "fileSize": 187403,
        "contentHash": "cf682d4c",
        "color": "#282828",
        "blurhash": "UhEMdwxuRPkB_4ofaeof_Nt7jZof_Nt7axof"
      },
      "1920x1080": {
        "width": 1920,
        "height": 1186,
        "ratio": 1.6188870151770658,
        "fileSize": 413933,
        "contentHash": "93af2d7e",
        "color": "#282828",
        "blurhash": "UhEMdwxuRPkB_4ofaeof_Nt7jZof_Nt7axof"
      }
    },
    "webp": {
      "640x360": {
        "width": 640,
        "height": 395,
        "ratio": 1.620253164556962,
        "fileSize": 40458,
        "contentHash": "d77ab9ab",
        "color": "#282828",
        "blurhash": "UhEMdwxuRPkC_4ofaeof_Nt7jZof_Nt7axof"
      },
      "1280x720": {
        "width": 1280,
        "height": 791,
        "ratio": 1.618204804045512,
        "fileSize": 156304,
        "contentHash": "e67aa80f",
        "color": "#282828",
        "blurhash": "UhEMdwxuRPkB_4ofaeof_Nt7jZof_Nt7axof"
      },
      "1920x1080": {
        "width": 1920,
        "height": 1186,
        "ratio": 1.6188870151770658,
        "fileSize": 335364,
        "contentHash": "8621c62c",
        "color": "#282828",
        "blurhash": "UhEMdwxuRPkB_4ofaeof_Nt7jZof_Nt7axof"
      }
    }
  },
  "foo/bar/courtney-read-EWhLexezAkA-unsplash.jpg": {
    "original": {
      "640x360": {
        "width": 640,
        "height": 400,
        "ratio": 1.6,
        "fileSize": 47505,
        "contentHash": "60237a34",
        "color": "#282828",
        "blurhash": "U:F6e2oza#oz_4ofWVof-;kCWBofxaj[WBj["
      },
      "1280x720": {
        "width": 1280,
        "height": 800,
        "ratio": 1.6,
        "fileSize": 180172,
        "contentHash": "35e19f7b",
        "color": "#282828",
        "blurhash": "U:F6e2oga#oz_4ofWVof-;j]WBofxaj[WBj["
      },
      "1920x1080": {
        "width": 1920,
        "height": 1200,
        "ratio": 1.6,
        "fileSize": 388721,
        "contentHash": "3a7a711c",
        "color": "#282828",
        "blurhash": "U:F6e2oga#oz_4ofWVof-;j]WBofxaj[WBj["
      }
    },
    "webp": {
      "640x360": {
        "width": 640,
        "height": 400,
        "ratio": 1.6,
        "fileSize": 38920,
        "contentHash": "b1fa8959",
        "color": "#282828",
        "blurhash": "U:F6e2oza#oz_4ofWVof-;kCWBofxaj[WBj["
      },
      "1280x720": {
        "width": 1280,
        "height": 800,
        "ratio": 1.6,
        "fileSize": 144966,
        "contentHash": "75111d84",
        "color": "#282828",
        "blurhash": "U:F6e2oga#oz_4ofWVof-;j]WBofxaj[WBj["
      },
      "1920x1080": {
        "width": 1920,
        "height": 1200,
        "ratio": 1.6,
        "fileSize": 306514,
        "contentHash": "e03f199d",
        "color": "#282828",
        "blurhash": "U:F6e2oga#oz_4ofWVof-;j]WBofxaj[WBj["
      }
    }
  }
}
```

## Contributors

[Sun Knudsen](https://sunknudsen.com/)

## Licence

MIT
