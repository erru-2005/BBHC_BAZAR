import React, { useState, useEffect } from 'react';

export default function BlockedTimer({ errorText }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!errorText || !errorText.startsWith('BLOCKED_UNTIL:')) return;

    const targetIso = errorText.split('BLOCKED_UNTIL:')[1];
    const targetDate = new Date(targetIso);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft('You can try again now.');
      } else {
        const minutes = Math.floor(diff / 1000 / 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`Too many failed attempts. Try again in ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [errorText]);

  if (!errorText) return null;

  if (errorText.startsWith('BLOCKED_UNTIL:')) {
    return <span>{timeLeft}</span>;
  }

  return <span>{errorText}</span>;
}
