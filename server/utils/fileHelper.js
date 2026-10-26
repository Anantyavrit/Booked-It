import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Deletes a poster file from disk.
 * Skips safely if:
 *   - path is falsy / empty
 *   - path starts with "http" (it's a URL, not a local file)
 *   - file doesn't exist on disk
 */
export const deleteFile = (filePath) => {
  if (!filePath || filePath.startsWith('http')) return;

  // filePath stored as "/uploads/poster-xxx.jpg" — resolve from server root
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
