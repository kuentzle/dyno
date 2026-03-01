import { useState, useCallback, useEffect } from 'react';

export function useWakeLock() {
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
    const [isSupported] = useState('wakeLock' in navigator);

    const requestWakeLock = useCallback(async () => {
        if (!isSupported) return;
        try {
            const lock = await navigator.wakeLock.request('screen');
            setWakeLock(lock);

            lock.addEventListener('release', () => {
                console.log('Wake Lock was released');
                setWakeLock(null);
            });
            console.log('Wake Lock is active');
        } catch (err: any) {
            console.error(`Wake Lock error: ${err.name}, ${err.message}`);
        }
    }, [isSupported]);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLock !== null) {
            await wakeLock.release();
            setWakeLock(null);
        }
    }, [wakeLock]);

    // Handle visibility changes to re-acquire wake lock if necessary
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [wakeLock, requestWakeLock]);

    return { isSupported, isActive: wakeLock !== null, requestWakeLock, releaseWakeLock };
}
