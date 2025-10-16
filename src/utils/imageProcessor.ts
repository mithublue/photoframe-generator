export interface CompositeOptions {
  profileScale?: number;
  frameScale?: number;
  profileRotation?: number; // degrees
  profileOffsetX?: number; // pixels
  profileOffsetY?: number; // pixels
}

export function renderCompositeToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  profile: HTMLImageElement,
  frame: HTMLImageElement,
  {
    profileScale = 1,
    frameScale = 1,
    profileRotation = 0,
    profileOffsetX = 0,
    profileOffsetY = 0,
  }: CompositeOptions = {}
) {
  const frameWidth = frame.naturalWidth || frame.width;
  const frameHeight = frame.naturalHeight || frame.height;
  const profileWidth = profile.naturalWidth || profile.width;
  const profileHeight = profile.naturalHeight || profile.height;

  if (!frameWidth || !frameHeight || !profileWidth || !profileHeight) {
    throw new Error('Invalid image dimensions');
  }

  canvas.width = frameWidth;
  canvas.height = frameHeight;

  const scaledFrameWidth = frameWidth * frameScale;
  const scaledFrameHeight = frameHeight * frameScale;

  const baseProfileScale = Math.max(
    canvas.width / profileWidth,
    canvas.height / profileHeight
  );
  const finalProfileWidth = profileWidth * baseProfileScale * profileScale;
  const finalProfileHeight = profileHeight * baseProfileScale * profileScale;
  const baseProfileOffsetX = (canvas.width - finalProfileWidth) / 2;
  const baseProfileOffsetY = (canvas.height - finalProfileHeight) / 2;
  const profileCenterX = baseProfileOffsetX + finalProfileWidth / 2 + profileOffsetX;
  const profileCenterY = baseProfileOffsetY + finalProfileHeight / 2 + profileOffsetY;
  const rotationRadians = (profileRotation * Math.PI) / 180;

  const frameOffsetX = (canvas.width - scaledFrameWidth) / 2;
  const frameOffsetY = (canvas.height - scaledFrameHeight) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(profileCenterX, profileCenterY);
  ctx.rotate(rotationRadians);
  ctx.drawImage(
    profile,
    -finalProfileWidth / 2,
    -finalProfileHeight / 2,
    finalProfileWidth,
    finalProfileHeight
  );
  ctx.restore();
  ctx.drawImage(frame, frameOffsetX, frameOffsetY, scaledFrameWidth, scaledFrameHeight);
}

export async function mergeImages(
  profileImage: File,
  frameImage: File,
  options: CompositeOptions = {}
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
    const {
      profileScale = 1,
      frameScale = 1,
      profileRotation = 0,
      profileOffsetX = 0,
      profileOffsetY = 0,
    } = options;

    let profileLoaded = false;
    let frameLoaded = false;

    const tryMerge = () => {
      if (!profileLoaded || !frameLoaded) return;

      try {
        renderCompositeToCanvas(canvas, ctx, profile, frame, {
          profileScale,
          frameScale,
          profileRotation,
          profileOffsetX,
          profileOffsetY,
        });
      } catch (error) {
        URL.revokeObjectURL(profileUrl);
        URL.revokeObjectURL(frameUrl);
        reject(error instanceof Error ? error : new Error('Failed to render images'));
        return;
      }

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
