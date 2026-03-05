import React, { useMemo } from 'react';
import { useVehicleTelemetry } from '../hooks/useVehicleTelemetry';
import { VehicleProfile } from '../hooks/useVehicleProfile';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Gauge } from './Gauge';

interface DashboardProps {
    telemetry: ReturnType<typeof useVehicleTelemetry>;
    profile: VehicleProfile;
    onBack: () => void;
}

export function Dashboard({ telemetry, profile, onBack }: DashboardProps) {
    const {
        currentEmaPS, currentBwPS, maxEmaPS, maxBwPS, speedKmh, fusionSpeedKmh, hasPermission, requestPermissions,
        isCalibrating, calibProgress, calibrationError, debugLog, gForce,
        history, isPaused, togglePause, rawForwardA, emaA, bwA, resetMaxEmaPS, resetMaxBwPS
    } = telemetry;

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
                {calibrationError ? (
                    <div>
                        <h2 className="text-xl font-bold text-red-500">Sensor Error</h2>
                        <p className="text-sm text-gray-400 mt-2">{calibrationError}</p>
                        <div className="p-2 bg-black/50 text-xs font-mono text-left text-gray-500 mt-4 rounded w-full overflow-hidden truncate">Log: {debugLog}</div>
                        <button onClick={onBack} className="mt-4 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-2 px-6 rounded-lg w-full active:scale-95 transition-all">Back to Setup</button>
                    </div>
                ) : (
                    <>
                        <div className="relative rounded-full h-16 w-16 border-4 border-zinc-800 border-solid flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-t-4 border-[var(--color-neon-blue)] animate-spin"></div>
                            <span className="text-xs font-bold text-[var(--color-neon-blue)]">{calibProgress}%</span>
                        </div>
                        <div className="w-full">
                            <h2 className="text-xl font-bold text-glow text-[var(--color-neon-blue)]">Calibrating...</h2>
                            <p className="text-sm text-gray-400 mt-2">Please keep your phone completely still in the mount.</p>
                            <div className="p-2 bg-black/50 text-xs font-mono text-left text-gray-500 mt-4 rounded w-full overflow-hidden truncate transition-all">
                                {debugLog}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Find peak data points in history for annotations
    const peakEngineEmaPoint = useMemo(() => {
        if (!history || history.length === 0) return null;
        return history.reduce((max, pt) => pt.enginePsEma > (max?.enginePsEma ?? 0) ? pt : max, history[0]);
    }, [history]);

    const peakEngineBwPoint = useMemo(() => {
        if (!history || history.length === 0) return null;
        return history.reduce((max, pt) => pt.enginePsBw > (max?.enginePsBw ?? 0) ? pt : max, history[0]);
    }, [history]);

    const peakSpeedPoint = useMemo(() => {
        if (!history || history.length === 0) return null;
        return history.reduce((max, pt) => pt.speed > (max?.speed ?? 0) ? pt : max, history[0]);
    }, [history]);

    // Visual debug: green = positive forwardA (gas), red = negative (braking)
    // 1G (9.81 m/s²) = 100% full intensity (alpha 0.25)
    const intensity = Math.min(Math.abs(rawForwardA) / 9.81, 1);
    const bgColor = rawForwardA > 0.05
        ? `rgba(0, 255, 0, ${intensity * 0.25})`
        : rawForwardA < -0.05
            ? `rgba(255, 0, 0, ${intensity * 0.25})`
            : 'transparent';

    return (
        <div className="absolute inset-0 overflow-y-auto w-full flex flex-col items-center gap-4 pb-12 pt-4 px-2" style={{ backgroundColor: bgColor, transition: 'background-color 0.1s' }}>

            {/* HUD GAUGES */}
            <div className="flex flex-col gap-2 justify-center w-full">
                <div className="flex gap-2 justify-center">
                    <Gauge title="EMA Engine" value={currentEmaPS} maxValue={maxEmaPS} unit="PS" color="var(--color-neon-blue)" />
                    <Gauge title="EMA Wheel" value={currentEmaPS * (1 - profile.drivetrainLoss)} maxValue={maxEmaPS * (1 - profile.drivetrainLoss)} unit="PS" color="#ff0055" />
                </div>
                <div className="flex gap-2 justify-center">
                    <Gauge title="BW Engine" value={currentBwPS} maxValue={maxBwPS} unit="PS" color="#00ffcc" />
                    <Gauge title="BW Wheel" value={currentBwPS * (1 - profile.drivetrainLoss)} maxValue={maxBwPS * (1 - profile.drivetrainLoss)} unit="PS" color="#ffaa00" />
                </div>
            </div>

            <div className="flex w-full max-w-sm gap-3 mt-2">
                {/* SPEED MODULE */}
                <div className="flex-1 glass-panel p-2 flex flex-col items-center justify-center gap-1">
                    {/* FUSION SPEED (Big) */}
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-3xl font-mono font-bold text-white tracking-tighter">
                            {Math.round(fusionSpeedKmh)}
                        </span>
                        <span className="text-[9px] text-[var(--color-neon-blue)] uppercase tracking-widest mt-1 font-bold">Fusion km/h</span>
                    </div>
                    {/* GPS SPEED (Small reference) */}
                    <div className="flex flex-col items-center leading-none mt-1 pt-1 border-t border-zinc-800 w-full">
                        <span className="text-sm font-mono font-bold text-gray-400 tracking-tighter">
                            {Math.round(speedKmh)}
                        </span>
                        <span className="text-[8px] text-gray-600 uppercase tracking-widest">GPS km/h</span>
                    </div>
                </div>

                {/* PEAK HP EMA */}
                <div
                    className="flex-1 glass-panel p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={resetMaxEmaPS}
                >
                    <span className="text-2xl font-mono font-bold text-[var(--color-neon-blue)] tracking-tighter">
                        {Math.round(maxEmaPS)}
                    </span>
                    <span className="text-[10px] text-[var(--color-neon-blue)] uppercase tracking-widest mt-1">Peak EMA</span>
                </div>

                {/* PEAK HP BW */}
                <div
                    className="flex-1 glass-panel p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={resetMaxBwPS}
                >
                    <span className="text-2xl font-mono font-bold text-[#00ffcc] tracking-tighter">
                        {Math.round(maxBwPS)}
                    </span>
                    <span className="text-[10px] text-[#00ffcc] uppercase tracking-widest mt-1">Peak BW</span>
                </div>
            </div>

            {/* INTERACTIVE GRAPH */}
            <div className="w-full max-w-sm glass-panel p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold tracking-wider uppercase">
                        <span className="text-[var(--color-neon-blue)]">Engine (EMA)</span>
                        <span className="text-[#00ffcc]">Engine (BW)</span>
                        <span className="text-[#ff0055]">Wheel (EMA)</span>
                        <span className="text-[#ffaa00]">Wheel (BW)</span>
                        <span className="text-[#00ffcc]">Fusion Spd</span>
                        <span className="text-white">GPS Spd</span>
                    </div>
                </div>

                <div className="w-full h-48 bg-black/40 rounded border border-zinc-800 overflow-hidden relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                                dataKey="time"
                                tick={false}
                                axisLine={false}
                            />
                            <YAxis
                                yAxisId="left"
                                tickFormatter={(val) => Math.round(val).toString()}
                                stroke="#666"
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={(val) => Math.round(val).toString()}
                                stroke="#666"
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value: any, name: any) => {
                                    const names: any = { enginePsEma: 'Engine EMA', wheelPsEma: 'Wheel EMA', enginePsBw: 'Engine BW', wheelPsBw: 'Wheel BW', speed: 'GPS km/h', fusionSpeedKmh: 'Fusion km/h' };
                                    return [Math.round(value as number), names[name] || name];
                                }}
                            />
                            <Line yAxisId="left" type="monotone" dataKey="enginePsEma" stroke="var(--color-neon-blue)" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line yAxisId="left" type="monotone" dataKey="wheelPsEma" stroke="#ff0055" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line yAxisId="left" type="monotone" dataKey="enginePsBw" stroke="#00ffcc" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line yAxisId="left" type="monotone" dataKey="wheelPsBw" stroke="#ffaa00" strokeWidth={2} dot={false} isAnimationActive={false} />

                            <Line yAxisId="right" type="monotone" dataKey="fusionSpeedKmh" stroke="#00ffcc" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line yAxisId="right" type="monotone" dataKey="speed" stroke="#ffffff" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} opacity={0.5} />

                            {/* Peak annotations */}
                            {peakEngineEmaPoint && peakEngineEmaPoint.enginePsEma > 0 && (
                                <ReferenceDot yAxisId="left" x={peakEngineEmaPoint.time} y={peakEngineEmaPoint.enginePsEma} r={3} fill="var(--color-neon-blue)" stroke="none"
                                    label={{ value: `${Math.round(peakEngineEmaPoint.enginePsEma)}`, position: 'top', fill: 'var(--color-neon-blue)', fontSize: 9, fontWeight: 'bold' }} />
                            )}
                            {peakEngineBwPoint && peakEngineBwPoint.enginePsBw > 0 && (
                                <ReferenceDot yAxisId="left" x={peakEngineBwPoint.time} y={peakEngineBwPoint.enginePsBw} r={3} fill="#00ffcc" stroke="none"
                                    label={{ value: `${Math.round(peakEngineBwPoint.enginePsBw)}`, position: 'bottom', fill: '#00ffcc', fontSize: 9, fontWeight: 'bold' }} />
                            )}
                            {peakSpeedPoint && peakSpeedPoint.speed > 0 && (
                                <ReferenceDot yAxisId="right" x={peakSpeedPoint.time} y={peakSpeedPoint.speed} r={2} fill="#ffffff" stroke="none"
                                    label={{ value: `${Math.round(peakSpeedPoint.speed)} km/h`, position: 'right', fill: '#ffffff', fontSize: 8, fontWeight: 'bold' }} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <button
                    onClick={togglePause}
                    className={`w-full py-3 rounded-lg font-bold tracking-widest text-sm transition-all ${isPaused
                        ? 'bg-[var(--color-neon-blue)] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                        : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                        }`}
                >
                    {isPaused ? '▶ RESUME RECORDING' : '⏸ PAUSE & EXPLORE'}
                </button>

                {/* ACCELERATION GRAPH (10s window) */}
                <div className="w-full mt-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 text-center">Acceleration (10s)</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={history.slice(-150)} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                            <XAxis dataKey="time" hide />
                            <YAxis
                                orientation="right"
                                stroke="#ffd700"
                                tick={{ fill: '#ffd700', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: 'G-Force', angle: 90, position: 'insideRight', fill: '#ffd700', fontSize: 9, offset: 15 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                labelStyle={{ display: 'none' }}
                                formatter={(value: any, name: any) => {
                                    const labels: any = { gFwd: 'Raw G', emaA: 'EMA', bwA: 'Butterworth', aY: 'forwardA' };
                                    return [Number(value).toFixed(3), labels[name] || name];
                                }}
                            />
                            {/* Raw G Force (Original) */}
                            <Line type="monotone" dataKey="gFwd" stroke="#555555" strokeWidth={1} dot={false} isAnimationActive={false} />

                            {/* raw forwardA = Purple */}
                            <Line type="monotone" dataKey="aY" stroke="#9d00ff" strokeWidth={1.5} dot={false} isAnimationActive={false} opacity={0.5} />

                            {/* EMA = Neon Blue */}
                            <Line type="monotone" dataKey="emaA" stroke="var(--color-neon-blue)" strokeWidth={2} dot={false} isAnimationActive={false} />

                            {/* Butterworth = Neon Green/Cyan */}
                            <Line type="monotone" dataKey="bwA" stroke="#00ffcc" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* COLOR-CODED LEGEND / LIVE VALUES */}
                <div className="w-full flex flex-col px-4 mt-2 mb-2 text-[11px] font-mono gap-1 leading-tight bg-black/40 p-2 rounded-lg border border-zinc-800">
                    <div className="flex w-full justify-between">
                        <span style={{ color: 'var(--color-neon-blue)' }}>EMA: {emaA.toFixed(3)}</span>
                        <span style={{ color: '#00ffcc' }}>BW: {bwA.toFixed(3)}</span>
                    </div>
                    <div className="flex w-full justify-center mt-1 border-t border-zinc-800 pt-1">
                        <span style={{ color: '#9d00ff', fontWeight: 'bold' }}>forwardA (m/s²): {rawForwardA.toFixed(3)}</span>
                    </div>
                </div>
            </div>

            <button
                className="mt-2 text-gray-300 font-bold py-3 px-8 rounded-full border border-zinc-700 hover:bg-zinc-800 active:scale-95 transition-all text-sm tracking-widest mb-4"
                onClick={onBack}
            >
                END SESSION
            </button>

            {/* Debug Raw Values */}
            <div className="p-3 w-full max-w-sm bg-black/50 border border-zinc-800 rounded-lg text-xs font-mono text-gray-500 break-words opacity-70 mb-8">
                RAW: {debugLog}
            </div>

        </div>
    );
}
