/**
 * src/lib/cloudinary.js
 * Helper to resolve asset URLs - returns Cloudinary URL if available,
 * otherwise falls back to the original local path.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "cyygtyfb";

/**
 * Given a local public path like /images/categories/foo.jpg,
 * returns the Cloudinary URL.
 */
export function cloudinaryUrl(localPath, options = {}) {
  if (!localPath) return localPath;

  // If already a full URL (Cloudinary or external), return as-is
  if (localPath.startsWith("http")) return localPath;

  // Build Cloudinary public_id
  const withoutLeadingSlash = localPath.replace(/^\//, "");
  const withoutExt = withoutLeadingSlash.replace(/\.[^/.]+$/, "");
  const publicId = "houseofginija/" + withoutExt;

  const { width, height, quality = "auto", format = "auto" } = options;

  let transformations = `f_${format},q_${quality}`;
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;

  // Detect video
  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(localPath);
  const resourceType = isVideo ? "video" : "image";

  return `https://res.cloudinary.com/${CLOUD_NAME}/${resourceType}/upload/${transformations}/${publicId}`;
}

/**
 * Returns the best URL for an asset - uses cloudinary-map.json if available,
 * otherwise generates URL from path.
 */
let cloudinaryMap = null;

export function getAssetUrl(localPath) {
  if (!localPath) return localPath;
  if (localPath.startsWith("http")) return localPath;

  // Try to load map (server-side only)
  if (typeof window === "undefined" && cloudinaryMap === null) {
    try {
      const req = eval('require');
      const fs = req("fs");
      const path = req("path");
      const mapPath = path.join(process.cwd(), "src/data/cloudinary-map.json");
      if (fs.existsSync(mapPath)) {
        cloudinaryMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
      } else {
        cloudinaryMap = {};
      }
    } catch {
      cloudinaryMap = {};
    }
  }

  if (cloudinaryMap && cloudinaryMap[localPath]) {
    return cloudinaryMap[localPath];
  }

  return cloudinaryUrl(localPath);
}
