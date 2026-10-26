import { readFile } from "fs/promises";
import path from "path";
import { getStaffSession } from "@/lib/require-admin";
import { privateUploadRoot } from "@/lib/upload";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

// Clock-in snapshots are staff faces: admin-only, never under public/.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const staff = await getStaffSession();
  if (!staff || staff.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  const root = path.join(privateUploadRoot(), "attendance");
  const filePath = path.resolve(root, ...key);
  if (!filePath.startsWith(root + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(filePath);
    return new Response(bytes, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
