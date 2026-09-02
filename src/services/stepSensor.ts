// ============================================================
// Step & Motion Sensor Service
// Integrates Expo Pedometer with Accelerometer Motion Step Counting
// ============================================================

import { Pedometer, Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

export interface MotionData {
  isMoving: boolean;
  intensity: number; // 0 to 1
  cadenceSPM: number; // Steps per minute
  hardwareAvailable: boolean;
}

export type StepUpdateCallback = (stepIncrement: number, totalLiveSteps: number, motion: MotionData) => void;

class StepSensorService {
  private pedometerSubscription: { remove: () => void } | null = null;
  private accelerometerSubscription: { remove: () => void } | null = null;

  private isRunning: boolean = false;
  private hardwarePedometerAvailable: boolean = false;
  private permissionGranted: boolean = false;

  private lastPedometerSteps: number = 0;
  private sessionLiveSteps: number = 0;

  // Accelerometer motion algorithm variables
  private gravityMagnitude: number = 1.0;
  private lastStepTimestamp: number = 0;
  private recentStepTimes: number[] = [];
  private lastMotionIntensity: number = 0;
  private lastMovementTimestamp: number = 0;

  // Algorithm parameters
  private readonly STEP_THRESHOLD = 0.28; // Acceleration delta threshold (in Gs)
  private readonly MIN_STEP_INTERVAL_MS = 260; // Minimum ~230 SPM max human cadence
  private readonly ALPHA_GRAVITY = 0.85; // Low-pass filter smoothing for gravity

  private listeners: Set<StepUpdateCallback> = new Set();

  /**
   * Request permissions and check sensor availability
   */
  public async initialize(): Promise<{ hardwareAvailable: boolean; permissionGranted: boolean }> {
    try {
      if (Platform.OS !== 'web') {
        const perm = await Pedometer.requestPermissionsAsync();
        this.permissionGranted = perm.granted;
      } else {
        this.permissionGranted = true;
      }
    } catch {
      this.permissionGranted = false;
    }

    try {
      if (Platform.OS !== 'web') {
        this.hardwarePedometerAvailable = await Pedometer.isAvailableAsync();
      } else {
        this.hardwarePedometerAvailable = false;
      }
    } catch {
      this.hardwarePedometerAvailable = false;
    }

    return {
      hardwareAvailable: this.hardwarePedometerAvailable,
      permissionGranted: this.permissionGranted,
    };
  }

  /**
   * Start tracking steps via both Pedometer and Motion Accelerometer
   */
  public async startTracking(callback?: StepUpdateCallback): Promise<boolean> {
    if (callback) {
      this.listeners.add(callback);
    }

    if (this.isRunning) {
      return true;
    }

    const { hardwareAvailable, permissionGranted } = await this.initialize();

    this.isRunning = true;
    this.sessionLiveSteps = 0;
    this.lastPedometerSteps = 0;
    this.lastMovementTimestamp = Date.now();

    // 1. Hardware Pedometer Subscription
    if (hardwareAvailable && permissionGranted && Platform.OS !== 'web') {
      try {
        this.pedometerSubscription = Pedometer.watchStepCount((result) => {
          if (result && typeof result.steps === 'number') {
            const currentSteps = result.steps;
            const diff = this.lastPedometerSteps === 0 ? currentSteps : currentSteps - this.lastPedometerSteps;

            if (diff > 0) {
              this.lastPedometerSteps = currentSteps;
              this.sessionLiveSteps += diff;
              this.recordStep(diff, 0.7);
            }
          }
        });
      } catch (err) {
        console.warn('[StepSensor] Hardware pedometer watch failed, using motion sensor fallback:', err);
      }
    }

    // 2. Motion Sensor (Accelerometer) Step Counter Engine
    if (Platform.OS !== 'web') {
      try {
        Accelerometer.setUpdateInterval(50); // 20Hz sampling rate
        this.accelerometerSubscription = Accelerometer.addListener((accel) => {
          this.processMotionSample(accel.x, accel.y, accel.z);
        });
      } catch (err) {
        console.warn('[StepSensor] Accelerometer sensor subscription failed:', err);
      }
    }

    return true;
  }

  /**
   * Process raw accelerometer coordinates to detect walking motion and steps
   */
  private processMotionSample(x: number, y: number, z: number): void {
    const rawMagnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    // Dynamic gravity baseline estimation
    this.gravityMagnitude =
      this.ALPHA_GRAVITY * this.gravityMagnitude + (1 - this.ALPHA_GRAVITY) * rawMagnitude;

    const delta = Math.abs(rawMagnitude - this.gravityMagnitude);
    this.lastMotionIntensity = Math.min(1, Math.max(0, delta / 0.8));

    // Check if motion exceeds walking threshold and satisfies cadence window
    if (delta > this.STEP_THRESHOLD) {
      this.lastMovementTimestamp = now;

      if (now - this.lastStepTimestamp >= this.MIN_STEP_INTERVAL_MS) {
        this.lastStepTimestamp = now;

        // If hardware pedometer is not actively providing steps (e.g. simulator or indoor motion),
        // use accelerometer step count
        if (!this.hardwarePedometerAvailable || !this.pedometerSubscription) {
          this.sessionLiveSteps += 1;
          this.recordStep(1, this.lastMotionIntensity);
        } else {
          // Hardware pedometer is running; still notify listeners of active motion intensity
          this.notifyListeners(0, this.lastMotionIntensity);
        }
      }
    } else {
      // Periodically notify when stationary to update motion intensity
      if (now - this.lastMovementTimestamp > 1500) {
        this.notifyListeners(0, 0);
      }
    }
  }

  /**
   * Record step and calculate cadence
   */
  private recordStep(stepIncrement: number, intensity: number): void {
    const now = Date.now();
    this.recentStepTimes.push(now);

    // Keep only step timestamps within the last 15 seconds
    this.recentStepTimes = this.recentStepTimes.filter((t) => now - t <= 15000);

    this.notifyListeners(stepIncrement, intensity);
  }

  /**
   * Notify all subscribed listeners
   */
  private notifyListeners(stepIncrement: number, intensity: number): void {
    const now = Date.now();
    const isMoving = intensity > 0.08 || now - this.lastMovementTimestamp < 1800;

    // Calculate cadence SPM (steps per minute based on recent 15s window)
    const recentCount = this.recentStepTimes.length;
    const cadenceSPM = recentCount > 1 ? Math.round((recentCount / 15) * 60) : isMoving ? 90 : 0;

    const motionData: MotionData = {
      isMoving,
      intensity: Number(intensity.toFixed(2)),
      cadenceSPM,
      hardwareAvailable: this.hardwarePedometerAvailable,
    };

    for (const listener of this.listeners) {
      try {
        listener(stepIncrement, this.sessionLiveSteps, motionData);
      } catch (e) {
        console.error('[StepSensor] Error in step update listener:', e);
      }
    }
  }

  /**
   * Manually simulate steps for testing
   */
  public simulateSteps(count: number): void {
    this.sessionLiveSteps += count;
    this.lastMovementTimestamp = Date.now();
    this.recordStep(count, 0.85);
  }

  /**
   * Stop tracking and remove listeners
   */
  public stopTracking(callback?: StepUpdateCallback): void {
    if (callback) {
      this.listeners.delete(callback);
    }

    if (this.listeners.size === 0) {
      this.isRunning = false;

      if (this.pedometerSubscription) {
        this.pedometerSubscription.remove();
        this.pedometerSubscription = null;
      }

      if (this.accelerometerSubscription) {
        this.accelerometerSubscription.remove();
        this.accelerometerSubscription = null;
      }
    }
  }

  /**
   * Estimate distance in kilometers from steps and height
   */
  public calculateDistanceKm(steps: number, heightCm: number = 175): number {
    // Stride length is roughly 42% of height
    const strideMeters = (heightCm * 0.42) / 100;
    const totalMeters = steps * (strideMeters > 0 ? strideMeters : 0.762);
    return Number((totalMeters / 1000).toFixed(2));
  }

  /**
   * Estimate calories burned from steps and weight
   */
  public calculateCalories(steps: number, weightKg: number = 70): number {
    // Standard walking calorie estimate: ~0.04 - 0.045 kcal per step for avg body weight
    const kcalPerStep = (weightKg / 70) * 0.04;
    return Number((steps * kcalPerStep).toFixed(1));
  }
}

export const stepSensorService = new StepSensorService();
