import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

// Saves a worker-submitted proof photo (e.g. a scale reading) to
// public/uploads/<subdir>/ and returns the public URL to store on the row.
// Returns null for an empty/absent file input so callers can treat the
// photo as optional without special-casing FormData.get() results.
export async function savePhoto(file: FormDataEntryValue | null, subdir: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo too large");
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Unsupported photo type");

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return `/uploads/${subdir}/${filename}`;
}

// Root for photos that must not be publicly reachable (e.g. staff clock-in
// snapshots). Served only through an admin-gated route handler. In production
// point PRIVATE_UPLOAD_DIR at the mounted data volume so photos survive deploys.
export function privateUploadRoot(): string {
  return process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "storage");
}

// Like savePhoto, but writes under privateUploadRoot() and returns the
// relative key ("<subdir>/<file>") rather than a public URL.
export async function savePrivatePhoto(file: FormDataEntryValue | null, subdir: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo too large");
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Unsupported photo type");

  const dir = path.join(privateUploadRoot(), subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return `${subdir}/${filename}`;
}
