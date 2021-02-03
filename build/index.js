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
const commander_1 = __importStar(require("commander"));
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const readdirp_1 = __importDefault(require("readdirp"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const sharp_1 = __importStar(require("sharp"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const sharpFits = Object.keys(sharp_1.fit).sort();
const sharpFormats = Object.keys(sharp_1.format).sort();
const filterChoices = [...sharpFormats];
filterChoices.push("jpg");
filterChoices.sort();
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
const parseQuality = function (value) {
    const quality = parseInt(value);
    if (quality < 0 || quality > 100) {
        throw new commander_1.InvalidOptionArgumentError("Invalid quality");
    }
    return value;
};
commander_1.default
    .requiredOption("--src <source>", "path to image folder")
    .addOption(new commander_1.Option("--filter <filter>", "filter used to select which image formats will be resized")
    .choices(filterChoices)
    .argParser(parseFilter)
    .default("gif,jpeg,jpg,png,webp"))
    .requiredOption("--sizes <sizes>", 'sizes at which images will be resized (example: "640x360,1280x720,1920x1080")', parseSizes)
    .option("--without-enlargement", "do not enlarge images")
    .addOption(new commander_1.Option("--fit <fit>", "fit at which images will be resized")
    .choices(sharpFits)
    .default("outside"))
    .addOption(new commander_1.Option("--format <format>", "format at which images will be transcoded").choices(sharpFormats))
    .option("--quality <quality>", "quality at which images will be transcoded", parseQuality, "80")
    .option("--dest <destination>", "path to resized image folder (default: source)")
    .option("--purge", "purge resized image folder")
    .option("--watch", "watch source for changes")
    .option("--verbose", "show more debug info")
    .option("--yes", "skip confirmation prompt");
commander_1.default.parse(process.argv);
const options = commander_1.default.opts();
const optionsSrc = path_1.default.resolve(process.cwd(), options.src);
if (!fs_extra_1.default.existsSync(optionsSrc)) {
    throw new Error("Source folder doesn’t exist");
}
const optionsFilter = options.filter.split(",");
const optionsSizes = options.sizes.split(",");
const optionsWithoutEnlargement = options.withoutEnlargement;
const optionsFit = options.fit;
const optionsFormat = options.format;
const optionsQuality = parseInt(options.quality);
const optionsDest = options.dest
    ? path_1.default.resolve(process.cwd(), options.dest)
    : optionsSrc;
const optionsPurge = options.purge;
const optionsWatch = options.watch;
const optionsVerbose = options.verbose;
const optionsYes = options.yes;
const fileFilters = [];
for (const format of optionsFilter) {
    fileFilters.push(`*${format}`);
}
const resizedImageRegExp = new RegExp(`-[0-9]+x[0-9]+\\.(${optionsFilter.join("|")})$`);
const resize = async function (fullPath, batch = false) {
    try {
        if (!batch) {
            console.info("Resizing image…");
        }
        const extension = path_1.default.extname(fullPath);
        const relativePath = path_1.default.relative(optionsSrc, fullPath);
        const relativeDirectoryName = path_1.default.dirname(relativePath);
        for (const size of optionsSizes) {
            const destinationPath = path_1.default.resolve(optionsDest, relativePath.replace(extension, `-${size}${extension}`));
            // Check if file exits and, if so, skip
            if (!fs_extra_1.default.existsSync(destinationPath)) {
                await fs_extra_1.default.ensureDir(path_1.default.resolve(optionsDest, relativeDirectoryName));
                const image = sharp_1.default(fullPath).resize(parseInt(size.split("x")[0]), parseInt(size.split("x")[1]), {
                    fit: optionsFit,
                    withoutEnlargement: optionsWithoutEnlargement,
                });
                if (optionsFormat) {
                    await image
                        .toFormat(optionsFormat, {
                        quality: optionsQuality,
                    })
                        .toFile(destinationPath.replace(/\.[a-zA-Z]{2,4}$/, `.${optionsFormat}`));
                }
                else {
                    await image.toFile(destinationPath);
                }
            }
        }
        if (!batch) {
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
const remove = async function (fullPath) {
    try {
        console.info("Removing resized image…");
        const extension = path_1.default.extname(fullPath);
        const relativePath = path_1.default.relative(optionsSrc, fullPath);
        for (const size of optionsSizes) {
            const destinationPath = path_1.default.resolve(optionsDest, relativePath.replace(extension, `-${size}${extension}`));
            await fs_extra_1.default.unlink(destinationPath);
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
        .on("add", resize)
        .on("change", resize)
        .on("unlink", remove);
}
const run = async function () {
    var e_1, _a, e_2, _b;
    try {
        const readdirOptions = {
            fileFilter: fileFilters,
        };
        let confirmation;
        if (optionsPurge) {
            console.info(`Purging ${chalk_1.default.bold(optionsDest)}…`);
            if (optionsYes) {
                confirmation = true;
            }
            else {
                const answers = await inquirer_1.default.prompt([
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
                    await fs_extra_1.default.emptyDir(optionsDest);
                }
                else {
                    try {
                        for (var _c = __asyncValues(readdirp_1.default(optionsDest, readdirOptions)), _d; _d = await _c.next(), !_d.done;) {
                            const file = _d.value;
                            if (file.basename.match(resizedImageRegExp)) {
                                await fs_extra_1.default.unlink(file.fullPath);
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_a = _c.return)) await _a.call(_c);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                console.info(chalk_1.default.green(`Purged ${chalk_1.default.bold(optionsDest)} successfully!`));
            }
        }
        console.info("Resizing images…");
        try {
            for (var _e = __asyncValues(readdirp_1.default(optionsSrc, readdirOptions)), _f; _f = await _e.next(), !_f.done;) {
                const file = _f.value;
                if (!file.basename.match(resizedImageRegExp)) {
                    await resize(file.fullPath, true);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) await _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
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