import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateEnginePower, msToKmh, wattsToPS, ButterworthFilter } from '../utils/physics';
const SMOOTHING_WINDOW = 12; // ~200ms at 60Hz sensor rate
export function useVehicleTelemetry(profile) {
    const [speedKmh, setSpeedKmh] = useState(0);
    const [fusionSpeedKmh, setFusionSpeedKmh] = useState(0);
    const [currentEmaPS, setCurrentEmaPS] = useState(0);
    const [currentBwPS, setCurrentBwPS] = useState(0);
    const [currentFusionEmaPS, setCurrentFusionEmaPS] = useState(0);
    const [currentFusionBwPS, setCurrentFusionBwPS] = useState(0);
    const [maxEmaPS, setMaxEmaPS] = useState(0);
    const [maxBwPS, setMaxBwPS] = useState(0);
    const [maxFusionEmaPS, setMaxFusionEmaPS] = useState(0);
    const [maxFusionBwPS, setMaxFusionBwPS] = useState(0);
    const [rawForwardA, setRawForwardA] = useState(0);
    const [emaA, setEmaA] = useState(0);
    const [bwA, setBwA] = useState(0);
    const [gForce, setGForce] = useState(0);
    const [isCalibrating, setIsCalibrating] = useState(true);
    const [calibProgress, setCalibProgress] = useState(0);
    const [calibrationError, setCalibrationError] = useState('');
    const [gravityVec, setGravityVec] = useState(null);
    const [hasPermission, setHasPermission] = useState(null);
    const [debugLog, setDebugLog] = useState("Waiting for permission...");
    const [history, setHistory] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const requestPermissions = useCallback(async () => {
        setDebugLog("Requesting permissions...");
        // @ts-ignore
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                // @ts-ignore
                const permission = await DeviceMotionEvent.requestPermission();
                setDebugLog(`Permission request result: ${permission}`);
                if (permission === 'granted') {
                    setHasPermission(true);
                }
                else {
                    setHasPermission(false);
                    setCalibrationError("Sensor permission denied by user.");
                }
            }
            catch (e) {
                console.error(e);
                setDebugLog(`Permission error: ${e.message || String(e)}`);
                setHasPermission(false);
            }
        }
        else {
            setDebugLog("DeviceMotionEvent.requestPermission not found. Assuming permitted.");
            setHasPermission(true);
        }
    }, []);
    // --- GPS SPEED (Reference) ---
    useEffect(() => {
        if (hasPermission === false)
            return;
        const geoId = navigator.geolocation.watchPosition((pos) => {
            const speedMs = pos.coords.speed || 0;
            setSpeedKmh(msToKmh(speedMs));
        }, (err) => console.warn('GPS Error', err), { enableHighAccuracy: true, maximumAge: 0 });
        return () => navigator.geolocation.clearWatch(geoId);
    }, [hasPermission]);
    const stateRef = useRef({ isCalibrating, gravityVec, speedKmh, fusionSpeedKmh, profile, maxEmaPS, maxBwPS, maxFusionEmaPS, maxFusionBwPS, isPaused });
    useEffect(() => {
        stateRef.current = { isCalibrating, gravityVec, speedKmh, fusionSpeedKmh, profile, maxEmaPS, maxBwPS, maxFusionEmaPS, maxFusionBwPS, isPaused };
    }, [isCalibrating, gravityVec, speedKmh, fusionSpeedKmh, profile, maxEmaPS, maxBwPS, maxFusionEmaPS, maxFusionBwPS, isPaused]);
    // --- ACCELEROMETER FUSION ---
    useEffect(() => {
        if (hasPermission !== true)
            return;
        setDebugLog("Permission granted. Listening for devicemotion...");
        let calibSamples = [];
        const MAX_SAMPLES = 60;
        let lastUiUpdate = 0;
        let nullEventsCount = 0;
        let totalEventsCount = 0;
        let emaFilterValue = 0;
        const ALPHA = 0.05;
        const bwFilter = new ButterworthFilter();
        // Fusion Speed Variables
        let lastMotionTime = performance.now();
        let currentFusionSpeedMs = 0;
        const COMPLEMENTARY_ALPHA = 0.98; // 98% trust in integrated accelerometer, 2% trust in GPS
        const handleMotion = (event) => {
            const nowTime = performance.now();
            const dt = (nowTime - lastMotionTime) / 1000; // in seconds
            lastMotionTime = nowTime;
            totalEventsCount++;
            const state = stateRef.current;
            const accWithGravity = event.accelerationIncludingGravity;
            const pureAcc = event.acceleration;
            // Stop if the device gives zero physical sensor data 
            if (!accWithGravity || accWithGravity.x === null || accWithGravity.y === null || accWithGravity.z === null) {
                nullEventsCount++;
                if (nullEventsCount === 10) {
                    setCalibrationError(`No valid sensor data in ${totalEventsCount} events. Is this a PC?`);
                    setDebugLog(`Null data. acc: ${!!accWithGravity}, x: ${accWithGravity?.x}, y: ${accWithGravity?.y}, z: ${accWithGravity?.z}`);
                }
                return;
            }
            // G-Force is calculated *including* gravity, so resting flat on a table shows ~1.0 G.
            let gForceMag = 0;
            if (accWithGravity && accWithGravity.x !== null && accWithGravity.y !== null && accWithGravity.z !== null) {
                gForceMag = Math.sqrt(accWithGravity.x ** 2 + accWithGravity.y ** 2 + accWithGravity.z ** 2) / 9.81;
            }
            // During calibration, we MUST use the vector WITH gravity to find out which way is "down"!
            if (state.isCalibrating) {
                calibSamples.push({ x: accWithGravity.x, y: accWithGravity.y, z: accWithGravity.z });
                const now = Date.now();
                if (now - lastUiUpdate > 100) {
                    setCalibProgress(Math.min(100, Math.round((calibSamples.length / MAX_SAMPLES) * 100)));
                    setDebugLog(`Calibrating... ${calibSamples.length}/${MAX_SAMPLES}. Z=${accWithGravity.z?.toFixed(2)}`);
                    lastUiUpdate = now;
                }
                if (calibSamples.length >= MAX_SAMPLES) {
                    const gx = calibSamples.reduce((sum, v) => sum + v.x, 0) / MAX_SAMPLES;
                    const gy = calibSamples.reduce((sum, v) => sum + v.y, 0) / MAX_SAMPLES;
                    const gz = calibSamples.reduce((sum, v) => sum + v.z, 0) / MAX_SAMPLES;
                    const mag = Math.sqrt(gx * gx + gy * gy + gz * gz);
                    if (mag > 0.5) {
                        // Store the unit gravity vector (pointing "down" in phone coords)
                        const gUnit = { x: gx / mag, y: gy / mag, z: gz / mag };
                        // Compute the forward direction vector in the YZ-plane.
                        // Forward = component of the YZ plane that is perpendicular to gravity.
                        // We project gravity out of the YZ plane's "forward candidate" direction.
                        // If phone is flat: gravity is mostly Z, so forward ≈ Y
                        // If phone is upright: gravity is mostly Y, so forward ≈ Z (through screen)
                        const fwdY = -gUnit.z; // perpendicular to gravity in YZ plane
                        const fwdZ = gUnit.y;
                        const fwdMag = Math.sqrt(fwdY * fwdY + fwdZ * fwdZ);
                        // Store both gravity unit vector and forward unit vector
                        setGravityVec({
                            x: gUnit.x, y: gUnit.y, z: gUnit.z,
                            // Store computed forward direction in YZ plane
                            fwdY: fwdMag > 0.01 ? fwdY / fwdMag : 0,
                            fwdZ: fwdMag > 0.01 ? fwdZ / fwdMag : 1
                        });
                        setDebugLog(`Calibrated! Gravity: [${gUnit.x.toFixed(2)}, ${gUnit.y.toFixed(2)}, ${gUnit.z.toFixed(2)}] Fwd: [Y=${(fwdMag > 0.01 ? fwdY / fwdMag : 0).toFixed(2)}, Z=${(fwdMag > 0.01 ? fwdZ / fwdMag : 1).toFixed(2)}]`);
                        setIsCalibrating(false);
                        calibSamples = []; // Clear so it's ready for the NEXT session
                    }
                    else {
                        setCalibProgress(0);
                        calibSamples = [];
                        setCalibrationError("Calibration failed: Gravity vector too weak. Is it in freefall?");
                    }
                }
                return;
            }
            if (!state.gravityVec)
                return;
            // --- FORWARD ACCELERATION via YZ-plane gravity projection ---
            // Always use accWithGravity and manually subtract calibrated gravity
            // (event.acceleration is unreliable on some Android devices)
            const gVec = state.gravityVec;
            const ay = accWithGravity.y - gVec.y * 9.81;
            const az = accWithGravity.z - gVec.z * 9.81;
            // Project acceleration onto forward direction, negated (confirmed by user test: braking=positive raw)
            const forwardA = -(ay * (gVec.fwdY ?? 0) + az * (gVec.fwdZ ?? 1));
            // Apply dual filters
            emaFilterValue = emaFilterValue === 0 ? forwardA : ALPHA * forwardA + (1 - ALPHA) * emaFilterValue;
            const bwFilterValue = bwFilter.filter(forwardA);
            // --- FUSION SPEED CALCULATION (Complementary Filter) ---
            // 1. Integrate the clean acceleration (Butterworth) to get temporary speed
            // dt is typically ~0.016s (60Hz)
            if (!state.isCalibrating && dt > 0 && dt < 0.1) {
                currentFusionSpeedMs += bwFilterValue * dt;
                // Prevent going strictly backwards if we expect forward motion only (optional, but good for Dynos)
                if (currentFusionSpeedMs < 0)
                    currentFusionSpeedMs = 0;
            }
            // 2. Complementary Filter magic: slowly pull the fusion speed towards the rock-solid GPS speed
            // If GPS says 50km/h (13.89 m/s) and we integrated 52km/h (14.44 m/s), 
            // this gently corrects the drift every frame without snapping
            const gpsSpeedMs = state.speedKmh / 3.6;
            currentFusionSpeedMs = COMPLEMENTARY_ALPHA * currentFusionSpeedMs + (1 - COMPLEMENTARY_ALPHA) * gpsSpeedMs;
            const fusionKmh = currentFusionSpeedMs * 3.6;
            // --- DEFAULT POWER (GPS SPEED) ---
            const wattsScaleBaseEma = calculateEnginePower(emaFilterValue, gpsSpeedMs, state.profile);
            const enginePsEma = Math.max(0, wattsToPS(wattsScaleBaseEma));
            const wheelPsEma = Math.max(0, enginePsEma * (1 - state.profile.drivetrainLoss));
            const wattsScaleBaseBw = calculateEnginePower(bwFilterValue, gpsSpeedMs, state.profile);
            const enginePsBw = Math.max(0, wattsToPS(wattsScaleBaseBw));
            const wheelPsBw = Math.max(0, enginePsBw * (1 - state.profile.drivetrainLoss));
            // --- FUSION POWER (FUSION SPEED) ---
            const wattsScaleFusionEma = calculateEnginePower(emaFilterValue, currentFusionSpeedMs, state.profile);
            const fusionEnginePsEma = Math.max(0, wattsToPS(wattsScaleFusionEma));
            const wattsScaleFusionBw = calculateEnginePower(bwFilterValue, currentFusionSpeedMs, state.profile);
            const fusionEnginePsBw = Math.max(0, wattsToPS(wattsScaleFusionBw));
            const now = Date.now();
            // Push to rolling history for the debug graph (~15fps update rate is fine to match UI)
            if (now - lastUiUpdate > 66) {
                if (!state.isPaused) {
                    setGForce(gForceMag);
                    setRawForwardA(forwardA);
                    setEmaA(emaFilterValue);
                    setBwA(bwFilterValue);
                    setCurrentEmaPS(enginePsEma);
                    setCurrentBwPS(enginePsBw);
                    setCurrentFusionEmaPS(fusionEnginePsEma);
                    setCurrentFusionBwPS(fusionEnginePsBw);
                    setHistory(prev => {
                        const next = [...prev, {
                                time: now,
                                aY: forwardA,
                                gFwd: forwardA / 9.81,
                                emaA: emaFilterValue,
                                bwA: bwFilterValue,
                                speed: state.speedKmh,
                                fusionSpeedKmh: fusionKmh,
                                wheelPsEma: wheelPsEma,
                                enginePsEma: enginePsEma,
                                wheelPsBw: wheelPsBw,
                                enginePsBw: enginePsBw,
                                fusionEnginePsEma: fusionEnginePsEma,
                                fusionEnginePsBw: fusionEnginePsBw,
                            }];
                        // Store up to 300 points (approx 20 seconds at 15fps)
                        if (next.length > 300)
                            next.shift();
                        return next;
                    });
                    if (enginePsEma > state.maxEmaPS)
                        setMaxEmaPS(enginePsEma);
                    if (enginePsBw > state.maxBwPS)
                        setMaxBwPS(enginePsBw);
                    if (fusionEnginePsEma > state.maxFusionEmaPS)
                        setMaxFusionEmaPS(fusionEnginePsEma);
                    if (fusionEnginePsBw > state.maxFusionBwPS)
                        setMaxFusionBwPS(fusionEnginePsBw);
                    setDebugLog(`Running... fwdA: ${forwardA.toFixed(2)} | EMA: ${emaFilterValue.toFixed(2)} | BW: ${bwFilterValue.toFixed(2)}`);
                }
                lastUiUpdate = now;
                totalEventsCount = 0; // Reset counter for events/sec estimate
            }
        };
        // Add a timeout to check if we received ANY events at all
        const timeoutId = setTimeout(() => {
            if (totalEventsCount === 0) {
                setCalibrationError("No motion events received after 3 seconds. Browser might be blocking the sensor.");
                setDebugLog("Event listener attached but 0 events fired. Check generic iOS settings -> Safari -> Motion & Orientation Access");
            }
        }, 3000);
        window.addEventListener('devicemotion', handleMotion);
        return () => {
            window.removeEventListener('devicemotion', handleMotion);
            clearTimeout(timeoutId);
        };
    }, [hasPermission]);
    const reset = useCallback(() => {
        setIsCalibrating(true);
        setCalibProgress(0);
        setCalibrationError('');
        setGravityVec(null);
        setMaxEmaPS(0);
        setMaxBwPS(0);
        setMaxFusionEmaPS(0);
        setMaxFusionBwPS(0);
        setCurrentEmaPS(0);
        setCurrentBwPS(0);
        setCurrentFusionEmaPS(0);
        setCurrentFusionBwPS(0);
        setFusionSpeedKmh(0);
        setHistory([]);
        setIsPaused(false);
        setDebugLog("Reset calibration.");
    }, []);
    const resetMaxEmaPS = useCallback(() => setMaxEmaPS(0), []);
    const resetMaxBwPS = useCallback(() => setMaxBwPS(0), []);
    const resetMaxFusionEmaPS = useCallback(() => setMaxFusionEmaPS(0), []);
    const resetMaxFusionBwPS = useCallback(() => setMaxFusionBwPS(0), []);
    const togglePause = useCallback(() => {
        setIsPaused(p => !p);
    }, []);
    return {
        isCalibrating,
        calibProgress,
        calibrationError,
        debugLog,
        hasPermission,
        requestPermissions,
        speedKmh,
        fusionSpeedKmh,
        currentEmaPS,
        currentBwPS,
        currentFusionEmaPS,
        currentFusionBwPS,
        maxEmaPS,
        maxBwPS,
        maxFusionEmaPS,
        maxFusionBwPS,
        gForce,
        rawForwardA,
        emaA,
        bwA,
        resetMaxEmaPS,
        resetMaxBwPS,
        resetMaxFusionEmaPS,
        resetMaxFusionBwPS,
        history,
        isPaused,
        togglePause,
        reset
    };
}
