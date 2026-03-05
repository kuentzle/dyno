import { useState, useEffect, useCallback } from 'react';

export interface VehicleProfile {
    massKg: number;
    dragCoefficient: number;
    frontalAreaM2: number;
    drivetrainLoss: number;
}

export const DEFAULT_PROFILE: VehicleProfile = {
    massKg: 2370,
    dragCoefficient: 0.32,
    frontalAreaM2: 2.83,
    drivetrainLoss: 0.15, // 15% manual FWD default
};

export function useVehicleProfile() {
    const [profile, setProfile] = useState<VehicleProfile>(() => {
        const saved = localStorage.getItem('power_meter_profile');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return DEFAULT_PROFILE;
            }
        }
        return DEFAULT_PROFILE;
    });

    useEffect(() => {
        localStorage.setItem('power_meter_profile', JSON.stringify(profile));
    }, [profile]);

    const resetProfile = useCallback(() => {
        localStorage.removeItem('power_meter_profile');
        setProfile(DEFAULT_PROFILE);
    }, []);

    return { profile, setProfile, resetProfile };
}
