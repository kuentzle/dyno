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
    const f_inertial = profile.massKg * a;

    // 2. Aerodynamic Drag (F = 0.5 * rho * cw * A * v^2)
    const f_aero = 0.5 * AIR_DENSITY * profile.dragCoefficient * profile.frontalAreaM2 * (v * v);

    // 3. Rolling Resistance (F = m * g * crr)
    const f_roll = profile.massKg * G * CRR;

    // Total Force needed at the wheels
    const f_total = f_inertial + f_aero + f_roll;

    // We are only interested in positive power output (accelerating or maintaining speed)
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
