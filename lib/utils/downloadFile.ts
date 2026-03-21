/**
 * Downloads a file from a URL using fetch + blob technique
 * Works for all file types (PDF, images, HEIC, etc.)
 * 
 * @param url - The file URL to download
 * @param filename - Optional custom filename (will extract from URL if not provided)
 * @throws Error if download fails
 */
export async function downloadFile(url: string, filename?: string): Promise<void> {
  try {
    // Fetch the file with proper CORS settings for Supabase public storage
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    // Convert to blob
    const blob = await response.blob();

    // Extract filename from URL if not provided
    const finalFilename = filename || extractFilenameFromUrl(url);

    // Create object URL
    const blobUrl = URL.createObjectURL(blob);

    // Create anchor element and trigger download
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = finalFilename;
    anchor.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke object URL after a short delay to ensure download starts
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Extracts filename from URL
 * Falls back to timestamp if extraction fails
 */
function extractFilenameFromUrl(url: string): string {
  try {
    // Remove query parameters
    const urlWithoutQuery = url.split('?')[0];
    
    // Get last part of path
    const parts = urlWithoutQuery.split('/');
    const filename = parts[parts.length - 1];
    
    // If filename exists and has extension, return it
    if (filename && filename.includes('.')) {
      return decodeURIComponent(filename);
    }
    
    // Fallback to timestamp
    return `document-${Date.now()}`;
  } catch {
    return `document-${Date.now()}`;
  }
}
