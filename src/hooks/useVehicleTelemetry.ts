import { useState, useCallback, useEffect } from 'react';
import { calculateEnginePower, msToKmh, wattsToPS } from '../utils/physics';
import { VehicleProfile } from './useVehicleProfile';

// Smoothing factor for acceleration (Low Pass Filter), 0-1
const ALPHA = 0.2;

export function useVehicleTelemetry(profile: VehicleProfile) {
    const [speedKmh, setSpeedKmh] = useState(0);
    const [currentPS, setCurrentPS] = useState(0);
    const [maxPS, setMaxPS] = useState(0);

    const [accelForward, setAccelForward] = useState(0);
    const [accelSmoothed, setAccelSmoothed] = useState(0);
    const [gForce, setGForce] = useState(0);

    const [isCalibrating, setIsCalibrating] = useState(true);
    const [gravityVec, setGravityVec] = useState<{ x: number, y: number, z: number } | null>(null);

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    // Request iOS 13+ DeviceMotion permission
    const requestPermissions = useCallback(async () => {
        // @ts-ignore
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                // @ts-ignore
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission === 'granted') {
                    setHasPermission(true);
                } else {
                    setHasPermission(false);
                    alert("Sensor permission denied.");
                }
            } catch (e) {
                console.error(e);
                setHasPermission(false);
            }
        } else {
            // Non iOS 13+ devices
            setHasPermission(true);
        }
    }, []);

    // --- GPS SPEED (Reference) ---
    useEffect(() => {
        if (hasPermission === false) return;

        const geoId = navigator.geolocation.watchPosition(
            (pos) => {
                // GPS Speed is in m/s
                const speedMs = pos.coords.speed || 0;
                setSpeedKmh(msToKmh(speedMs));
            },
            (err) => console.warn('GPS Error', err),
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(geoId);
    }, [hasPermission]);

    // --- ACCELEROMETER FUSION ---
    useEffect(() => {
        if (hasPermission !== true) return;

        // Calibration buffers
        let calibSamples: { x: number, y: number, z: number }[] = [];
        const MAX_SAMPLES = 60; // ≈ 1 second of data if 60hz

        let prevAccelSmooth = 0;

        const handleMotion = (event: DeviceMotionEvent) => {
            const acc = event.accelerationIncludingGravity;
            if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

            // Calculate total G-Force (magnitude of acceleration without gravity roughly)
            // Usually, device provides 'acceleration' (without G) but it's often noisy or unsupported.
            const pureAcc = event.acceleration;
            if (pureAcc && pureAcc.x !== null && pureAcc.y !== null && pureAcc.z !== null) {
                const mag = Math.sqrt(pureAcc.x ** 2 + pureAcc.y ** 2 + pureAcc.z ** 2) / 9.81;
                setGForce(mag);
            }

            if (isCalibrating) {
                calibSamples.push({ x: acc.x, y: acc.y, z: acc.z });

                if (calibSamples.length >= MAX_SAMPLES) {
                    // Average the gravity vector
                    const gx = calibSamples.reduce((sum, v) => sum + v.x, 0) / MAX_SAMPLES;
                    const gy = calibSamples.reduce((sum, v) => sum + v.y, 0) / MAX_SAMPLES;
                    const gz = calibSamples.reduce((sum, v) => sum + v.z, 0) / MAX_SAMPLES;

                    // Normalize gravity vector
                    const mag = Math.sqrt(gx * gx + gy * gy + gz * gz);
                    setGravityVec({ x: gx / mag, y: gy / mag, z: gz / mag });
                    setIsCalibrating(false);
                }
                return;
            }

            // If calibrated, extract forward acceleration
            if (!gravityVec) return;

            // Basic projection: Real acceleration = Total Accel - Gravity (approx 9.81 on the gravity vector)
            // Actually event.acceleration has gravity removed, we should prefer it if available:
            let aX = pureAcc?.x ?? (acc.x - gravityVec.x * 9.81);
            let aY = pureAcc?.y ?? (acc.y - gravityVec.y * 9.81);
            let aZ = pureAcc?.z ?? (acc.z - gravityVec.z * 9.81);

            // We assume the phone is fixed. Forward acceleration is mostly Y (if phone vertical in holder) 
            // or Z (if phone flat). For simplicity in this demo, we'll take the largest horizontal component 
            // relative to gravity, or just use `aY` assuming standard mount.
            // Let's take the dominant non-gravity axis dynamically based on calibration:
            // A more robust way is to just use the magnitude of horizontal acceleration, but it strips sign (braking vs accel).
            // For now, assume Y is forward (typical phone dashboard mount).
            let forwardA = aY;
            // If phone is flat (z is gravity), then Y is still forward.

            // Low Pass Filter to smooth out engine vibrations
            prevAccelSmooth = (ALPHA * forwardA) + (1 - ALPHA) * prevAccelSmooth;

            setAccelForward(forwardA);
            setAccelSmoothed(prevAccelSmooth);

            // --- CALCULATE POWER ---
            // Convert km/h back to m/s for physics
            // Note: We are using State speedKmh, which updates slower (1Hz) than this function (60Hz).
            // In a pro version, we would integrate accelSmoothed into speed continuously and complement with GPS.
            const speedMs = speedKmh / 3.6;

            const watts = calculateEnginePower(prevAccelSmooth, speedMs, profile);
            const ps = wattsToPS(watts);

            setCurrentPS(Math.max(0, ps));
            if (ps > maxPS) {
                setMaxPS(ps);
            }
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [hasPermission, isCalibrating, gravityVec, speedKmh, profile, maxPS]);

    // Expose a way to reset calibration and max values
    const reset = useCallback(() => {
        setIsCalibrating(true);
        setGravityVec(null);
        setMaxPS(0);
        setCurrentPS(0);
    }, []);

    return {
        isCalibrating,
        hasPermission,
        requestPermissions,
        speedKmh,
        currentPS,
        maxPS,
        gForce,
        accelSmoothed,
        reset
    };
}
