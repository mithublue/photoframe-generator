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
    const profileUrl = URL.createObjectURL(profileImage);
    const frameUrl = URL.createObjectURL(frameImage);

    let profileLoaded = false;
    let frameLoaded = false;

    const tryMerge = () => {
      if (!profileLoaded || !frameLoaded) return;

      const frameWidth = frame.naturalWidth || frame.width;
      const frameHeight = frame.naturalHeight || frame.height;
      const profileWidth = profile.naturalWidth || profile.width;
      const profileHeight = profile.naturalHeight || profile.height;

      if (!frameWidth || !frameHeight || !profileWidth || !profileHeight) {
        URL.revokeObjectURL(profileUrl);
        URL.revokeObjectURL(frameUrl);
        reject(new Error('Invalid image dimensions'));
        return;
      }

      canvas.width = frameWidth;
      canvas.height = frameHeight;

      const scale = Math.max(
        canvas.width / profileWidth,
        canvas.height / profileHeight
      );
      const drawWidth = profileWidth * scale;
      const drawHeight = profileHeight * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(profile, offsetX, offsetY, drawWidth, drawHeight);
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            URL.revokeObjectURL(profileUrl);
            URL.revokeObjectURL(frameUrl);
            resolve(blob);
          } else {
            URL.revokeObjectURL(profileUrl);
            URL.revokeObjectURL(frameUrl);
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

    profile.onerror = () => {
      URL.revokeObjectURL(profileUrl);
      URL.revokeObjectURL(frameUrl);
      reject(new Error('Failed to load profile image'));
    };
    frame.onerror = () => {
      URL.revokeObjectURL(profileUrl);
      URL.revokeObjectURL(frameUrl);
      reject(new Error('Failed to load frame image'));
    };

    profile.src = profileUrl;
    frame.src = frameUrl;
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
