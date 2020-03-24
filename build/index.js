"use strict";
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
const commander_1 = __importDefault(require("commander"));
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const readdirp_1 = __importDefault(require("readdirp"));
const util_1 = require("util");
const fs_extra_1 = __importDefault(require("fs-extra"));
const sharp_1 = __importDefault(require("sharp"));
const chalk_1 = __importDefault(require("chalk"));
const unlinkAsync = util_1.promisify(fs_extra_1.default.unlink);
const removeAsync = util_1.promisify(fs_extra_1.default.remove);
const ensureDirAsync = util_1.promisify(fs_extra_1.default.ensureDir);
commander_1.default
    .requiredOption("--src <source>", "path to image folder")
    .requiredOption("--sizes <sizes>", 'sizes at which images should be resized (example: "1280x720,1920x1080")')
    .option("--fit <fit>", "selected fit for images within size", "outside")
    .option("--without-enlargement", "disable image enlargement")
    .option("--dest <destination>", "path to resized image folder (default: source)")
    .option("--purge", "purge resized images before running")
    .option("--watch", "watch source for changes");
commander_1.default.parse(process.argv);
const src = path_1.default.resolve(process.cwd(), commander_1.default.src);
const dest = commander_1.default.dest ? path_1.default.resolve(process.cwd(), commander_1.default.dest) : src;
const fileFilter = ["*.jpg", "*.png", "*.webp"];
const resizedImageRegExp = /-[0-9]+x[0-9]+\.(jpg|png|webp)$/;
var sizes = commander_1.default.sizes.split(",");
for (const size of sizes) {
    if (!size.match(/^[0-9]+x[0-9]+$/)) {
        console.error(chalk_1.default.red("Invalid sizes"));
        process.exit(1);
    }
}
if (!commander_1.default.fit.match(/^(cover|contain|fill|inside|outside)$/)) {
    console.error(chalk_1.default.red("Invalid fit"));
    process.exit(1);
}
const resize = async function (fullPath, batch = false) {
    if (!batch) {
        console.info("Resizing image...");
    }
    const extension = path_1.default.extname(fullPath);
    const relativePath = path_1.default.relative(src, fullPath);
    const relativeDirectoryName = path_1.default.dirname(relativePath);
    for (const size of sizes) {
        const destinationPath = path_1.default.resolve(dest, relativePath.replace(extension, `-${size}${extension}`));
        // Check if file exits and, if so, skip
        if (!fs_extra_1.default.existsSync(destinationPath)) {
            await ensureDirAsync(path_1.default.resolve(dest, relativeDirectoryName), null);
            await sharp_1.default(fullPath)
                .resize(parseInt(size.split("x")[0]), parseInt(size.split("x")[1]), {
                fit: commander_1.default.fit,
                withoutEnlargement: commander_1.default.withoutEnlargement,
            })
                .toFile(destinationPath);
        }
    }
    if (!batch) {
        console.info(chalk_1.default.green("Resized image successfully!"));
    }
};
const remove = async function (fullPath) {
    try {
        console.info("Removing resized image...");
        const extension = path_1.default.extname(fullPath);
        const relativePath = path_1.default.relative(src, fullPath);
        for (const size of sizes) {
            const destinationPath = path_1.default.resolve(dest, relativePath.replace(extension, `-${size}${extension}`));
            await unlinkAsync(destinationPath);
        }
        console.info(chalk_1.default.green("Removed resized image successfully!"));
    }
    catch (error) {
        console.error(chalk_1.default.red(error));
        process.exit(1);
    }
};
if (commander_1.default.watch) {
    let paths = [];
    for (const filter of fileFilter) {
        paths.push(`${src}/**/${filter}`);
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
    const options = {
        fileFilter: fileFilter,
    };
    if (commander_1.default.purge) {
        if (dest !== src) {
            await removeAsync(dest);
        }
        else {
            try {
                for (var _c = __asyncValues(readdirp_1.default(src, options)), _d; _d = await _c.next(), !_d.done;) {
                    const file = _d.value;
                    if (file.basename.match(resizedImageRegExp)) {
                        await unlinkAsync(file.fullPath);
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
    }
    try {
        if (!fs_extra_1.default.existsSync(src)) {
            throw new Error("Source doesn’t exist");
        }
        console.info("Resizing images...");
        const options = {
            fileFilter: fileFilter,
        };
        try {
            for (var _e = __asyncValues(readdirp_1.default(src, options)), _f; _f = await _e.next(), !_f.done;) {
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
        console.error(chalk_1.default.red(error.message));
        process.exit(1);
    }
};
run();
//# sourceMappingURL=index.js.map