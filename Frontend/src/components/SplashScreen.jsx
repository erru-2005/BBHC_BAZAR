import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const SplashScreen = ({ onComplete }) => {
  const logoRef = useRef(null);
  const controls = useAnimation();

  useEffect(() => {
    const split = new SplitText(logoRef.current, { type: 'chars' });
    const chars = split.chars;

    // Animate letters building in
    gsap.from(chars, {
      duration: 0.5,
      opacity: 0,
      y: 20,
      stagger: 0.1,
      ease: 'power3.out',
      onComplete: () => {
        // Hold for a moment
        setTimeout(() => {
          // Fade out
          gsap.to(chars, {
            duration: 0.5,
            opacity: 0,
            y: -20,
            stagger: 0.05,
            ease: 'power3.in',
            onComplete: onComplete
          });
        }, 2000); // Hold for 2 seconds after animation
      }
    });

    // Framer Motion for container
    controls.start({ opacity: 1 });

    return () => {
      split.revert();
    };
  }, [controls, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={controls}
      className="flex items-center justify-center h-screen bg-black"
    >
      <div ref={logoRef} className="whitespace-nowrap text-5xl md:text-6xl lg:text-7xl font-bold">
        <span className="text-gray-300">BBHC</span>
        <span className="text-pink-500">Bazaar</span>
      </div>
    </motion.div>
  );
};

export default SplashScreen;