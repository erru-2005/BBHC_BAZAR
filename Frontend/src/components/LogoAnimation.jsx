import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'

// Register SplitText plugin
if (typeof window !== 'undefined') {
  try {
    gsap.registerPlugin(SplitText)
  } catch (e) {
    // Plugin already registered or not available
  }
}

function LogoAnimation({ onComplete, headerLogoRef }) {
  const logoRef = useRef(null)
  const containerRef = useRef(null)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    if (!logoRef.current) {
      setIsAnimating(false)
      onComplete?.()
      return
    }

    const logoElement = logoRef.current
    let split = null
    let chars = []
    let timeoutCount = 0
    const maxTimeoutCount = 20 // Max 1 second wait (20 * 50ms)

    // Wait for header logo to be available (with timeout)
    const checkHeaderRef = () => {
      if (!headerLogoRef?.current) {
        timeoutCount++
        if (timeoutCount >= maxTimeoutCount) {
          // Timeout: just fade out without animation
          const tl = gsap.timeline({
            onComplete: () => {
              setIsAnimating(false)
              onComplete?.()
            }
          })
          tl.to(logoElement, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in'
          })
          return
        }
        // Wait a bit for the header to render
        setTimeout(checkHeaderRef, 50)
        return
      }

      const headerLogo = headerLogoRef.current

      // Get initial positions (center of screen)
      const initialRect = logoElement.getBoundingClientRect()
      
      // Get target positions (header logo position)
      const headerRect = headerLogo.getBoundingClientRect()
      const targetX = headerRect.left + headerRect.width / 2
      const targetY = headerRect.top + headerRect.height / 2
      const targetScale = Math.min(headerRect.width / initialRect.width, 1)

      // Create SplitText for letter animation
      try {
        split = new SplitText(logoElement, { type: 'chars' })
        chars = split.chars
      } catch (e) {
        // If SplitText fails, use the element directly
        chars = [logoElement]
      }

      // Set initial position (center of screen)
      gsap.set(containerRef.current, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        xPercent: -50,
        yPercent: -50,
        zIndex: 9999
      })

      // Create animation timeline
      const tl = gsap.timeline({
        onComplete: () => {
          if (split && split.revert) {
            split.revert()
          }
          setIsAnimating(false)
          onComplete?.()
        }
      })

      // Step 1: Animate letters building in (if using SplitText)
      if (chars.length > 1) {
        tl.from(chars, {
          duration: 0.5,
          opacity: 0,
          y: 30,
          stagger: 0.08,
          ease: 'power3.out'
        })
      } else {
        // Fallback: fade in
        tl.from(logoElement, {
          duration: 0.5,
          opacity: 0,
          scale: 0.8,
          ease: 'power3.out'
        })
      }

      // Step 2: Hold for a brief moment
      tl.to({}, { duration: 0.3 })

      // Step 3: Animate to header position
      tl.to(containerRef.current, {
        duration: 0.9,
        x: targetX - window.innerWidth / 2,
        y: targetY - window.innerHeight / 2,
        scale: targetScale,
        ease: 'power2.inOut'
      }, '-=0.1')

      // Step 4: Fade out and complete
      tl.to(logoElement, {
        duration: 0.3,
        opacity: 0,
        ease: 'power2.in'
      })
    }

    // Start checking for header ref
    checkHeaderRef()

    // Cleanup function
    return () => {
      if (split && split.revert) {
        split.revert()
      }
    }
  }, [headerLogoRef, onComplete])

  if (!isAnimating) return null

  return (
    <div
      ref={containerRef}
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999
      }}
    >
      <div
        ref={logoRef}
        className="whitespace-nowrap text-5xl md:text-6xl lg:text-7xl font-black tracking-tight"
        style={{
          background: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '0.25rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span style={{ color: '#131921' }}>BBHC</span>
        <span className="text-pink-500">Bazaar</span>
      </div>
    </div>
  )
}

export default LogoAnimation

