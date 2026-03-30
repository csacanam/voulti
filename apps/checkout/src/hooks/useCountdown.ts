import { useState, useEffect } from 'react';

interface UseCountdownProps {
  expiresAt?: string;
  onExpire?: () => void;
}

interface CountdownResult {
  timeLeft: {
    hours: number;
    minutes: number;
    seconds: number;
  } | null;
  isExpired: boolean;
  hasExpiration: boolean;
}

export const useCountdown = ({ expiresAt, onExpire }: UseCountdownProps): CountdownResult => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const hasExpiration = Boolean(expiresAt);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const difference = expiration - now;

      if (difference <= 0) {
        setTimeLeft(null);
        if (onExpire) {
          onExpire();
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeLeft();

    // Set up interval to update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = hasExpiration && timeLeft === null;

  return {
    timeLeft,
    isExpired,
    hasExpiration,
  };
}; 