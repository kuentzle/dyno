import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useVehicleProfile } from './hooks/useVehicleProfile';
import { ProfileForm } from './components/ProfileForm';
import { useWakeLock } from './hooks/useWakeLock';
import { useVehicleTelemetry } from './hooks/useVehicleTelemetry';
import { Dashboard } from './components/Dashboard';
export default function App() {
    const [activeTab, setActiveTab] = useState('profile');
    const { profile, setProfile } = useVehicleProfile();
    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    const telemetry = useVehicleTelemetry(profile);
    useEffect(() => {
        if (activeTab === 'measuring') {
            requestWakeLock();
            telemetry.reset(); // Restart calibration on enter
        }
        else {
            releaseWakeLock();
        }
    }, [activeTab, requestWakeLock, releaseWakeLock, telemetry.reset]);
    const handleProfileChange = (key, value) => {
        setProfile(prev => ({ ...prev, [key]: value }));
    };
    return (_jsxs("div", { className: "min-h-screen bg-[var(--color-dark-bg)] w-full flex flex-col items-center justify-center p-4", children: [activeTab === 'profile' && (_jsxs("h1", { className: "text-2xl font-bold mb-8 text-glow text-[var(--color-neon-blue)] tracking-widest", children: ["DYNO ", _jsx("span", { className: "text-white", children: "PRO" })] })), activeTab === 'profile' ? (_jsx(ProfileForm, { profile: profile, onChange: handleProfileChange, onStart: () => setActiveTab('measuring') })) : (_jsx(Dashboard, { telemetry: telemetry, profile: profile, onBack: () => setActiveTab('profile') }))] }));
}
