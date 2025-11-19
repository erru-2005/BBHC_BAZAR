/**
 * Animation Utilities
 * Helper functions for GSAP and Framer Motion animations
 */
import { gsap } from 'gsap'

// Register GSAP plugins (ScrollTrigger is premium, so we'll make it optional)
if (typeof window !== 'undefined') {
  try {
    // Try to import ScrollTrigger if available (premium plugin)
    import('gsap/ScrollTrigger').then((module) => {
      gsap.registerPlugin(module.ScrollTrigger)
    }).catch(() => {
      // ScrollTrigger not available, continue without it
      console.log('ScrollTrigger not available (premium plugin)')
    })
  } catch (e) {
    // Ignore if ScrollTrigger is not available
  }
}

/**
 * GSAP Animation Helpers
 */
export const gsapAnimations = {
  /**
   * Fade in animation
   */
  fadeIn: (element, duration = 0.5, delay = 0) => {
    return gsap.fromTo(
      element,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration, delay, ease: 'power2.out' }
    )
  },

  /**
   * Slide in from left
   */
  slideInLeft: (element, duration = 0.6, delay = 0) => {
    return gsap.fromTo(
      element,
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration, delay, ease: 'power3.out' }
    )
  },

  /**
   * Slide in from right
   */
  slideInRight: (element, duration = 0.6, delay = 0) => {
    return gsap.fromTo(
      element,
      { x: 100, opacity: 0 },
      { x: 0, opacity: 1, duration, delay, ease: 'power3.out' }
    )
  },

  /**
   * Scale in animation
   */
  scaleIn: (element, duration = 0.5, delay = 0) => {
    return gsap.fromTo(
      element,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration, delay, ease: 'back.out(1.7)' }
    )
  },

  /**
   * Stagger animation for multiple elements
   */
  staggerFadeIn: (elements, duration = 0.3, stagger = 0.1) => {
    return gsap.fromTo(
      elements,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration, stagger, ease: 'power2.out' }
    )
  },

  /**
   * Hover animation
   */
  hoverScale: (element, scale = 1.05) => {
    element.addEventListener('mouseenter', () => {
      gsap.to(element, { scale, duration: 0.3, ease: 'power2.out' })
    })
    element.addEventListener('mouseleave', () => {
      gsap.to(element, { scale: 1, duration: 0.3, ease: 'power2.out' })
    })
  },

  /**
   * Scroll-triggered animation (requires ScrollTrigger premium plugin)
   * Falls back to regular animation if ScrollTrigger is not available
   */
  scrollReveal: (element, options = {}) => {
    const {
      start = 'top 80%',
      end = 'bottom 20%',
      animation = { opacity: 1, y: 0 },
      from = { opacity: 0, y: 50 }
    } = options

    // Check if ScrollTrigger is available
    if (typeof window !== 'undefined' && gsap.plugins.get('ScrollTrigger')) {
      return gsap.fromTo(element, from, {
        ...animation,
        scrollTrigger: {
          trigger: element,
          start,
          end,
          toggleActions: 'play none none reverse'
        }
      })
    } else {
      // Fallback to regular animation
      return gsap.fromTo(element, from, {
        ...animation,
        duration: 0.6,
        ease: 'power2.out'
      })
    }
  }
}

/**
 * Common Framer Motion Variants
 */
export const motionVariants = {
  // Fade in variants
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },

  // Slide in from bottom
  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 }
  },

  // Slide in from left
  slideLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  },

  // Slide in from right
  slideRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 }
  },

  // Scale in
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  },

  // Stagger container for children
  staggerContainer: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  },

  // Stagger item
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }
}

/**
 * Common transition presets
 */
export const transitions = {
  smooth: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1]
  },
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  },
  bounce: {
    type: 'spring',
    stiffness: 400,
    damping: 10
  }
}

