import React from 'react';
import { VehicleProfile } from '../hooks/useVehicleProfile';

interface ProfileFormProps {
    profile: VehicleProfile;
    onChange: (key: keyof VehicleProfile, value: number) => void;
    onStart: () => void;
}

export function ProfileForm({ profile, onChange, onStart }: ProfileFormProps) {
    return (
        <div className="glass-panel w-full max-w-sm p-6 flex flex-col gap-5 text-left">
            <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-glow text-[var(--color-neon-blue)]">Vehicle Setup</h2>
                <p className="text-sm text-gray-400">Configure parameters for accurate physics.</p>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-300">Vehicle Mass (kg) <span className="text-xs text-gray-500 font-normal">incl. Driver</span></label>
                <input
                    type="number"
                    value={profile.massKg}
                    onChange={(e) => onChange('massKg', Number(e.target.value))}
                    className="bg-black/50 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:border-[var(--color-neon-blue)] focus:ring-1 focus:ring-[var(--color-neon-blue)] transition-all"
                />
            </div>

            <div className="flex gap-4">
                <div className="flex flex-col gap-1 w-1/2">
                    <label className="text-sm font-semibold text-gray-300">Drag Coeff (cw)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={profile.dragCoefficient}
                        onChange={(e) => onChange('dragCoefficient', Number(e.target.value))}
                        className="bg-black/50 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:border-[var(--color-neon-blue)] focus:ring-1 focus:ring-[var(--color-neon-blue)] transition-all"
                    />
                </div>
                <div className="flex flex-col gap-1 w-1/2">
                    <label className="text-sm font-semibold text-gray-300">Frontal Area (m²)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={profile.frontalAreaM2}
                        onChange={(e) => onChange('frontalAreaM2', Number(e.target.value))}
                        className="bg-black/50 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:border-[var(--color-neon-blue)] focus:ring-1 focus:ring-[var(--color-neon-blue)] transition-all"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-300">Drivetrain Loss</label>
                <select
                    value={profile.drivetrainLoss}
                    onChange={(e) => onChange('drivetrainLoss', Number(e.target.value))}
                    className="bg-black/50 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:border-[var(--color-neon-blue)] focus:ring-1 focus:ring-[var(--color-neon-blue)] transition-all appearance-none"
                >
                    <option value={0.10}>FWD / RWD (Manual, Low Loss - 10%)</option>
                    <option value={0.15}>FWD / RWD (Manual/Auto - 15%)</option>
                    <option value={0.18}>AWD (Manual, High RWD Auto - 18%)</option>
                    <option value={0.22}>AWD (Automatic/Heavy - 22%)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Used to convert expected wheel power to engine horsepower.</p>
            </div>

            <button
                className="mt-6 bg-gradient-to-r from-[var(--color-neon-blue)] to-blue-600 text-black font-bold py-4 px-6 rounded-lg w-full active:scale-95 transition-transform shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                onClick={onStart}
            >
                Start Calibration
            </button>
        </div>
    );
}
