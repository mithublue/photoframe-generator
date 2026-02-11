import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { FrameSelector } from './components/FrameSelector';
import {
  mergeImages,
  downloadImage,
  renderCompositeToCanvas,
} from './utils/imageProcessor';
import { Download, Sparkles, Image as ImageIcon, Layers, Circle, Square, MousePointer2 } from 'lucide-react';

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
  const [showMask, setShowMask] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'profile' | 'frame'>('profile');

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
    setActiveLayer('profile'); // Switch focus
  };

  const handleFrameSelect = (file: File) => {
    setFrameImage(file);
    const url = URL.createObjectURL(file);
    setFramePreview(url);
    setFrameScale(1);
    setFrameOffsetX(0);
    setFrameOffsetY(0);
    setActiveLayer('frame'); // Switch focus
  };

  const handlePredefinedFrameSelect = async (imageUrl: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "selected-frame.png", { type: "image/png" });
      handleFrameSelect(file);
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

    // Determine square size based on frame dimensions (or just max dimension)
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
        outputSize: squareSize, // Enforce square output
      });

      // Draw Circular Mask if enabled
      if (showMask) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black
        ctx.beginPath();
        // Outer rectangle (full canvas)
        ctx.rect(0, 0, canvas.width, canvas.height);
        // Inner circle (anticlockwise to create hole)
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2, true);
        ctx.fill();

        // Draw a subtle border for the circle
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

  // --- Drag Handling ---

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;

    // Calculate movement in CSS pixels
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Convert to Canvas pixels
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = canvas.width / rect.width;

    const canvasDeltaX = deltaX * scaleFactor;
    const canvasDeltaY = deltaY * scaleFactor;

    if (activeLayer === 'profile') {
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
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  }

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
        outputSize: squareSize, // Enforce square output
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
          </div>
        </div>

        <FrameSelector
          onFrameSelect={handlePredefinedFrameSelect}
          selectedUrl={frameImage ? URL.createObjectURL(frameImage) : undefined}
        />

        {/* Layer Control Panel - Horizontal */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Layers</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <button
                onClick={() => setActiveLayer('frame')}
                className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${activeLayer === 'frame'
                    ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                  }`}
              >
                <div className="text-left">
                  <div className={`font-medium ${activeLayer === 'frame' ? 'text-cyan-900' : 'text-slate-600'}`}>Select Frame</div>
                  <div className="text-xs text-slate-400">Top Layer</div>
                </div>
              </button>

              <button
                onClick={() => setActiveLayer('profile')}
                className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all ${activeLayer === 'profile'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                  }`}
              >
                <div className="text-left">
                  <div className={`font-medium ${activeLayer === 'profile' ? 'text-blue-900' : 'text-slate-600'}`}>Select Profile Photo</div>
                  <div className="text-xs text-slate-400">Bottom Layer</div>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-4 px-4 border-l border-gray-100 min-w-[200px]">
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">Facebook Preview</span>
                  <div
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${showMask ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    onClick={() => setShowMask(!showMask)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${showMask ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </label>
                <p className="text-xs text-slate-400 mt-1">
                  Shows circular crop
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow mb-8">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Live Preview</h2>
          </div>

          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 flex items-center justify-center min-h-[400px] mb-6 relative">
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
                  <span>Dragging: <strong>{activeLayer === 'profile' ? 'Profile Photo' : 'Frame'}</strong></span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center">
                Upload both your photo and frame to see a live preview.
              </p>
            )}
          </div>

          {/* Controls for Active Layer */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                {activeLayer === 'profile' ? <Circle className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {activeLayer === 'profile' ? 'Profile Controls' : 'Frame Controls'}
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Zoom</span>
                    <span>{Math.round((activeLayer === 'profile' ? profileScale : frameScale) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.01"
                    value={activeLayer === 'profile' ? profileScale : frameScale}
                    onChange={(event) => {
                      const val = parseFloat(event.target.value);
                      activeLayer === 'profile' ? setProfileScale(val) : setFrameScale(val);
                    }}
                    className={`w-full ${activeLayer === 'profile' ? 'accent-blue-600' : 'accent-cyan-600'}`}
                    disabled={!profilePreview || !framePreview}
                  />
                </div>

                {activeLayer === 'profile' && (
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
                      onChange={(event) => setProfileRotation(parseInt(event.target.value, 10))}
                      className="w-full accent-violet-600"
                      disabled={!profilePreview || !framePreview}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2 mt-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Move X</span>
                    <span>{activeLayer === 'profile' ? profileOffsetX : frameOffsetX}px</span>
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="1"
                    value={activeLayer === 'profile' ? profileOffsetX : frameOffsetX}
                    onChange={(event) => {
                      const val = parseInt(event.target.value, 10);
                      activeLayer === 'profile' ? setProfileOffsetX(val) : setFrameOffsetX(val);
                    }}
                    className="w-full accent-indigo-600"
                    disabled={!profilePreview || !framePreview}
                  />
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Move Y</span>
                    <span>{activeLayer === 'profile' ? profileOffsetY : frameOffsetY}px</span>
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="1"
                    value={activeLayer === 'profile' ? profileOffsetY : frameOffsetY}
                    onChange={(event) => {
                      const val = parseInt(event.target.value, 10);
                      activeLayer === 'profile' ? setProfileOffsetY(val) : setFrameOffsetY(val);
                    }}
                    className="w-full accent-purple-600"
                    disabled={!profilePreview || !framePreview}
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Tip: Use the layer panel above to switch between editing the profile photo and frame.
            </p>
          </div>
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
