"use strict"

import program, {
  Option as CommanderOption,
  InvalidOptionArgumentError as CommanderInvalidOptionError,
} from "commander"
import chokidar from "chokidar"
import path from "path"
import readdirp, { ReaddirpOptions } from "readdirp"
import fs from "fs-extra"
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
import inquirer from "inquirer"

const sharpFits = Object.keys(fit).sort()
const sharpFormats = Object.keys(format).sort()

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

interface SharpWatchOptions {
  src: string
  filter: string
  sizes: string
  withoutEnlargement?: boolean
  fit: string
  formats?: string
  quality?: string
  dest?: string
  meta?: boolean
  metaBlurhash?: boolean
  metaDest?: string
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
  .option(
    "--dest <destination>",
    "path to resized image folder (default: source)"
  )
  .option("--meta", "compute resized image metadata")
  .option("--meta-blurhash", "compute image blurhash")
  .option(
    "--meta-dest <destination>",
    "path to resized image metadata file (default: source/metadata.json)"
  )
  .option("--purge", "purge resized image folder")
  .option("--watch", "watch source for changes")
  .option("--verbose", "show more debug info")
  .option("--yes", "skip confirmation prompt")

program.parse(process.argv)

const options = program.opts() as SharpWatchOptions

const optionsSrc = path.resolve(process.cwd(), options.src)
if (fs.existsSync(optionsSrc) === false) {
  throw new Error("Source folder doesn’t exist")
}
const optionsFilter = options.filter.split(",") as Filter[]
const optionsSizes = options.sizes.split(",")
const optionsWithoutEnlargement = options.withoutEnlargement
const optionsFit = options.fit as keyof FitEnum
const optionsFormats = options.formats.split(",") as Format[]
const optionsQuality = parseInt(options.quality)
const optionsDest = options.dest
  ? path.resolve(process.cwd(), options.dest)
  : optionsSrc
const optionsMeta = options.meta
const optionsMetaBlurhash = options.metaBlurhash
const optionsMetaDest = options.metaDest
  ? path.resolve(process.cwd(), options.metaDest)
  : `${optionsSrc}/metadata.json`
const optionsPurge = options.purge
const optionsWatch = options.watch
const optionsVerbose = options.verbose
const optionsYes = options.yes

const fileFilters: string[] = []
for (const format of optionsFilter) {
  fileFilters.push(`*${format}`)
}

const resizedImageRegExp = new RegExp(
  `-[0-9]+x[0-9]+\\.(${optionsFilter.join("|")})$`
)

const getResizedImagePath = function (
  extension: string,
  format: string,
  relativePath: string,
  size: string
) {
  const extensionRegExp = new RegExp(`${extension}$`)
  let resizedImagePath: string
  if (format && format !== "original") {
    resizedImagePath = path.resolve(
      optionsDest,
      relativePath.replace(extensionRegExp, `-${size}.${format}`)
    )
  } else {
    resizedImagePath = path.resolve(
      optionsDest,
      relativePath.replace(extensionRegExp, `-${size}${extension}`)
    )
  }
  return resizedImagePath
}

const getRelativeResizedImagePath = function (resizedImagePath: string) {
  return resizedImagePath.replace(`${optionsDest}/`, "")
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

interface Metadata {
  [index: string]: {
    width: number
    height: number
    ratio: number
    fileSize: number
    contentHash: string
    color: string
    blurhash?: string
  }
}

const metadata: Metadata = {}

const upsertMetadata = async function (
  resizedFullPath: string,
  image: Sharp,
  outputInfo: OutputInfo,
  blurhash?: string
) {
  const relativeDestinationPath = getRelativeResizedImagePath(resizedFullPath)
  const resizedImage = await fs.readFile(resizedFullPath)
  const { dominant } = await image.stats()
  metadata[relativeDestinationPath] = {
    width: outputInfo.width,
    height: outputInfo.height,
    ratio: outputInfo.width / outputInfo.height,
    fileSize: outputInfo.size,
    contentHash: createHash("md4")
      .update(resizedImage)
      .digest("hex")
      .slice(0, 8),
    color: getHexColor(dominant),
    blurhash: blurhash,
  }
}

const getBlurhash = async function (image: Sharp) {
  const sharpMetadata = await image.metadata()
  const { data, info } = await image
    .raw()
    .ensureAlpha()
    .resize(
      Math.round(sharpMetadata.width / 10),
      Math.round(sharpMetadata.height / 10),
      {
        fit: optionsFit,
      }
    )
    .toBuffer({ resolveWithObject: true })
  return await encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  )
}

const deleteMetadata = async function (resizedFullPath: string) {
  const relativeDestinationPath = getRelativeResizedImagePath(resizedFullPath)
  delete metadata[relativeDestinationPath]
}

const writeMetadata = async function () {
  await fs.writeFile(optionsMetaDest, JSON.stringify(metadata, null, 2))
}

const resize = async function (fullPath: string, batch: boolean = false) {
  try {
    if (batch === false) {
      console.info("Resizing image…")
    }
    const extension = path.extname(fullPath)
    const relativePath = path.relative(optionsSrc, fullPath)
    const relativeDirectoryName = path.dirname(relativePath)
    for (const size of optionsSizes) {
      for (const format of optionsFormats) {
        const resizedImagePath = getResizedImagePath(
          extension,
          format,
          relativePath,
          size
        )
        // Check if file exits and, if so, skip
        if (fs.existsSync(resizedImagePath) === false) {
          await fs.ensureDir(path.resolve(optionsDest, relativeDirectoryName))
          const image = sharp(fullPath)
          const imageBlurhash = image.clone()
          image.resize(
            parseInt(size.split("x")[0]),
            parseInt(size.split("x")[1]),
            {
              fit: optionsFit,
              withoutEnlargement: optionsWithoutEnlargement,
            }
          )
          if (format && format !== "original") {
            image.toFormat(format, {
              quality: optionsQuality,
            })
          }
          const outputInfo = await image.toFile(resizedImagePath)
          if (optionsMeta === true) {
            let blurhash: string | undefined = undefined
            if (optionsMetaBlurhash === true) {
              blurhash = await getBlurhash(imageBlurhash)
            }
            await upsertMetadata(resizedImagePath, image, outputInfo, blurhash)
          }
        }
      }
    }
    if (batch === false) {
      if (optionsMeta === true) {
        await writeMetadata()
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

const remove = async function (fullPath: string) {
  try {
    console.info("Removing resized image…")
    const extension = path.extname(fullPath)
    const relativePath = path.relative(optionsSrc, fullPath)
    for (const size of optionsSizes) {
      for (const format of optionsFormats) {
        const resizedImagePath = getResizedImagePath(
          extension,
          format,
          relativePath,
          size
        )
        await fs.unlink(resizedImagePath)
        if (optionsMeta === true) {
          await deleteMetadata(resizedImagePath)
        }
      }
    }
    if (optionsMeta === true) {
      await writeMetadata()
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
    .on("add", resize)
    .on("change", resize)
    .on("unlink", remove)
}

const run = async function () {
  try {
    const readdirOptions: ReaddirpOptions = {
      fileFilter: fileFilters,
    }
    let confirmation: boolean
    if (optionsPurge) {
      console.info(`Purging ${chalk.bold(optionsDest)}…`)
      if (optionsYes) {
        confirmation = true
      } else {
        const answers = await inquirer.prompt([
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
          await fs.emptyDir(optionsDest)
        } else {
          for await (const file of readdirp(optionsDest, readdirOptions)) {
            if (file.basename.match(resizedImageRegExp)) {
              await fs.unlink(file.fullPath)
            }
          }
        }
        console.info(
          chalk.green(`Purged ${chalk.bold(optionsDest)} successfully!`)
        )
      }
    }
    console.info("Resizing images…")
    for await (const file of readdirp(optionsSrc, readdirOptions)) {
      if (!file.basename.match(resizedImageRegExp)) {
        await resize(file.fullPath, true)
      }
    }
    if (optionsMeta === true) {
      await writeMetadata()
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
