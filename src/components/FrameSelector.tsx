import { useState, useEffect } from 'react';
import { Check, RefreshCcw } from 'lucide-react';

interface FrameSelectorProps {
    onFrameSelect: (url: string, label: string) => void;
    selectedUrl?: string; // To highlight the selected frame
}

interface FrameAsset {
    id: string;
    url: string;
    label: string;
}

export function FrameSelector({ onFrameSelect, selectedUrl }: FrameSelectorProps) {
    const [selectedFrame, setSelectedFrame] = useState<string | null>(selectedUrl || null);
    const [availableFrames, setAvailableFrames] = useState<FrameAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchFrames();
    }, []);

    const fetchFrames = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/frames/manifest.json');
            if (response.ok) {
                const data = await response.json();
                setAvailableFrames(data);
            }
        } catch (error) {
            console.error('Failed to fetch frames manifest:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Choose a Frame</h2>
                <button
                    onClick={fetchFrames}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Refresh frame list"
                >
                    <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : availableFrames.length === 0 ? (
                <div className="col-span-full py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400 italic">No frames discovered in the directory.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {availableFrames.map((frame) => (
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
                            <div className="aspect-square bg-slate-50 relative p-2">
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

                            {selectedFrame === frame.url && (
                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-md">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 translate-y-full group-hover:translate-y-0 transition-transform text-center truncate">
                                {frame.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-sm text-gray-500 mt-4">
                Select a frame from the gallery above to start editing. Any images you drop into <code>public/frames</code> will appear here automatically after a rebuild or restart.
            </p>
        </div>
    );
}
