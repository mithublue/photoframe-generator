import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface FrameSelectorProps {
    onFrameSelect: (url: string, label: string) => void;
    selectedUrl?: string; // To highlight the selected frame
}

// Define available frames. In a real app, this could come from an API or a config file.
// We'll list the one we just added.
const AVAILABLE_FRAMES = [
    { id: '1', url: '/frames/frame-1.png', label: 'Bangladesh Election 2026' },
    { id: '2', url: '/frames/bnp_slogan.png', label: 'Slogan' },
    { id: '3', url: '/frames/frame-3.png', label: 'Frame 3' },
];

export function FrameSelector({ onFrameSelect, selectedUrl }: FrameSelectorProps) {
    const [selectedFrame, setSelectedFrame] = useState<string | null>(selectedUrl || null);

    useEffect(() => {
        if (selectedUrl) {
            setSelectedFrame(selectedUrl);
        }
    }, [selectedUrl]);

    const handleSelect = (url: string, label: string) => {
        setSelectedFrame(url);
        onFrameSelect(url, label);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Choose a Frame</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {AVAILABLE_FRAMES.map((frame) => (
                    <div
                        key={frame.id}
                        onClick={() => handleSelect(frame.url, frame.label)}
                        className={`
              relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 group
              ${selectedFrame === frame.url
                                ? 'border-blue-500 ring-2 ring-blue-200 scale-105'
                                : 'border-slate-200 hover:border-blue-300 hover:scale-[1.02]'
                            }
            `}
                    >
                        {/* Aspect ratio container to keep grid items uniform */}
                        <div className="aspect-square bg-slate-50 relative p-2">
                            {/* Checkerboard pattern for transparency indication */}
                            <div className="absolute inset-0 opacity-10"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`
                                }}
                            />
                            <img
                                src={frame.url}
                                alt={frame.label}
                                className="w-full h-full object-contain relative z-10"
                            />
                        </div>

                        {/* Selection Checkmark */}
                        {selectedFrame === frame.url && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-md">
                                <Check className="w-3 h-3" />
                            </div>
                        )}

                        {/* Hover overlay with label */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                            {frame.label}
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-sm text-gray-500 mt-4">
                Select a frame from the gallery above to start editing.
            </p>
        </div>
    );
}
