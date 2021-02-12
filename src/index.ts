"use strict"

import program, {
  Option as CommanderOption,
  InvalidOptionArgumentError as CommanderInvalidOptionError,
} from "commander"
import chokidar from "chokidar"
import { resolve, dirname, extname, relative, join, basename } from "path"
import readdirp, { ReaddirpOptions } from "readdirp"
import {
  existsSync,
  ensureDir,
  readFileSync,
  writeFile,
  unlink,
  emptyDir,
} from "fs-extra"
import sharp, {
  fit,
  format,
  FitEnum,
  FormatEnum,
  Sharp,
  OutputInfo,
} from "sharp"
import { createHash } from "crypto"
import { encode } from "blurhash"
import chalk from "chalk"
import { prompt } from "inquirer"

const sharpFits = Object.keys(fit).sort()
const sharpFormats = Object.keys(format).sort()

type Fit = keyof FitEnum

type Filter = keyof FormatEnum | "jpg"

const filterChoices = [...sharpFormats]
filterChoices.push("jpg")
filterChoices.sort()

type Format = keyof FormatEnum | "original"

const formatChoices = [...sharpFormats]
formatChoices.push("original")
formatChoices.sort()

const parseFilter = function (value: string) {
  const filters: string[] = value.split(",")
  for (const filter of filters) {
    if (filterChoices.indexOf(filter) === -1) {
      throw new CommanderInvalidOptionError("Invalid filter")
    }
  }
  return value
}

const parseSizes = function (value: string) {
  const sizes: string[] = value.split(",")
  for (const size of sizes) {
    if (!size.match(/^[0-9]+x[0-9]+$/)) {
      throw new CommanderInvalidOptionError("Invalid sizes")
    }
  }
  return value
}

const parseFormats = function (value: string) {
  const formats: string[] = value.split(",")
  for (const format of formats) {
    if (formatChoices.indexOf(format) === -1) {
      throw new CommanderInvalidOptionError("Invalid format")
    }
  }
  return value
}

const parseQuality = function (value: string) {
  const quality = parseInt(value)
  if (quality < 0 || quality > 100) {
    throw new CommanderInvalidOptionError("Invalid quality")
  }
  return value
}

const parseManifestDest = function (value: string) {
  if (!value.match(/\.json$/)) {
    throw new CommanderInvalidOptionError("Invalid meta dest")
  }
  return value
}

interface SharpWatchOptions {
  src: string
  filter: string
  formats?: string
  quality?: string
  sizes: string
  withoutEnlargement?: boolean
  fit: string
  dest?: string
  contentHash?: boolean
  manifest?: boolean
  manifestDest?: string
  blurhash?: boolean
  purge?: boolean
  watch?: boolean
  verbose?: boolean
  yes?: boolean
}

program
  .requiredOption("--src <source>", "path to image folder")
  .addOption(
    new CommanderOption(
      "--filter <filter>",
      "filter used to select which image formats will be resized"
    )
      .choices(filterChoices)
      .argParser(parseFilter)
      .default("gif,jpeg,jpg,png,webp")
  )
  .addOption(
    new CommanderOption(
      "--formats <formats>",
      "formats at which images will be transcoded"
    )
      .choices(formatChoices)
      .argParser(parseFormats)
      .default("original,webp")
  )
  .option(
    "--quality <quality>",
    "quality at which images will be transcoded",
    parseQuality,
    "80"
  )
  .requiredOption(
    "--sizes <sizes>",
    "sizes at which images will be resized (example: 640x360,1280x720,1920x1080)",
    parseSizes
  )
  .option("--without-enlargement", "do not enlarge images")
  .addOption(
    new CommanderOption("--fit <fit>", "fit at which images will be resized")
      .choices(sharpFits)
      .default("outside")
  )
  .option(
    "--dest <destination>",
    "path to resized image folder (default: source)"
  )
  .option("--content-hash", "append content hash to filenames")
  .option("--manifest", "generate resized image manifest")
  .addOption(
    new CommanderOption(
      "--manifest-dest <destination>",
      "path to resized image manifest file (default: source/manifest.json)"
    ).argParser(parseManifestDest)
  )
  .option("--blurhash", "compute image blurhash")
  .option("--purge", "purge resized image folder")
  .option("--watch", "watch source for changes")
  .option("--verbose", "show more debug info")
  .option("--yes", "skip confirmation prompt")

program.parse(process.argv)

const options = program.opts() as SharpWatchOptions

const optionsSrc = resolve(process.cwd(), options.src)
if (existsSync(optionsSrc) === false) {
  throw new Error("Source folder doesn’t exist")
}
const optionsFilter = options.filter.split(",") as Filter[]
const optionsFormats = options.formats.split(",") as Format[]
const optionsQuality = parseInt(options.quality)
const optionsSizes = options.sizes.split(",")
const optionsWithoutEnlargement = options.withoutEnlargement
const optionsFit = options.fit as Fit
const optionsDest = options.dest
  ? resolve(process.cwd(), options.dest)
  : optionsSrc
const optionsContentHash = options.contentHash
const optionsManifest = options.manifest
const optionsManifestDest = options.manifestDest
  ? resolve(process.cwd(), options.manifestDest)
  : `${optionsSrc}/manifest.json`
const optionsBlurhash = options.blurhash
const optionsPurge = options.purge
const optionsWatch = options.watch
const optionsVerbose = options.verbose
const optionsYes = options.yes

const fileFilters: string[] = []
for (const format of optionsFilter) {
  fileFilters.push(`*${format}`)
}

const resizedImageRegExp = new RegExp(
  `-[0-9]+x[0-9]+(\\.[a-f0-9]{8})?\\.(${optionsFilter.join("|")})$`
)

interface Manifest {
  [path: string]: {
    [format: string]: {
      [size: string]: {
        width: number
        height: number
        ratio: number
        fileSize: number
        color: string
        contentHash: string
        blurhash?: string
      }
    }
  }
}

const manifest: Manifest = {}

if (!existsSync(optionsManifestDest)) {
  ensureDir(dirname(optionsManifestDest))
} else {
  Object.assign(manifest, JSON.parse(readFileSync(optionsManifestDest, "utf8")))
}

const getResizedImagePath = function (
  path: string,
  format: string,
  size: string
) {
  const extension = extname(path)
  const extensionRegExp = new RegExp(`${extension}$`)
  let resizedImagePath: string
  if (format && format !== "original") {
    resizedImagePath = path.replace(extensionRegExp, `-${size}.${format}`)
  } else {
    resizedImagePath = path.replace(extensionRegExp, `-${size}${extension}`)
  }
  return resizedImagePath
}

const getContentHashedImagePath = function (path: string, contentHash: string) {
  const extension = extname(path)
  const extensionRegExp = new RegExp(`${extension}$`)
  return path.replace(extensionRegExp, `.${contentHash}${extension}`)
}

const getGlobedImagePath = function (path: string) {
  const extension = extname(path)
  const extensionRegExp = new RegExp(`${extension}$`)
  return path.replace(extensionRegExp, `*${extension}`)
}

interface RGBColor {
  r: number
  g: number
  b: number
}

const getHexColor = function (rgbColor: RGBColor) {
  const { r, g, b } = rgbColor
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16)
        return hex.length === 1 ? "0" + hex : hex
      })
      .join("")
  )
}

const addToManifest = async function (
  path: string,
  format: string,
  size: string,
  image: Sharp,
  outputInfo: OutputInfo,
  contentHash: string,
  blurhash?: string
) {
  const { dominant } = await image.stats()
  const color = getHexColor(dominant)
  if (!manifest[path]) {
    manifest[path] = {}
  }
  if (!manifest[path][format]) {
    manifest[path][format] = {}
  }
  manifest[path][format][size] = {
    width: outputInfo.width,
    height: outputInfo.height,
    ratio: outputInfo.width / outputInfo.height,
    fileSize: outputInfo.size,
    color: color,
    contentHash: contentHash,
    blurhash: blurhash,
  }
}

const getDivisor = function (number: number, gt: number) {
  let divisor = 1
  while (divisor <= number) {
    divisor++
    if (number / divisor < gt) {
      break
    }
  }
  return divisor
}

const getBlurhash = async function (
  image: Sharp,
  width: number,
  height: number
) {
  const divisor = getDivisor(width, 20)
  const { data, info } = await image
    .resize(Math.round(width / divisor), Math.round(height / divisor), {
      fit: optionsFit,
      withoutEnlargement: optionsWithoutEnlargement,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const blurhash = await encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  )
  return blurhash
}

const removeFromManifest = async function (path: string) {
  if (manifest[path]) {
    delete manifest[path]
  }
}

const saveManifest = async function () {
  await writeFile(optionsManifestDest, JSON.stringify(manifest, null, 2))
}

const getResizedImagePaths = async function (path: string) {
  const dir = dirname(path)
  const base = basename(path)
  const ext = extname(path)
  const fileFilter = base.replace(ext, `*${ext}`)
  const readdirpOptions: ReaddirpOptions = {
    depth: 1,
    fileFilter: fileFilter,
  }
  const paths: string[] = []
  for await (const file of readdirp(dir, readdirpOptions)) {
    paths.push(file.fullPath)
  }
  return paths
}

const resizeImage = async function (
  fullPath: string,
  batch: boolean = false,
  override: boolean = false
) {
  try {
    if (batch === false) {
      console.info("Resizing image…")
    }
    const relativePath = relative(optionsSrc, fullPath)
    const relativeDirectoryName = dirname(relativePath)
    for (const format of optionsFormats) {
      for (const size of optionsSizes) {
        const resizedImageRelativePath = getResizedImagePath(
          relativePath,
          format,
          size
        )
        const resizedImageFullPath = join(optionsDest, resizedImageRelativePath)
        const resizedImageFullPaths = await getResizedImagePaths(
          resizedImageFullPath
        )
        if (override === true || resizedImageFullPaths.length === 0) {
          const resizedImageDirname = join(optionsDest, relativeDirectoryName)
          await ensureDir(resizedImageDirname)
          const width = parseInt(size.split("x")[0])
          const height = parseInt(size.split("x")[1])
          const image = sharp(fullPath)
          image.resize(width, height, {
            fit: optionsFit,
            withoutEnlargement: optionsWithoutEnlargement,
          })
          const imageBlurhash = image.clone()
          if (format && format !== "original") {
            image.toFormat(format, {
              quality: optionsQuality,
            })
          }
          const { data, info } = await image.toBuffer({
            resolveWithObject: true,
          })
          const contentHash = createHash("md4")
            .update(data)
            .digest("hex")
            .slice(0, 8)
          if (optionsContentHash) {
            await writeFile(
              getContentHashedImagePath(resizedImageFullPath, contentHash),
              data
            )
          } else {
            await writeFile(resizedImageFullPath, data)
          }
          if (optionsManifest === true) {
            let blurhash: string
            if (optionsBlurhash === true) {
              blurhash = await getBlurhash(imageBlurhash, width, height)
            }
            await addToManifest(
              relativePath,
              format,
              size,
              image,
              info,
              contentHash,
              blurhash
            )
          }
        }
      }
    }
    if (batch === false) {
      if (optionsManifest === true) {
        await saveManifest()
      }
      console.info(chalk.green("Resized image successfully!"))
    }
  } catch (error) {
    if (optionsVerbose) {
      throw error
    } else {
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  }
}

const removeImage = async function (fullPath: string) {
  try {
    console.info("Removing resized image…")
    const relativePath = relative(optionsSrc, fullPath)
    for (const format of optionsFormats) {
      for (const size of optionsSizes) {
        const resizedImageRelativePath = getResizedImagePath(
          relativePath,
          format,
          size
        )
        const resizedImageFullPath = join(optionsDest, resizedImageRelativePath)
        const resizedImageFullPaths = await getResizedImagePaths(
          resizedImageFullPath
        )
        for (const path of resizedImageFullPaths) {
          await unlink(path)
        }
      }
    }
    if (optionsManifest === true) {
      await removeFromManifest(relativePath)
      await saveManifest()
    }
    console.info(chalk.green("Removed resized image successfully!"))
  } catch (error) {
    if (optionsVerbose) {
      throw error
    } else {
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  }
}

if (optionsWatch) {
  let paths: string[] = []
  for (const fileFilter of fileFilters) {
    paths.push(`${optionsSrc}/**/${fileFilter}`)
  }
  chokidar
    .watch(paths, {
      ignoreInitial: true,
      ignored: resizedImageRegExp,
    })
    .on("add", (path) => {
      resizeImage(path, false, false)
    })
    .on("change", (path) => {
      resizeImage(path, false, true)
    })
    .on("unlink", (path) => {
      removeImage(path)
    })
}

const run = async function () {
  try {
    const readdirpOptions: ReaddirpOptions = {
      fileFilter: fileFilters,
    }
    let confirmation: boolean
    if (optionsPurge) {
      console.info(`Purging ${chalk.bold(optionsDest)}…`)
      if (optionsYes) {
        confirmation = true
      } else {
        const answers = await prompt([
          {
            type: "confirm",
            message: "Do you wish to proceed?",
            name: "confirmation",
            default: false,
          },
        ])
        confirmation = answers.confirmation
      }
      if (confirmation !== true) {
        console.info(chalk.yellow("Purged cancelled!"))
      } else {
        if (optionsDest !== optionsSrc) {
          await emptyDir(optionsDest)
        } else {
          for await (const file of readdirp(optionsDest, readdirpOptions)) {
            if (file.basename.match(resizedImageRegExp)) {
              await unlink(file.fullPath)
            }
          }
        }
        if (optionsManifest === true) {
          Object.keys(manifest).forEach(function (path) {
            delete manifest[path]
          })
          await saveManifest()
        }
        console.info(
          chalk.green(`Purged ${chalk.bold(optionsDest)} successfully!`)
        )
      }
    }
    console.info("Resizing images…")
    for await (const file of readdirp(optionsSrc, readdirpOptions)) {
      if (!file.basename.match(resizedImageRegExp)) {
        await resizeImage(file.fullPath, true)
      }
    }
    if (optionsManifest === true) {
      await saveManifest()
    }
    console.info(chalk.green("Resized images successfully!"))
  } catch (error) {
    if (optionsVerbose) {
      throw error
    } else {
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  }
}

run()
