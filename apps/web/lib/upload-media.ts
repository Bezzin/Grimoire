/**
 * Convert base64 image data to a File object for upload.
 */
export function base64ToFile(
  base64Data: string,
  mimeType: string,
  filename: string
): File {
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  return new File([blob], filename, { type: mimeType })
}

/**
 * Fetch a video from a URL and convert to a File for upload.
 */
export async function urlToFile(
  url: string,
  filename: string,
  mimeType: string = "video/mp4"
): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch media: ${response.status}`)
  const blob = await response.blob()
  return new File([blob], filename, { type: mimeType })
}
