export async function mergeImages(
  profileImage: File,
  frameImage: File
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const profile = new Image();
    const frame = new Image();

    let profileLoaded = false;
    let frameLoaded = false;

    const tryMerge = () => {
      if (!profileLoaded || !frameLoaded) return;

      canvas.width = frame.width;
      canvas.height = frame.height;

      ctx.drawImage(profile, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    };

    profile.onload = () => {
      profileLoaded = true;
      tryMerge();
    };

    frame.onload = () => {
      frameLoaded = true;
      tryMerge();
    };

    profile.onerror = () => reject(new Error('Failed to load profile image'));
    frame.onerror = () => reject(new Error('Failed to load frame image'));

    profile.src = URL.createObjectURL(profileImage);
    frame.src = URL.createObjectURL(frameImage);
  });
}

export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
