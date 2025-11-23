import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

// Register SplitText plugin
if (typeof window !== 'undefined') {
  try {
gsap.registerPlugin(SplitText);
  } catch (e) {
    // Plugin already registered or not available
  }
}

const SplashScreen = ({ onComplete, headerLogoRef }) => {
  const logoRef = useRef(null);
  const containerRef = useRef(null);
  const backgroundRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!logoRef.current) {
      setIsAnimating(false);
      onComplete?.();
      return;
    }

    const logoElement = logoRef.current;
    let split = null;
    let chars = [];
    let timeoutCount = 0;
    const maxTimeoutCount = 40; // Max 2 seconds wait (40 * 50ms)

    // Wait for header logo to be available
    const checkHeaderRef = () => {
      if (!headerLogoRef?.current) {
        timeoutCount++;
        if (timeoutCount >= maxTimeoutCount) {
          // Timeout: just fade out without animation
          const tl = gsap.timeline({
      onComplete: () => {
              if (split && split.revert) {
                split.revert();
              }
              setIsAnimating(false);
              onComplete?.();
            }
          });
          tl.to(logoElement, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in'
          });
          return;
        }
        // Wait a bit for the header to render
        setTimeout(checkHeaderRef, 50);
        return;
      }

      const headerLogo = headerLogoRef.current;

      // Get initial positions (center of screen)
      const initialRect = logoElement.getBoundingClientRect();
      
      // Get target positions (header logo position)
      const headerRect = headerLogo.getBoundingClientRect();
      const targetX = headerRect.left + headerRect.width / 2;
      const targetY = headerRect.top + headerRect.height / 2;
      const targetScale = Math.min(headerRect.width / initialRect.width, 1);

      // Create SplitText for letter animation
      try {
        split = new SplitText(logoElement, { type: 'chars' });
        chars = split.chars;
      } catch (e) {
        // If SplitText fails, use the element directly
        chars = [logoElement];
      }

      // Set initial position (center of screen)
      gsap.set(containerRef.current, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        zIndex: 9999
      });

      // Create animation timeline
      const tl = gsap.timeline({
        onComplete: () => {
          if (split && split.revert) {
            split.revert();
          }
          setIsAnimating(false);
          onComplete?.();
        }
      });

      // Step 1: Animate letters building in the middle of screen (if using SplitText)
      if (chars.length > 1) {
        // Animate letters with stagger - this will complete before next step
        tl.from(chars, {
          duration: 0.8,
          opacity: 0,
          y: 30,
          stagger: 0.1,
          ease: 'power3.out'
        });
      } else {
        // Fallback: fade in
        tl.from(logoElement, {
          duration: 0.9,
          opacity: 0,
          scale: 0.8,
          ease: 'power3.out'
        });
      }

      // Step 2: Wait until letter animation ends, then add extra delay
      // This ensures logo stays idle in middle until animation completes + mandatory delay
      const extraWaitTime = 0.3; // Mandatory delay after letter animation ends
      tl.to({}, { duration: extraWaitTime });

      // Additional delay before movement starts
      const movementDelay = 2.0; // Extra delay before movement animation
      tl.to({}, { duration: movementDelay });

      // Step 3: Move very slowly to header position - PERFECTLY SYNCED with background fade
      // IMPORTANT: These animations start AFTER all previous steps complete (no position offset)
      const movementDuration = 3.0; // Very slow movement
      
      // Animate logo to header position - starts after all delays complete
      tl.to(containerRef.current, {
        duration: movementDuration,
        x: targetX - window.innerWidth / 2,
        y: targetY - window.innerHeight / 2,
        scale: targetScale,
        ease: 'power1.inOut', // Very smooth easing
        // Use will-change for better performance
        onStart: () => {
          if (containerRef.current) {
            containerRef.current.style.willChange = 'transform'
          }
        }
      }); // No position offset - starts after previous step completes

      // Fade out black background - PERFECTLY SYNCED with logo movement
      // Same duration, same start time, same easing for perfect sync
      if (backgroundRef.current) {
        tl.to(backgroundRef.current, {
          duration: movementDuration, // Exact same duration
          opacity: 0,
          ease: 'power1.inOut' // Exact same easing
        }, '<'); // Start at the same time as logo movement (using '<' to sync)
      }

      // Step 4: Complete animation - logo stays visible, no fade out
      // Logo will be visible until it reaches correct position, then component unmounts
      tl.call(() => {
        // Clean up will-change for performance
        if (containerRef.current) {
          containerRef.current.style.willChange = 'auto'
        }
      });
    };

    // Start checking for header ref
    checkHeaderRef();

    // Cleanup function
    return () => {
      if (split && split.revert) {
      split.revert();
      }
    };
  }, [headerLogoRef, onComplete]);

  if (!isAnimating) return null;

  return (
    <div
      ref={backgroundRef}
      className="splash-background fixed inset-0 z-[9999] bg-black"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999
      }}
    >
      <div
        ref={containerRef}
        className="pointer-events-none fixed flex items-center justify-center"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10000,
          WebkitTransform: 'translate(-50%, -50%)',
          msTransform: 'translate(-50%, -50%)'
        }}
    >
        <div
          ref={logoRef}
          className="whitespace-nowrap text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight"
          style={{
            background: 'white',
            padding: 'clamp(0.375rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
            borderRadius: '0.25rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            willChange: 'transform, opacity'
          }}
        >
          <span style={{ color: '#131921' }}>BBHC</span>
        <span className="text-pink-500">Bazaar</span>
      </div>
      </div>
    </div>
  );
};

export default SplashScreen;