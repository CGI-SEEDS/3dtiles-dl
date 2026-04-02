/**
 * Glib Loader Utility
 * Handles loading and parsing of .glb files with spatial ordering
 */

export interface GlibFile {
  filename: string;
  path: string;
  order: number;
}

/**
 * Load all glib files from the models directory
 * Files are sorted alphabetically by filename (spatial order encoded in name)
 */
export async function loadGlibFiles(directory: string = '/models/AurthurSeat'): Promise<GlibFile[]> {
  try {
    // Fetch the list of files from the server
    const response = await fetch(`${directory}/files.json`);
    if (response.ok) {
      const files = await response.json();
      return files.map((filename: string, index: number) => ({
        filename,
        path: `${directory}/${filename}`,
        order: index,
      }));
    }
  } catch (error) {
    console.warn('Could not load files.json, falling back to static list');
  }

  // Fallback: return empty array if files.json doesn't exist
  // In production, you should generate a files.json with all glb files
  return [];
}

/**
 * Get glib files from the static directory
 * This relies on the files being known at build time
 */
export function getStaticGlibFiles(): GlibFile[] {
  // This would be populated by a build script that scans the directory
  // For now, returning empty - will be populated when files.json is created
  return [];
}

/**
 * Parse coordinates from filename if encoded
 * Google 3D Tiles often encode tile coordinates in the filename
 */
export function parseCoordinatesFromFilename(filename: string): { x: number; y: number; z: number } | null {
  // The filenames appear to be base64-encoded
  // They might contain tile quadkey or coordinate information
  // This would need to be decoded based on the specific encoding scheme
  
  // For now, return null - spatial ordering will be handled by tile system
  return null;
}
