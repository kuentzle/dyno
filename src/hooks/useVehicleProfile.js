import { useState, useEffect } from 'react';
const DEFAULT_PROFILE = {
    massKg: 1500,
    dragCoefficient: 0.30,
    frontalAreaM2: 2.2,
    drivetrainLoss: 0.15, // 15% manual FWD default
};
export function useVehicleProfile() {
    const [profile, setProfile] = useState(() => {
        const saved = localStorage.getItem('power_meter_profile');
        if (saved) {
            try {
                return JSON.parse(saved);
            }
            catch (e) {
                return DEFAULT_PROFILE;
            }
        }
        return DEFAULT_PROFILE;
    });
    useEffect(() => {
        localStorage.setItem('power_meter_profile', JSON.stringify(profile));
    }, [profile]);
    return { profile, setProfile };
}
