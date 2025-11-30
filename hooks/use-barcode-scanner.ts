import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
    onScan: (barcode: string) => void;
    minChars?: number;
    maxInterval?: number;
}

export const useBarcodeScanner = ({
    onScan,
    minChars = 3,
    maxInterval = 100,
}: UseBarcodeScannerOptions) => {
    const buffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime.current;

            // If time difference is too large, reset buffer
            if (timeDiff > maxInterval) {
                buffer.current = '';
            }

            lastKeyTime.current = currentTime;

            // Ignore special keys except Enter
            if (event.key.length > 1 && event.key !== 'Enter') {
                return;
            }

            if (event.key === 'Enter') {
                if (buffer.current.length >= minChars) {
                    onScan(buffer.current);
                    buffer.current = '';
                    // Prevent default Enter behavior (like form submission) if it was a scan
                    event.preventDefault();
                }
                buffer.current = '';
            } else {
                buffer.current += event.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan, minChars, maxInterval]);
};
