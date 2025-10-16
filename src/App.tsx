import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import {
  mergeImages,
  downloadImage,
  renderCompositeToCanvas,
} from './utils/imageProcessor';
import { Download, Sparkles, Image as ImageIcon } from 'lucide-react';

function App() {
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [frameImage, setFrameImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>('');
  const [framePreview, setFramePreview] = useState<string>('');
  const [mergedImage, setMergedImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileScale, setProfileScale] = useState(1);
  const [frameScale, setFrameScale] = useState(1);
  const [profileRotation, setProfileRotation] = useState(0);
  const [profileOffsetX, setProfileOffsetX] = useState(0);
  const [profileOffsetY, setProfileOffsetY] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileImageElementRef = useRef<HTMLImageElement | null>(null);
  const frameImageElementRef = useRef<HTMLImageElement | null>(null);

  const handleProfileSelect = (file: File) => {
    setProfileImage(file);
    const url = URL.createObjectURL(file);
    setProfilePreview(url);
    setProfileScale(1);
    setProfileRotation(0);
    setProfileOffsetX(0);
    setProfileOffsetY(0);
  };

  const handleFrameSelect = (file: File) => {
    setFrameImage(file);
    const url = URL.createObjectURL(file);
    setFramePreview(url);
    setFrameScale(1);
  };

  const handleClearProfile = () => {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileImage(null);
    setProfilePreview('');
    setMergedImage('');
    setProfileScale(1);
    setProfileRotation(0);
    setProfileOffsetX(0);
    setProfileOffsetY(0);
  };

  const handleClearFrame = () => {
    if (framePreview) URL.revokeObjectURL(framePreview);
    setFrameImage(null);
    setFramePreview('');
    setMergedImage('');
    setFrameScale(1);
  };

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const profileImg = profileImageElementRef.current;
    const frameImg = frameImageElementRef.current;

    if (!profileImg || !frameImg) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    try {
      renderCompositeToCanvas(canvas, ctx, profileImg, frameImg, {
        profileScale,
        frameScale,
        profileRotation,
        profileOffsetX,
        profileOffsetY,
      });
    } catch (error) {
      console.error('Failed to render preview:', error);
    }
  }, [
    profileScale,
    frameScale,
    profileRotation,
    profileOffsetX,
    profileOffsetY,
  ]);

  const handleGenerate = async () => {
    if (!profileImage || !frameImage) return;

    setIsProcessing(true);
    try {
      const blob = await mergeImages(profileImage, frameImage, {
        profileScale,
        frameScale,
        profileRotation,
        profileOffsetX,
        profileOffsetY,
      });
      const url = URL.createObjectURL(blob);
      setMergedImage(url);
    } catch (error) {
      console.error('Error merging images:', error);
      alert('Failed to generate framed photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!mergedImage) return;

    fetch(mergedImage)
      .then((res) => res.blob())
      .then((blob) => {
        downloadImage(blob, 'framed-photo.png');
      });
  };

  useEffect(() => {
    const canvas = previewCanvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    if (!profilePreview || !framePreview) {
      profileImageElementRef.current = null;
      frameImageElementRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let isCancelled = false;
    const profileImg = new Image();
    const frameImg = new Image();
    let profileReady = false;
    let frameReady = false;

    const finalize = () => {
      if (isCancelled || !profileReady || !frameReady) return;

      profileImageElementRef.current = profileImg;
      frameImageElementRef.current = frameImg;
      renderPreview();
    };

    profileImg.onload = () => {
      profileReady = true;
      finalize();
    };

    frameImg.onload = () => {
      frameReady = true;
      finalize();
    };

    profileImg.onerror = (err) => {
      console.error('Failed to load profile preview image:', err);
    };

    frameImg.onerror = (err) => {
      console.error('Failed to load frame preview image:', err);
    };

    profileImg.src = profilePreview;
    frameImg.src = framePreview;

    if (profileImg.complete && profileImg.naturalWidth) {
      profileReady = true;
    }

    if (frameImg.complete && frameImg.naturalWidth) {
      frameReady = true;
    }

    finalize();

    return () => {
      isCancelled = true;
    };
  }, [profilePreview, framePreview, renderPreview]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      if (framePreview) URL.revokeObjectURL(framePreview);
      if (mergedImage) URL.revokeObjectURL(mergedImage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-2xl shadow-lg">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              PhotoFrame Studio
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Create stunning framed profile pictures perfect for Facebook and social media.
            Upload your photo and frame to get started.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ImageIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Your Photo</h2>
            </div>
            <ImageUploader
              label="Profile Picture"
              onImageSelect={handleProfileSelect}
              preview={profilePreview}
              onClear={handleClearProfile}
            />
            <p className="text-sm text-gray-500 mt-3">
              This will be your base image that appears inside the frame
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-cyan-100 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-cyan-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Frame Overlay</h2>
            </div>
            <ImageUploader
              label="Frame Image"
              onImageSelect={handleFrameSelect}
              preview={framePreview}
              onClear={handleClearFrame}
            />
            <p className="text-sm text-gray-500 mt-3">
              Choose a PNG frame with transparency for best results
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Live Preview</h2>
          </div>

          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 flex items-center justify-center min-h-[280px] mb-6">
            {profilePreview && framePreview ? (
              <canvas
                ref={previewCanvasRef}
                className="w-full max-w-2xl rounded-lg shadow-lg"
                style={{ height: 'auto' }}
              />
            ) : (
              <p className="text-gray-500 text-center">
                Upload both your photo and frame to see a live preview.
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Profile Zoom</span>
                <span>{Math.round(profileScale * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.01"
                value={profileScale}
                onChange={(event) =>
                  setProfileScale(parseFloat(event.target.value))
                }
                className="w-full accent-blue-600"
                disabled={!profilePreview || !framePreview}
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Frame Zoom</span>
                <span>{Math.round(frameScale * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.01"
                value={frameScale}
                onChange={(event) =>
                  setFrameScale(parseFloat(event.target.value))
                }
                className="w-full accent-cyan-600"
                disabled={!profilePreview || !framePreview}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mt-6">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Rotate</span>
                <span>{profileRotation}°</span>
              </label>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={profileRotation}
                onChange={(event) =>
                  setProfileRotation(parseInt(event.target.value, 10))
                }
                className="w-full accent-violet-600"
                disabled={!profilePreview || !framePreview}
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Move Left/Right</span>
                <span>{profileOffsetX}px</span>
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={profileOffsetX}
                onChange={(event) =>
                  setProfileOffsetX(parseInt(event.target.value, 10))
                }
                className="w-full accent-indigo-600"
                disabled={!profilePreview || !framePreview}
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Move Up/Down</span>
                <span>{profileOffsetY}px</span>
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={profileOffsetY}
                onChange={(event) =>
                  setProfileOffsetY(parseInt(event.target.value, 10))
                }
                className="w-full accent-purple-600"
                disabled={!profilePreview || !framePreview}
              />
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Adjust the zoom levels until your photo and frame align perfectly. The
            generated image will use the preview settings.
          </p>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={!profileImage || !frameImage || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-10 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200 inline-flex items-center gap-3"
          >
            <Sparkles className="w-6 h-6" />
            {isProcessing ? 'Generating...' : 'Generate Framed Photo'}
          </button>
        </div>

        {mergedImage && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Your Framed Photo is Ready!
              </h2>
              <p className="text-gray-600">
                Perfect for Facebook profile pictures and social media
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                <img
                  src={mergedImage}
                  alt="Framed Photo"
                  className="relative w-full rounded-xl shadow-xl"
                />
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 inline-flex items-center gap-3"
              >
                <Download className="w-5 h-5" />
                Download Image
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Click download to save your framed photo to your device
              </p>
            </div>
          </div>
        )}

        <footer className="text-center text-sm text-gray-500 mt-12">
          Developed by Mithu A Quayium
        </footer>
      </div>
    </div>
  );
}

export default App;
