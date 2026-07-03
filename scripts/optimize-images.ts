import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const PORTRAIT_MAX_EDGE = 480;
const LANDSCAPE_MAX_WIDTH = 720;
const JPEG_QUALITY = 85;
const PNG_COMPRESSION_LEVEL = 9;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type ImageProfile = "portrait" | "landscape" | "screenshot";

export type OptimizedImage = {
  srcPath: string;
  destPath: string;
  profile: ImageProfile;
  width: number;
  height: number;
  changed: boolean;
};

export function isOptimizableImage(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function classifyImage(
  ext: string,
  width: number,
  height: number,
): ImageProfile {
  if (ext === ".png") return "screenshot";
  return height >= width ? "portrait" : "landscape";
}

export function targetDimensions(
  profile: ImageProfile,
  width: number,
  height: number,
): { width: number; height: number } {
  if (profile === "portrait") {
    const longest = Math.max(width, height);
    if (longest <= PORTRAIT_MAX_EDGE) {
      return { width, height };
    }
    const scale = PORTRAIT_MAX_EDGE / longest;
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    };
  }

  if (width <= LANDSCAPE_MAX_WIDTH) {
    return { width, height };
  }
  const scale = LANDSCAPE_MAX_WIDTH / width;
  return {
    width: LANDSCAPE_MAX_WIDTH,
    height: Math.round(height * scale),
  };
}

function needsResize(
  width: number,
  height: number,
  target: { width: number; height: number },
): boolean {
  return width > target.width || height > target.height;
}

export async function optimizeImageFile(
  srcPath: string,
  destPath: string,
): Promise<OptimizedImage | null> {
  if (!isOptimizableImage(srcPath)) return null;

  const ext = path.extname(srcPath).toLowerCase();
  const image = sharp(srcPath, { failOn: "error" });
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error(`${srcPath}: could not read image dimensions`);
  }

  const profile = classifyImage(ext, width, height);
  const target = targetDimensions(profile, width, height);
  const resize = needsResize(width, height, target);

  let pipeline = sharp(srcPath, { failOn: "error" });
  if (resize) {
    pipeline = pipeline.resize(target.width, target.height, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION_LEVEL });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: JPEG_QUALITY });
  } else {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  }

  const inputStat = await fs.stat(srcPath);
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, data);

  const changed =
    resize ||
    data.length !== inputStat.size ||
    info.width !== width ||
    info.height !== height;

  return {
    srcPath,
    destPath,
    profile,
    width: info.width,
    height: info.height,
    changed,
  };
}

export async function optimizeImagesInDir(
  srcDir: string,
  destDir: string,
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];

  async function walk(currentSrc: string, currentDest: string) {
    await fs.mkdir(currentDest, { recursive: true });
    for (const entry of await fs.readdir(currentSrc, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue;
      const srcPath = path.join(currentSrc, entry.name);
      const destPath = path.join(currentDest, entry.name);

      if (entry.isDirectory()) {
        await walk(srcPath, destPath);
        continue;
      }

      if (isOptimizableImage(srcPath)) {
        const result = await optimizeImageFile(srcPath, destPath);
        if (result) results.push(result);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  await walk(srcDir, destDir);
  return results;
}

export async function optimizeImagePaths(
  filePaths: string[],
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];
  for (const filePath of filePaths) {
    if (!isOptimizableImage(filePath)) continue;
    const result = await optimizeImageFile(filePath, filePath);
    if (result) results.push(result);
  }
  return results;
}

function formatResult(result: OptimizedImage): string {
  const rel = path.relative(process.cwd(), result.destPath);
  const status = result.changed ? "optimized" : "ok";
  return `- ${rel} (${result.profile}, ${result.width}×${result.height}, ${status})`;
}

export function logOptimizedImages(results: OptimizedImage[]): void {
  if (results.length === 0) return;
  console.log("Optimizing images...");
  for (const result of results) {
    console.log(formatResult(result));
  }
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const results =
    args.length > 0
      ? await optimizeImagePaths(
          args.map((filePath) => path.resolve(process.cwd(), filePath)),
        )
      : await optimizeImagesInDir(
          path.join(process.cwd(), "src/static/images"),
          path.join(process.cwd(), "src/static/images"),
        );

  logOptimizedImages(results);
  if (results.length === 0) {
    console.log(
      args.length > 0
        ? "No optimizable images in arguments."
        : "No images found in src/static/images/",
    );
  } else {
    console.log(`Done — ${results.length} image(s) processed.`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Image optimization failed:", error);
    process.exit(1);
  });
}