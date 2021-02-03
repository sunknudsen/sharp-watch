"use strict"

import program, {
  Option as CommanderOption,
  InvalidOptionArgumentError as CommanderInvalidOptionError,
} from "commander"
import chokidar from "chokidar"
import path from "path"
import readdirp, { ReaddirpOptions } from "readdirp"
import fs from "fs-extra"
import sharp, { fit, format, FitEnum, FormatEnum } from "sharp"
import chalk from "chalk"
import inquirer from "inquirer"

const sharpFits = Object.keys(fit).sort()
const sharpFormats = Object.keys(format).sort()

const filterChoices = [...sharpFormats]
filterChoices.push("jpg")
filterChoices.sort()

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
  fit: keyof FitEnum
  withoutEnlargement?: boolean
  format?: keyof FormatEnum
  quality?: string
  dest?: string
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
    'sizes at which images will be resized (example: "640x360,1280x720,1920x1080")',
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
      "--format <format>",
      "format at which images will be transcoded"
    ).choices(sharpFormats)
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
  .option("--purge", "purge resized image folder")
  .option("--watch", "watch source for changes")
  .option("--verbose", "show more debug info")
  .option("--yes", "skip confirmation prompt")

program.parse(process.argv)

const options = program.opts() as SharpWatchOptions

const optionsSrc = path.resolve(process.cwd(), options.src)
if (!fs.existsSync(optionsSrc)) {
  throw new Error("Source folder doesn’t exist")
}
const optionsFilter = options.filter.split(",")
const optionsSizes = options.sizes.split(",")
const optionsWithoutEnlargement = options.withoutEnlargement
const optionsFit = options.fit
const optionsFormat = options.format
const optionsQuality = parseInt(options.quality)
const optionsDest = options.dest
  ? path.resolve(process.cwd(), options.dest)
  : optionsSrc
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

const resize = async function (fullPath: string, batch: boolean = false) {
  try {
    if (!batch) {
      console.info("Resizing image…")
    }
    const extension = path.extname(fullPath)
    const relativePath = path.relative(optionsSrc, fullPath)
    const relativeDirectoryName = path.dirname(relativePath)
    for (const size of optionsSizes) {
      const destinationPath = path.resolve(
        optionsDest,
        relativePath.replace(extension, `-${size}${extension}`)
      )
      // Check if file exits and, if so, skip
      if (!fs.existsSync(destinationPath)) {
        await fs.ensureDir(path.resolve(optionsDest, relativeDirectoryName))
        const image = sharp(fullPath).resize(
          parseInt(size.split("x")[0]),
          parseInt(size.split("x")[1]),
          {
            fit: optionsFit,
            withoutEnlargement: optionsWithoutEnlargement,
          }
        )
        if (optionsFormat) {
          await image
            .toFormat(optionsFormat, {
              quality: optionsQuality,
            })
            .toFile(
              destinationPath.replace(/\.[a-zA-Z]{2,4}$/, `.${optionsFormat}`)
            )
        } else {
          await image.toFile(destinationPath)
        }
      }
    }
    if (!batch) {
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
      const destinationPath = path.resolve(
        optionsDest,
        relativePath.replace(extension, `-${size}${extension}`)
      )
      await fs.unlink(destinationPath)
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
