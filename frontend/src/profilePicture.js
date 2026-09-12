export const maxPictureBytes = 5 * 1024 * 1024;
const pictureTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function validatePictureFile(file) {
  if (!pictureTypes.includes(file.type)) return 'Choose a JPG, PNG, or WebP image.';
  if (!file.size) return 'This image is empty. Choose another file.';
  if (file.size > maxPictureBytes) return 'Choose an image smaller than 5 MB.';
  return '';
}

export async function prepareProfilePicture(file) {
  const error = validatePictureFile(file);
  if (error) throw new Error(error);

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    // Store a small square thumbnail so photos fit in browser profile storage.
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error('Empty image');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(side, 512);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
      side, side, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    throw new Error('This image could not be opened. Please choose another JPG, PNG, or WebP file.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
