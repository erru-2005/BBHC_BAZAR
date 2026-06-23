import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

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

      // Set initial position (center of screen)
      gsap.set(containerRef.current, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        zIndex: 9999
      });

      // Logo is visible from start - add premium loading effect on the logo itself
      gsap.set(logoElement, {
        opacity: 1
      });

      // Make logo container relative for positioning
      logoElement.style.position = 'relative';

      // Create premium visible silver shimmer effect from bottom-left to top-right
      const loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'premium-loading-effect';

      // Premium visible silver shimmer overlay - diagonal from bottom-left to top-right
      loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          135deg,
          transparent 0%,
          transparent 35%,
          rgba(192, 192, 192, 0.6) 45%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(192, 192, 192, 0.6) 55%,
          transparent 65%,
          transparent 100%
        );
        background-size: 250% 250%;
        background-position: 100% 100%;
        border-radius: 0.25rem;
        pointer-events: none;
        z-index: 1;
        mix-blend-mode: screen;
      `;

      // Append loading overlay to logo
      logoElement.appendChild(loadingOverlay);

      // Create animation timeline
      const tl = gsap.timeline({
        onComplete: () => {
          // Remove loading overlay
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }
          setIsAnimating(false);
          onComplete?.();
        }
      });

      // Step 1: Premium visible silver shimmer from bottom-left to top-right
      // Start at bottom-left (100% 100%) and move to top-right (0% 0%)
      tl.fromTo(loadingOverlay,
        {
          backgroundPosition: '100% 100%' // Start at bottom-left
        },
        {
          duration: 1.5,
          backgroundPosition: '0% 0%', // End at top-right
          ease: 'power1.inOut',
          repeat: 1 // Shimmer effect repeats once (2 total passes)
        }
      );

      // Step 2: Hold logo in middle for visible duration
      const holdTime = 0.5; // Brief hold after loading effect
      tl.to({}, { duration: holdTime });

      // Step 3: Fade out loading overlay smoothly
      tl.to(loadingOverlay, {
        duration: 0.3,
        opacity: 0,
        ease: 'power2.out'
      });

      // Step 4: Fade out logo and remove splash screen
      tl.to(logoElement, {
        duration: 0.3,
        opacity: 0,
        ease: 'power2.in'
      });

      // Step 5: Complete animation
      tl.call(() => {
        // Clean up
        if (containerRef.current) {
          containerRef.current.style.willChange = 'auto'
        }
      });
    };

    // Start checking for header ref
    checkHeaderRef();

    // Cleanup function
    return () => {
      // Cleanup will be handled by timeline onComplete
    };
  }, [headerLogoRef, onComplete]);

  if (!isAnimating) return null;

  return (
    <div
      ref={backgroundRef}
      className="splash-background fixed inset-0 z-[9999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        ref={containerRef}
        className="pointer-events-none flex items-center justify-center"
        style={{
          zIndex: 10000
        }}
      >
        <div
          ref={logoRef}
          className="whitespace-nowrap text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight relative z-10"
          style={{
            background: 'white',
            padding: 'clamp(0.375rem, 2vw, 0.5rem) clamp(0.75rem, 3vw, 1rem)',
            borderRadius: '0.25rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            willChange: 'transform, opacity',
            position: 'relative'
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