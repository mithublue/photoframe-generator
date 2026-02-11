export interface CompositeOptions {
  profileScale?: number;
  frameScale?: number;
  profileRotation?: number; // degrees
  profileOffsetX?: number; // pixels
  profileOffsetY?: number; // pixels
  frameOffsetX?: number; // pixels
  frameOffsetY?: number; // pixels
  outputSize?: number; // Optional square size. If not provided, uses frame dimensions.
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
    frameOffsetX = 0,
    frameOffsetY = 0,
    outputSize,
  }: CompositeOptions = {}
) {
  const frameWidth = frame.naturalWidth || frame.width;
  const frameHeight = frame.naturalHeight || frame.height;
  const profileWidth = profile.naturalWidth || profile.width;
  const profileHeight = profile.naturalHeight || profile.height;

  if (!frameWidth || !frameHeight || !profileWidth || !profileHeight) {
    throw new Error('Invalid image dimensions');
  }

  // Determine canvas dimensions
  if (outputSize) {
    canvas.width = outputSize;
    canvas.height = outputSize;
  } else {
    // Default to frame dimensions if no output size specified (legacy behavior, though we will likely use outputSize)
    canvas.width = frameWidth;
    canvas.height = frameHeight;
  }

  const scaledFrameWidth = frameWidth * frameScale;
  const scaledFrameHeight = frameHeight * frameScale;

  // Profile calculations depend on canvas size
  const baseProfileScale = Math.max(
    canvas.width / profileWidth,
    canvas.height / profileHeight
  );
  const finalProfileWidth = profileWidth * baseProfileScale * profileScale;
  const finalProfileHeight = profileHeight * baseProfileScale * profileScale;

  // Center profile by default relative to canvas
  const startProfileX = (canvas.width - finalProfileWidth) / 2;
  const startProfileY = (canvas.height - finalProfileHeight) / 2;

  const profileCenterX = startProfileX + finalProfileWidth / 2 + profileOffsetX;
  const profileCenterY = startProfileY + finalProfileHeight / 2 + profileOffsetY;
  const rotationRadians = (profileRotation * Math.PI) / 180;

  // Frame calculations - centered by default relative to canvas
  const startFrameX = (canvas.width - scaledFrameWidth) / 2;
  const startFrameY = (canvas.height - scaledFrameHeight) / 2;

  const finalFrameX = startFrameX + frameOffsetX;
  const finalFrameY = startFrameY + frameOffsetY;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Profile
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

  // Draw Frame
  ctx.drawImage(frame, finalFrameX, finalFrameY, scaledFrameWidth, scaledFrameHeight);
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
      frameOffsetX = 0,
      frameOffsetY = 0,
      outputSize,
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
          frameOffsetX,
          frameOffsetY,
          outputSize,
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
