"use strict"

import program from "commander"
import chokidar from "chokidar"
import path from "path"
import readdirp, { ReaddirpOptions } from "readdirp"
import { promisify } from "util"
import fs from "fs-extra"
import sharp from "sharp"
import chalk from "chalk"

const unlinkAsync = promisify(fs.unlink)
const removeAsync = promisify(fs.remove)
const ensureDirAsync = promisify(fs.ensureDir)

program
  .requiredOption("--src <source>", "path to image folder")
  .requiredOption(
    "--sizes <sizes>",
    'sizes at which images should be resized (example: "1280x720,1920x1080")'
  )
  .option("--fit <fit>", "selected fit for images within size", "outside")
  .option("--without-enlargement", "disable image enlargement")
  .option(
    "--dest <destination>",
    "path to resized image folder (default: source)"
  )
  .option("--purge", "purge resized images before running")
  .option("--watch", "watch source for changes")

program.parse(process.argv)

const src = path.resolve(process.cwd(), program.src)

const dest = program.dest ? path.resolve(process.cwd(), program.dest) : src

const fileFilter = ["*.jpg", "*.png", "*.webp"]

const resizedImageRegExp = /-[0-9]+x[0-9]+\.(jpg|png|webp)$/

var sizes: string[] = program.sizes.split(",")
for (const size of sizes) {
  if (!size.match(/^[0-9]+x[0-9]+$/)) {
    console.error(chalk.red("Invalid sizes"))
    process.exit(1)
  }
}

if (!program.fit.match(/^(cover|contain|fill|inside|outside)$/)) {
  console.error(chalk.red("Invalid fit"))
  process.exit(1)
}

const resize = async function(fullPath: string, batch: boolean = false) {
  if (!batch) {
    console.info("Resizing image...")
  }
  const extension = path.extname(fullPath)
  const relativePath = path.relative(src, fullPath)
  const relativeDirectoryName = path.dirname(relativePath)
  for (const size of sizes) {
    const destinationPath = path.resolve(
      dest,
      relativePath.replace(extension, `-${size}${extension}`)
    )
    // Check if file exits and, if so, skip
    if (!fs.existsSync(destinationPath)) {
      await ensureDirAsync(path.resolve(dest, relativeDirectoryName), null)
      await sharp(fullPath)
        .resize(parseInt(size.split("x")[0]), parseInt(size.split("x")[1]), {
          fit: program.fit,
          withoutEnlargement: program.withoutEnlargement,
        })
        .toFile(destinationPath)
    }
  }
  if (!batch) {
    console.info(chalk.green("Resized image successfully!"))
  }
}

const remove = async function(fullPath: string) {
  try {
    console.info("Removing resized image...")
    const extension = path.extname(fullPath)
    const relativePath = path.relative(src, fullPath)
    for (const size of sizes) {
      const destinationPath = path.resolve(
        dest,
        relativePath.replace(extension, `-${size}${extension}`)
      )
      await unlinkAsync(destinationPath)
    }
    console.info(chalk.green("Removed resized image successfully!"))
  } catch (error) {
    console.error(chalk.red(error))
    process.exit(1)
  }
}

if (program.watch) {
  let paths: string[] = []
  for (const filter of fileFilter) {
    paths.push(`${src}/**/${filter}`)
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

const run = async function() {
  const options: ReaddirpOptions = {
    fileFilter: fileFilter,
  }
  if (program.purge) {
    if (dest !== src) {
      await removeAsync(dest)
    } else {
      for await (const file of readdirp(src, options)) {
        if (file.basename.match(resizedImageRegExp)) {
          await unlinkAsync(file.fullPath)
        }
      }
    }
  }
  try {
    if (!fs.existsSync(src)) {
      throw new Error("Source doesn’t exist")
    }
    console.info("Resizing images...")
    const options: ReaddirpOptions = {
      fileFilter: fileFilter,
    }
    for await (const file of readdirp(src, options)) {
      if (!file.basename.match(resizedImageRegExp)) {
        await resize(file.fullPath, true)
      }
    }
    console.info(chalk.green("Resized images successfully!"))
  } catch (error) {
    console.error(chalk.red(error.message))
    process.exit(1)
  }
}

run()
