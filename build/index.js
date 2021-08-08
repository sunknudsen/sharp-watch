"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = require("path");
const readdirp_1 = __importDefault(require("readdirp"));
const fs_extra_1 = require("fs-extra");
const sharp_1 = __importStar(require("sharp"));
const crypto_1 = require("crypto");
const blurhash_1 = require("blurhash");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = require("inquirer");
const sharpFits = Object.keys(sharp_1.fit).sort();
const sharpFormats = Object.keys(sharp_1.format).sort();
const filterChoices = [...sharpFormats];
filterChoices.push("jpg");
filterChoices.sort();
const formatChoices = [...sharpFormats];
formatChoices.push("original");
formatChoices.sort();
const parseFilter = function (value) {
    const filters = value.split(",");
    for (const filter of filters) {
        if (filterChoices.indexOf(filter) === -1) {
            throw new commander_1.InvalidOptionArgumentError("Invalid filter");
        }
    }
    return value;
};
const parseSizes = function (value) {
    const sizes = value.split(",");
    for (const size of sizes) {
        if (!size.match(/^[0-9]+x[0-9]+$/)) {
            throw new commander_1.InvalidOptionArgumentError("Invalid sizes");
        }
    }
    return value;
};
const parseFormats = function (value) {
    const formats = value.split(",");
    for (const format of formats) {
        if (formatChoices.indexOf(format) === -1) {
            throw new commander_1.InvalidOptionArgumentError("Invalid format");
        }
    }
    return value;
};
const parseQuality = function (value) {
    const quality = parseInt(value);
    if (quality < 0 || quality > 100) {
        throw new commander_1.InvalidOptionArgumentError("Invalid quality");
    }
    return value;
};
const parseManifestDest = function (value) {
    if (!value.match(/\.json$/)) {
        throw new commander_1.InvalidOptionArgumentError("Invalid meta dest");
    }
    return value;
};
commander_1.program
    .requiredOption("--src <source>", "path to image folder")
    .addOption(new commander_1.Option("--filter <filter>", "filter used to select which image formats will be resized")
    .choices(filterChoices)
    .argParser(parseFilter)
    .default("gif,jpeg,jpg,png,webp"))
    .addOption(new commander_1.Option("--formats <formats>", "formats at which images will be transcoded")
    .choices(formatChoices)
    .argParser(parseFormats)
    .default("original,webp"))
    .option("--quality <quality>", "quality at which images will be transcoded", parseQuality, "80")
    .requiredOption("--sizes <sizes>", "sizes at which images will be resized (example: 640x360,1280x720,1920x1080)", parseSizes)
    .option("--without-enlargement", "do not enlarge images")
    .addOption(new commander_1.Option("--fit <fit>", "fit at which images will be resized")
    .choices(sharpFits)
    .default("outside"))
    .option("--dest <destination>", "path to resized image folder (default: source)")
    .option("--content-hash", "append content hash to filenames")
    .option("--manifest", "generate resized image manifest")
    .addOption(new commander_1.Option("--manifest-dest <destination>", "path to resized image manifest file (default: source/manifest.json)").argParser(parseManifestDest))
    .option("--blurhash", "compute image blurhash")
    .option("--purge", "purge resized image folder")
    .option("--watch", "watch source for changes")
    .option("--verbose", "show more debug info")
    .option("--yes", "skip confirmation prompt");
commander_1.program.parse(process.argv);
const options = commander_1.program.opts();
const optionsSrc = path_1.resolve(process.cwd(), options.src);
if (fs_extra_1.existsSync(optionsSrc) === false) {
    throw new Error("Source folder doesn’t exist");
}
const optionsFilter = options.filter.split(",");
const optionsFormats = options.formats.split(",");
const optionsQuality = parseInt(options.quality);
const optionsSizes = options.sizes.split(",");
const optionsWithoutEnlargement = options.withoutEnlargement;
const optionsFit = options.fit;
const optionsDest = options.dest
    ? path_1.resolve(process.cwd(), options.dest)
    : optionsSrc;
const optionsContentHash = options.contentHash;
const optionsManifest = options.manifest;
const optionsManifestDest = options.manifestDest
    ? path_1.resolve(process.cwd(), options.manifestDest)
    : `${optionsSrc}/manifest.json`;
const optionsBlurhash = options.blurhash;
const optionsPurge = options.purge;
const optionsWatch = options.watch;
const optionsVerbose = options.verbose;
const optionsYes = options.yes;
const fileFilters = [];
for (const format of optionsFilter) {
    fileFilters.push(`*${format}`);
}
const resizedImageRegExp = new RegExp(`-[0-9]+x[0-9]+(\\.[a-f0-9]{8})?\\.(${optionsFilter.join("|")})$`);
const manifest = {};
if (!fs_extra_1.existsSync(optionsManifestDest)) {
    fs_extra_1.ensureDir(path_1.dirname(optionsManifestDest));
}
else {
    Object.assign(manifest, JSON.parse(fs_extra_1.readFileSync(optionsManifestDest, "utf8")));
}
const getResizedImagePath = function (path, format, size) {
    const extension = path_1.extname(path);
    const extensionRegExp = new RegExp(`${extension}$`);
    let resizedImagePath;
    if (format && format !== "original") {
        resizedImagePath = path.replace(extensionRegExp, `-${size}.${format}`);
    }
    else {
        resizedImagePath = path.replace(extensionRegExp, `-${size}${extension}`);
    }
    return resizedImagePath;
};
const getContentHashedImagePath = function (path, contentHash) {
    const extension = path_1.extname(path);
    const extensionRegExp = new RegExp(`${extension}$`);
    return path.replace(extensionRegExp, `.${contentHash}${extension}`);
};
const getGlobedImagePath = function (path) {
    const extension = path_1.extname(path);
    const extensionRegExp = new RegExp(`${extension}$`);
    return path.replace(extensionRegExp, `*${extension}`);
};
const getHexColor = function (rgbColor) {
    const { r, g, b } = rgbColor;
    return ("#" +
        [r, g, b]
            .map((x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        })
            .join(""));
};
const addToManifest = async function (path, format, size, image, outputInfo, contentHash, blurhash) {
    const { dominant } = await image.stats();
    const color = getHexColor(dominant);
    if (!manifest[path]) {
        manifest[path] = {};
    }
    if (!manifest[path][format]) {
        manifest[path][format] = {};
    }
    manifest[path][format][size] = {
        width: outputInfo.width,
        height: outputInfo.height,
        ratio: outputInfo.width / outputInfo.height,
        fileSize: outputInfo.size,
        mediaType: `image/${outputInfo.format}`,
        color: color,
        contentHash: contentHash,
        blurhash: blurhash,
    };
};
const getDivisor = function (number, gt) {
    let divisor = 1;
    while (divisor <= number) {
        divisor++;
        if (number / divisor < gt) {
            break;
        }
    }
    return divisor;
};
const getBlurhash = async function (image, width, height) {
    const divisor = getDivisor(width, 20);
    const { data, info } = await image
        .resize(Math.round(width / divisor), Math.round(height / divisor), {
        fit: optionsFit,
        withoutEnlargement: optionsWithoutEnlargement,
    })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const blurhash = await blurhash_1.encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
    return blurhash;
};
const removeFromManifest = async function (path) {
    if (manifest[path]) {
        delete manifest[path];
    }
};
const saveManifest = async function () {
    await fs_extra_1.writeFile(optionsManifestDest, JSON.stringify(manifest, null, 2));
};
const getResizedImagePaths = async function (path) {
    var e_1, _a;
    const dir = path_1.dirname(path);
    const base = path_1.basename(path);
    const ext = path_1.extname(path);
    const fileFilter = base.replace(ext, `*${ext}`);
    const readdirpOptions = {
        depth: 1,
        fileFilter: fileFilter,
    };
    const paths = [];
    try {
        for (var _b = __asyncValues(readdirp_1.default(dir, readdirpOptions)), _c; _c = await _b.next(), !_c.done;) {
            const file = _c.value;
            paths.push(file.fullPath);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return paths;
};
const resizeImage = async function (fullPath, batch = false, override = false) {
    try {
        if (batch === false) {
            console.info("Resizing image…");
        }
        const relativePath = path_1.relative(optionsSrc, fullPath);
        const relativeDirectoryName = path_1.dirname(relativePath);
        for (const format of optionsFormats) {
            for (const size of optionsSizes) {
                const resizedImageRelativePath = getResizedImagePath(relativePath, format, size);
                const resizedImageFullPath = path_1.join(optionsDest, resizedImageRelativePath);
                const resizedImageFullPaths = await getResizedImagePaths(resizedImageFullPath);
                if (override === true || resizedImageFullPaths.length === 0) {
                    const resizedImageDirname = path_1.join(optionsDest, relativeDirectoryName);
                    await fs_extra_1.ensureDir(resizedImageDirname);
                    const width = parseInt(size.split("x")[0]);
                    const height = parseInt(size.split("x")[1]);
                    const image = sharp_1.default(fullPath);
                    image.resize(width, height, {
                        fit: optionsFit,
                        withoutEnlargement: optionsWithoutEnlargement,
                    });
                    const imageBlurhash = image.clone();
                    if (format && format !== "original") {
                        image.toFormat(format, {
                            quality: optionsQuality,
                        });
                    }
                    const { data, info } = await image.toBuffer({
                        resolveWithObject: true,
                    });
                    const contentHash = crypto_1.createHash("md4")
                        .update(data)
                        .digest("hex")
                        .slice(0, 8);
                    if (optionsContentHash) {
                        await fs_extra_1.writeFile(getContentHashedImagePath(resizedImageFullPath, contentHash), data);
                    }
                    else {
                        await fs_extra_1.writeFile(resizedImageFullPath, data);
                    }
                    if (optionsManifest === true) {
                        let blurhash;
                        if (optionsBlurhash === true) {
                            blurhash = await getBlurhash(imageBlurhash, width, height);
                        }
                        await addToManifest(relativePath, format, size, image, info, contentHash, blurhash);
                    }
                }
            }
        }
        if (batch === false) {
            if (optionsManifest === true) {
                await saveManifest();
            }
            console.info(chalk_1.default.green("Resized image successfully!"));
        }
    }
    catch (error) {
        if (optionsVerbose) {
            throw error;
        }
        else {
            console.error(chalk_1.default.red(error.message));
            process.exit(1);
        }
    }
};
const removeImage = async function (fullPath) {
    try {
        console.info("Removing resized image…");
        const relativePath = path_1.relative(optionsSrc, fullPath);
        for (const format of optionsFormats) {
            for (const size of optionsSizes) {
                const resizedImageRelativePath = getResizedImagePath(relativePath, format, size);
                const resizedImageFullPath = path_1.join(optionsDest, resizedImageRelativePath);
                const resizedImageFullPaths = await getResizedImagePaths(resizedImageFullPath);
                for (const path of resizedImageFullPaths) {
                    await fs_extra_1.unlink(path);
                }
            }
        }
        if (optionsManifest === true) {
            await removeFromManifest(relativePath);
            await saveManifest();
        }
        console.info(chalk_1.default.green("Removed resized image successfully!"));
    }
    catch (error) {
        if (optionsVerbose) {
            throw error;
        }
        else {
            console.error(chalk_1.default.red(error.message));
            process.exit(1);
        }
    }
};
if (optionsWatch) {
    let paths = [];
    for (const fileFilter of fileFilters) {
        paths.push(`${optionsSrc}/**/${fileFilter}`);
    }
    chokidar_1.default
        .watch(paths, {
        ignoreInitial: true,
        ignored: resizedImageRegExp,
    })
        .on("add", (path) => {
        resizeImage(path, false, false);
    })
        .on("change", (path) => {
        resizeImage(path, false, true);
    })
        .on("unlink", (path) => {
        removeImage(path);
    });
}
const run = async function () {
    var e_2, _a, e_3, _b;
    try {
        const readdirpOptions = {
            fileFilter: fileFilters,
        };
        let confirmation;
        if (optionsPurge) {
            console.info(`Purging ${chalk_1.default.bold(optionsDest)}…`);
            if (optionsYes) {
                confirmation = true;
            }
            else {
                const answers = await inquirer_1.prompt([
                    {
                        type: "confirm",
                        message: "Do you wish to proceed?",
                        name: "confirmation",
                        default: false,
                    },
                ]);
                confirmation = answers.confirmation;
            }
            if (confirmation !== true) {
                console.info(chalk_1.default.yellow("Purged cancelled!"));
            }
            else {
                if (optionsDest !== optionsSrc) {
                    await fs_extra_1.emptyDir(optionsDest);
                }
                else {
                    try {
                        for (var _c = __asyncValues(readdirp_1.default(optionsDest, readdirpOptions)), _d; _d = await _c.next(), !_d.done;) {
                            const file = _d.value;
                            if (file.basename.match(resizedImageRegExp)) {
                                await fs_extra_1.unlink(file.fullPath);
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) await _a.call(_c);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
                if (optionsManifest === true) {
                    Object.keys(manifest).forEach(function (path) {
                        delete manifest[path];
                    });
                    await saveManifest();
                }
                console.info(chalk_1.default.green(`Purged ${chalk_1.default.bold(optionsDest)} successfully!`));
            }
        }
        console.info("Resizing images…");
        try {
            for (var _e = __asyncValues(readdirp_1.default(optionsSrc, readdirpOptions)), _f; _f = await _e.next(), !_f.done;) {
                const file = _f.value;
                if (!file.basename.match(resizedImageRegExp)) {
                    await resizeImage(file.fullPath, true);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) await _b.call(_e);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (optionsManifest === true) {
            await saveManifest();
        }
        console.info(chalk_1.default.green("Resized images successfully!"));
    }
    catch (error) {
        if (optionsVerbose) {
            throw error;
        }
        else {
            console.error(chalk_1.default.red(error.message));
            process.exit(1);
        }
    }
};
run();
//# sourceMappingURL=index.js.map