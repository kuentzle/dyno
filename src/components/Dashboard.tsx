import React from 'react';
import { useVehicleTelemetry } from '../hooks/useVehicleTelemetry';
import { VehicleProfile } from '../hooks/useVehicleProfile';

interface DashboardProps {
    telemetry: ReturnType<typeof useVehicleTelemetry>;
    profile: VehicleProfile;
    onBack: () => void;
}

export function Dashboard({ telemetry, profile, onBack }: DashboardProps) {
    const { currentPS, maxPS, speedKmh, hasPermission, requestPermissions, isCalibrating } = telemetry;

    if (hasPermission === null) {
        return (
            <div className="glass-panel w-full max-w-sm p-6 flex flex-col items-center gap-4 text-center">
                <h2 className="text-xl font-bold">Permissions Required</h2>
                <p className="text-sm text-gray-400">We need access to your device's motion and orientation sensors to calculate acceleration.</p>
                <button
                    onClick={requestPermissions}
                    className="mt-4 bg-[var(--color-neon-blue)] text-black font-bold py-3 px-6 rounded-lg w-full"
                >
                    Grant Access
                </button>
            </div>
        );
    }

    if (isCalibrating) {
        return (
            <div className="glass-panel w-full max-w-sm p-8 flex flex-col items-center justify-center gap-6 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[var(--color-neon-blue)] border-solid"></div>
                <div>
                    <h2 className="text-xl font-bold text-glow text-[var(--color-neon-blue)]">Calibrating...</h2>
                    <p className="text-sm text-gray-400 mt-2">Please keep your phone completely still in the mount.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center justify-center gap-8">

            {/* HUD GAUGE */}
            <div className="relative w-64 h-64 flex items-center justify-center rounded-full glass-panel border-[var(--color-neon-blue)] border-opacity-30 border-[3px] shadow-[0_0_30px_rgba(0,243,255,0.15)]">
                <div className="absolute top-8 text-gray-400 text-sm font-bold tracking-widest">WHEEL HP</div>
                <div className="flex flex-col items-center justify-center mt-4">
                    <span className="text-6xl font-mono font-bold text-glow text-[var(--color-neon-blue)]">
                        {Math.round(currentPS)}
                    </span>
                    <span className="text-lg font-bold text-[var(--color-neon-blue)] opacity-80 mt-1">PS</span>
                </div>
            </div>

            <div className="flex w-full max-w-sm gap-4">
                {/* SPEED */}
                <div className="flex-1 glass-panel p-4 flex flex-col items-center justify-center">
                    <span className="text-3xl font-mono font-bold text-white tracking-tighter">
                        {Math.round(speedKmh)}
                    </span>
                    <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">km/h</span>
                </div>

                {/* PEAK HP */}
                <div className="flex-1 glass-panel p-4 flex flex-col items-center justify-center">
                    <span className="text-3xl font-mono font-bold text-[#ff0055] text-glow tracking-tighter">
                        {Math.round(maxPS)}
                    </span>
                    <span className="text-xs text-[#ff0055] uppercase tracking-widest mt-1">Peak PS</span>
                </div>
            </div>

            <button
                className="mt-4 border-2 border-zinc-700 hover:border-zinc-500 text-gray-300 font-bold py-3 px-8 rounded-full active:scale-95 transition-all text-sm tracking-widest"
                onClick={onBack}
            >
                END SESSION
            </button>

        </div>
    );
}
