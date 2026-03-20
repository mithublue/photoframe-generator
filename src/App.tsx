import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { FrameSelector } from './components/FrameSelector';
import {
  mergeImages,
  downloadImage,
  renderCompositeToCanvas,
} from './utils/imageProcessor';
import { Download, Image as ImageIcon, Circle, MousePointer2, Square, Layers } from 'lucide-react';

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
  const [frameOffsetX, setFrameOffsetX] = useState(0);
  const [frameOffsetY, setFrameOffsetY] = useState(0);

  // UI State
  const [showMask, setShowMask] = useState(true);
  const [selectedFrameName, setSelectedFrameName] = useState<string>('None');

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'profile' | 'frame' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileImageElementRef = useRef<HTMLImageElement | null>(null);
  const frameImageElementRef = useRef<HTMLImageElement | null>(null);

  const SLACK_WEBHOOK_URL = import.meta.env.VITE_SLACK_WEBHOOK_URL;

  const sendSlackNotification = async (frameName: string) => {
    try {
      const payload = {
        text: `an user downloadeded a profile picture, frame: ${frameName}`
      };

      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  };

  const handleProfileSelect = (file: File) => {
    setProfileImage(file);
    const url = URL.createObjectURL(file);
    setProfilePreview(url);
    setProfileScale(1);
    setProfileRotation(0);
    setProfileOffsetX(0);
    setProfileOffsetY(0);
  };

  const handleFrameSelect = (file: File, name: string = 'Uploaded Frame') => {
    setFrameImage(file);
    setSelectedFrameName(name);
    const url = URL.createObjectURL(file);
    setFramePreview(url);
    setFrameScale(1);
    setFrameOffsetX(0);
    setFrameOffsetY(0);
  };

  const handlePredefinedFrameSelect = async (imageUrl: string, label: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "selected-frame.png", { type: "image/png" });
      handleFrameSelect(file, label);
    } catch (error) {
      console.error("Failed to load predefined frame:", error);
      alert("Failed to load frame. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
    setFrameOffsetX(0);
    setFrameOffsetY(0);
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

    const frameWidth = frameImg.naturalWidth || frameImg.width;
    const frameHeight = frameImg.naturalHeight || frameImg.height;
    const squareSize = Math.max(frameWidth, frameHeight);

    try {
      renderCompositeToCanvas(canvas, ctx, profileImg, frameImg, {
        profileScale,
        frameScale,
        profileRotation,
        profileOffsetX,
        profileOffsetY,
        frameOffsetX,
        frameOffsetY,
        outputSize: squareSize,
      });

      if (showMask) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

    } catch (error) {
      console.error('Failed to render preview:', error);
    }
  }, [
    profileScale,
    frameScale,
    profileRotation,
    profileOffsetX,
    profileOffsetY,
    frameOffsetX,
    frameOffsetY,
    showMask
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let hitFrame = false;
    const frameImg = frameImageElementRef.current;

    if (frameImg) {
      const frameWidth = frameImg.naturalWidth || frameImg.width;
      const frameHeight = frameImg.naturalHeight || frameImg.height;
      const squareSize = Math.max(frameWidth, frameHeight);

      const scaledFrameWidth = frameWidth * frameScale;
      const scaledFrameHeight = frameHeight * frameScale;

      const startFrameX = (squareSize - scaledFrameWidth) / 2;
      const startFrameY = (squareSize - scaledFrameHeight) / 2;
      const frameDrawX = startFrameX + frameOffsetX;
      const frameDrawY = startFrameY + frameOffsetY;

      if (clickX >= frameDrawX && clickX <= frameDrawX + scaledFrameWidth &&
        clickY >= frameDrawY && clickY <= frameDrawY + scaledFrameHeight) {

        const relativeX = (clickX - frameDrawX) / frameScale;
        const relativeY = (clickY - frameDrawY) / frameScale;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1;
        tempCanvas.height = 1;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(frameImg, relativeX, relativeY, 1, 1, 0, 0, 1, 1);
          const pixel = tempCtx.getImageData(0, 0, 1, 1).data;
          if (pixel[3] > 10) {
            hitFrame = true;
          }
        }
      }
    }

    setDragTarget(hitFrame ? 'frame' : 'profile');
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragTarget || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = canvas.width / rect.width;

    const canvasDeltaX = deltaX * scaleFactor;
    const canvasDeltaY = deltaY * scaleFactor;

    if (dragTarget === 'profile') {
      setProfileOffsetX((prev) => prev + canvasDeltaX);
      setProfileOffsetY((prev) => prev + canvasDeltaY);
    } else {
      setFrameOffsetX((prev) => prev + canvasDeltaX);
      setFrameOffsetY((prev) => prev + canvasDeltaY);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragTarget(null);
  };

  const handleGenerate = async () => {
    if (!profileImage || !frameImage) return;

    const frameImg = frameImageElementRef.current;
    const frameWidth = frameImg ? (frameImg.naturalWidth || frameImg.width) : 1000;
    const frameHeight = frameImg ? (frameImg.naturalHeight || frameImg.height) : 1000;
    const squareSize = Math.max(frameWidth, frameHeight);

    setIsProcessing(true);
    try {
      const blob = await mergeImages(profileImage, frameImage, {
        profileScale,
        frameScale,
        profileRotation,
        profileOffsetX,
        profileOffsetY,
        frameOffsetX,
        frameOffsetY,
        outputSize: squareSize,
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

    // Send Slack notification
    sendSlackNotification(selectedFrameName);

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

    profileImg.onload = () => { profileReady = true; finalize(); };
    frameImg.onload = () => { frameReady = true; finalize(); };
    profileImg.src = profilePreview;
    frameImg.src = framePreview;

    if (profileImg.complete && profileImg.naturalWidth) profileReady = true;
    if (frameImg.complete && frameImg.naturalWidth) frameReady = true;
    finalize();

    return () => { isCancelled = true; };
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
        <div className="text-center mb-12 relative">
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
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-cyan-100 p-2 rounded-lg">
                <Layers className="w-5 h-5 text-cyan-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Frame Overlay</h2>
            </div>
            <ImageUploader
              label="Frame Image"
              onImageSelect={handleFrameSelect}
              preview={framePreview}
              onClear={handleClearFrame}
            />
          </div>
        </div>

        <FrameSelector
          onFrameSelect={handlePredefinedFrameSelect}
          selectedUrl={frameImage ? URL.createObjectURL(frameImage) : undefined}
        />

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow mb-8 mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Live Preview</h2>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <span className="font-medium text-gray-700 text-sm group-hover:text-gray-900">Facebook Preview</span>
                <div
                  className={`w-10 h-5 rounded-full p-1 transition-colors duration-200 ease-in-out ${showMask ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  onClick={() => setShowMask(!showMask)}
                >
                  <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${showMask ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 flex items-center justify-center min-h-[400px] mb-8 relative">
            {profilePreview && framePreview ? (
              <div className="relative shadow-xl rounded-lg overflow-hidden cursor-move">
                <canvas
                  ref={previewCanvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  className="w-full max-w-2xl bg-white"
                  style={{ height: 'auto', touchAction: 'none' }}
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none flex items-center gap-2 border border-white/10">
                  <MousePointer2 className="w-3 h-3" />
                  <span>{dragTarget ? (dragTarget === 'frame' ? 'Moving Frame' : 'Moving Profile photo') : 'Click and Drag to move layers'}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center">
                Upload both your photo and frame to see a live preview.
              </p>
            )}
          </div>

          <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Circle className="w-4 h-4" />
                  Profile Controls
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Zoom</span>
                      <span>{Math.round(profileScale * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.01"
                      value={profileScale}
                      onChange={(e) => setProfileScale(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                      disabled={!profilePreview}
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Rotation</span>
                      <span>{profileRotation}°</span>
                    </label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={profileRotation}
                      onChange={(e) => setProfileRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-violet-600"
                      disabled={!profilePreview}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Offset X</label>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={profileOffsetX}
                        onChange={(e) => setProfileOffsetX(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600"
                        disabled={!profilePreview}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Offset Y</label>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={profileOffsetY}
                        onChange={(e) => setProfileOffsetY(parseInt(e.target.value, 10))}
                        className="w-full accent-purple-600"
                        disabled={!profilePreview}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-cyan-50/50 rounded-2xl border border-cyan-100">
                <h3 className="text-sm font-bold text-cyan-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Square className="w-4 h-4" />
                  Frame Controls
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                      <span>Zoom</span>
                      <span>{Math.round(frameScale * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.01"
                      value={frameScale}
                      onChange={(e) => setFrameScale(parseFloat(e.target.value))}
                      className="w-full accent-cyan-600"
                      disabled={!framePreview}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Offset X</label>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={frameOffsetX}
                        onChange={(e) => setFrameOffsetX(parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-600"
                        disabled={!framePreview}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Offset Y</label>
                      <input
                        type="range"
                        min="-200"
                        max="200"
                        value={frameOffsetY}
                        onChange={(e) => setFrameOffsetY(parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-600"
                        disabled={!framePreview}
                      />
                    </div>
                  </div>
                  <div className="pt-4 mt-2 border-t border-cyan-100/50">
                    <p className="text-xs text-cyan-700 italic">
                      Tip: Drag layers directly on the preview to arrange them quickly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={!profileImage || !frameImage || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-10 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200 inline-flex items-center gap-3"
          >
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
