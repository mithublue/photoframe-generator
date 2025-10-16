import { Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface ImageUploaderProps {
  label: string;
  onImageSelect: (file: File) => void;
  preview?: string;
  onClear?: () => void;
  showZoomControls?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export function ImageUploader({ label, onImageSelect, preview, onClear, showZoomControls, zoom = 1, onZoomChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleZoomIn = () => {
    if (onZoomChange && zoom < 3) {
      onZoomChange(Math.min(zoom + 0.1, 3));
    }
  };

  const handleZoomOut = () => {
    if (onZoomChange && zoom > 0.5) {
      onZoomChange(Math.max(zoom - 0.1, 0.5));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      {preview ? (
        <div className="relative group">
          <div className="w-full h-64 bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center">
            <img
              src={preview}
              alt="Preview"
              style={{
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <button
            onClick={onClear}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
          {showZoomControls && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 flex items-center gap-1 p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-gray-700" />
              </button>
              <span className="text-xs font-medium text-gray-600 px-2 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id={`file-input-${label}`}
          />
          <label htmlFor={`file-input-${label}`} className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              Drag and drop your image here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports: PNG, JPG, JPEG
            </p>
          </label>
        </div>
      )}
    </div>
  );
}
