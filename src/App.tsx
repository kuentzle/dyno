declare const __BUILD_DATE__: string;
import React, { useState, useEffect } from 'react'
import { useVehicleProfile } from './hooks/useVehicleProfile'
import { ProfileForm } from './components/ProfileForm'
import { useWakeLock } from './hooks/useWakeLock'
import { useVehicleTelemetry } from './hooks/useVehicleTelemetry'
import { Dashboard } from './components/Dashboard'

export default function App() {
    const [activeTab, setActiveTab] = useState<'profile' | 'measuring'>('profile');
    const { profile, setProfile, resetProfile } = useVehicleProfile();
    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    const telemetry = useVehicleTelemetry(profile);

    useEffect(() => {
        if (activeTab === 'measuring') {
            requestWakeLock();
            telemetry.reset(); // Restart calibration on enter
        } else {
            releaseWakeLock();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const handleProfileChange = (key: keyof typeof profile, value: number) => {
        setProfile(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-[var(--color-dark-bg)] w-full flex flex-col items-center p-4 overflow-y-auto relative">
            <div className="absolute top-2 right-3 text-[10px] text-gray-600 font-mono">{__BUILD_DATE__}</div>
            {activeTab === 'profile' && (
                <h1 className="text-2xl font-bold mb-8 text-glow text-[var(--color-neon-blue)] tracking-widest">DYNO <span className="text-white">PRO</span></h1>
            )}

            {activeTab === 'profile' ? (
                <ProfileForm
                    profile={profile}
                    onChange={handleProfileChange}
                    onStart={() => setActiveTab('measuring')}
                    onReset={resetProfile}
                />
            ) : (
                <Dashboard
                    telemetry={telemetry}
                    profile={profile}
                    onBack={() => setActiveTab('profile')}
                />
            )}
        </div>
    )
}
