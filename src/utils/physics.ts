import { VehicleProfile } from '../hooks/useVehicleProfile';

// GRAVITY (m/s^2)
export const G = 9.81;

// Air density at sea level, 15°C (kg/m^3)
export const AIR_DENSITY = 1.225;

// Estimated rolling resistance coefficient for asphalt
export const CRR = 0.015;

/**
 * Calculates the total power at the engine (in Watts) required to achieve 
 * the given acceleration at the given speed.
 * 
 * @param a - Forward Acceleration in m/s^2
 * @param v - Current Speed in m/s
 * @param profile - Vehicle Profile (mass, aero, drivetrain loss)
 * @returns Engine Power in Watts
 */
export function calculateEnginePower(a: number, v: number, profile: VehicleProfile): number {
    if (v <= 0 && a <= 0) return 0; // No power if standing still or braking to a halt

    // 1. Inertial Force (F = m * a)
    // We only care about positive acceleration for power output
    const f_inertial = profile.massKg * Math.max(0, a);

    // 2. Aerodynamic Drag (F = 0.5 * rho * cw * A * v^2)
    const f_aero = 0.5 * AIR_DENSITY * profile.dragCoefficient * profile.frontalAreaM2 * (v * v);

    // 3. Rolling Resistance (F = m * g * crr)
    const f_roll = profile.massKg * G * CRR;

    // Total Force needed at the wheels
    const f_total = f_inertial + f_aero + f_roll;

    // We are only interested in positive power output
    if (f_total <= 0) return 0;

    // Power at wheels (P = F * v)
    const p_wheels = f_total * v;

    // Engine Power = Wheel Power / (1 - Loss Factor)
    const p_engine = p_wheels / (1 - profile.drivetrainLoss);

    return p_engine;
}

/**
 * Utility to convert Watts to metric Horsepower (PS)
 * 1 PS = 735.49875 Watts
 */
export function wattsToPS(watts: number): number {
    return watts / 735.49875;
}

/**
 * Utility to convert m/s to km/h
 */
export function msToKmh(ms: number): number {
    return ms * 3.6;
}

/**
 * 2nd order low-pass Butterworth filter.
 * Configured for fs=60Hz, fc=2Hz.
 */
export class ButterworthFilter {
    private x1 = 0;
    private x2 = 0;
    private y1 = 0;
    private y2 = 0;

    // We initialize with default fs=60Hz, fc=2Hz.
    private b0 = 0.0095;
    private b1 = 0.0190;
    private b2 = 0.0095;
    private a1 = -1.7055;
    private a2 = 0.7436;

    constructor(fc: number = 2.0, fs: number = 60) {
        this.updateCoefficients(fc, fs);
    }

    updateCoefficients(fc: number, fs: number = 60) {
        // Pre-warp the cutoff frequency
        const w0 = 2 * Math.PI * fc;
        const T = 1 / fs;
        const preWarpedW0 = (2 / T) * Math.tan((w0 * T) / 2);

        // Analog prototype denominator: s^2 + sqrt(2)*w0*s + w0^2
        // Bilinear transform substitution: s = (2/T) * (1 - z^-1) / (1 + z^-1)

        const Q = 1 / Math.sqrt(2); // Butterworth Q factor
        const omega = 2 * Math.PI * fc / fs;
        const alpha = Math.sin(omega) / (2 * Q);
        const cosW = Math.cos(omega);

        const a0 = 1 + alpha;

        this.b0 = (1 - cosW) / 2 / a0;
        this.b1 = (1 - cosW) / a0;
        this.b2 = (1 - cosW) / 2 / a0;

        this.a1 = -2 * cosW / a0;
        this.a2 = (1 - alpha) / a0;
    }

    filter(x0: number): number {
        const y0 = (this.b0 * x0) + (this.b1 * this.x1) + (this.b2 * this.x2)
            - (this.a1 * this.y1) - (this.a2 * this.y2);

        this.x2 = this.x1;
        this.x1 = x0;
        this.y2 = this.y1;
        this.y1 = y0;

        return y0;
    }

    reset() {
        this.x1 = 0; this.x2 = 0;
        this.y1 = 0; this.y2 = 0;
    }
}
