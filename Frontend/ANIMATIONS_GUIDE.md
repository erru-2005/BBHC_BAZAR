# Animation Guide - GSAP & Framer Motion

This project uses both **GSAP** (GreenSock Animation Platform) and **Framer Motion** for smooth, performant animations.

## 📦 Installed Packages

- `gsap` - Professional animation library
- `framer-motion` - React animation library

## 🎯 Quick Start

### Using Framer Motion

```jsx
import { motion } from 'framer-motion'
import { motionVariants, transitions } from '../utils/animations'

function MyComponent() {
  return (
    <motion.div
      initial={motionVariants.fadeIn.initial}
      animate={motionVariants.fadeIn.animate}
      exit={motionVariants.fadeIn.exit}
      transition={transitions.smooth}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Animated Content
    </motion.div>
  )
}
```

### Using GSAP

```jsx
import { useEffect, useRef } from 'react'
import { gsapAnimations } from '../utils/animations'

function MyComponent() {
  const elementRef = useRef(null)

  useEffect(() => {
    if (elementRef.current) {
      gsapAnimations.fadeIn(elementRef.current, 0.5, 0.2)
    }
  }, [])

  return <div ref={elementRef}>Animated Content</div>
}
```

## 📚 Available Animation Utilities

### Framer Motion Variants

Located in `src/utils/animations.js`:

- **fadeIn** - Simple fade in animation
- **slideUp** - Slide in from bottom
- **slideLeft** - Slide in from left
- **slideRight** - Slide in from right
- **scaleIn** - Scale in animation
- **staggerContainer** - Container for staggered children
- **staggerItem** - Item for staggered animations

### GSAP Animations

Located in `src/utils/animations.js`:

- **fadeIn(element, duration, delay)** - Fade in with upward motion
- **slideInLeft(element, duration, delay)** - Slide from left
- **slideInRight(element, duration, delay)** - Slide from right
- **scaleIn(element, duration, delay)** - Scale in with bounce
- **staggerFadeIn(elements, duration, stagger)** - Stagger animation for multiple elements
- **hoverScale(element, scale)** - Hover scale effect
- **scrollReveal(element, options)** - Scroll-triggered animation (requires premium ScrollTrigger)

### Transition Presets

- **smooth** - Smooth easing transition
- **spring** - Spring physics animation
- **bounce** - Bouncy spring animation

## 💡 Examples

### Example 1: Animated Card Component

```jsx
import { motion } from 'framer-motion'
import { motionVariants, transitions } from '../utils/animations'

function ProductCard({ product }) {
  return (
    <motion.div
      className="card"
      initial={motionVariants.fadeIn.initial}
      animate={motionVariants.fadeIn.animate}
      whileHover={{ y: -5, transition: transitions.smooth }}
      transition={transitions.spring}
    >
      <h3>{product.name}</h3>
    </motion.div>
  )
}
```

### Example 2: Staggered List Animation

```jsx
import { motion } from 'framer-motion'
import { motionVariants } from '../utils/animations'

function ProductList({ products }) {
  return (
    <motion.div
      variants={motionVariants.staggerContainer}
      initial="initial"
      animate="animate"
    >
      {products.map((product) => (
        <motion.div
          key={product.id}
          variants={motionVariants.staggerItem}
        >
          {product.name}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

### Example 3: GSAP Stagger Animation

```jsx
import { useEffect, useRef } from 'react'
import { gsapAnimations } from '../utils/animations'

function ProductGrid({ products }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      const items = containerRef.current.querySelectorAll('.product-item')
      gsapAnimations.staggerFadeIn(items, 0.4, 0.1)
    }
  }, [products])

  return (
    <div ref={containerRef} className="grid">
      {products.map((product) => (
        <div key={product.id} className="product-item">
          {product.name}
        </div>
      ))}
    </div>
  )
}
```

### Example 4: Button with Hover Animation

```jsx
import { motion } from 'framer-motion'

function AnimatedButton({ children, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
      whileTap={{ scale: 0.95 }}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg"
    >
      {children}
    </motion.button>
  )
}
```

## 🎨 Current Implementation

The following components already use animations:

1. **HeroBanner** - Uses Framer Motion for entrance animations
2. **ListProducts** - Uses both GSAP (stagger) and Framer Motion (hover)
3. **ConfirmDialog** - Uses Framer Motion for modal animations
4. **AnimatedCard** - Reusable animated card component

## 🔧 Custom Animations

### Creating Custom Framer Motion Variants

```jsx
const customVariant = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 }
}
```

### Creating Custom GSAP Animations

```jsx
import { gsap } from 'gsap'

const customAnimation = (element) => {
  return gsap.fromTo(
    element,
    { rotation: 0, scale: 0 },
    { rotation: 360, scale: 1, duration: 1, ease: 'elastic.out(1, 0.3)' }
  )
}
```

## 📖 Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [GSAP Documentation](https://greensock.com/docs/)
- [GSAP Easing Visualizer](https://greensock.com/ease-visualizer/)

## ⚠️ Notes

- **ScrollTrigger** is a premium GSAP plugin. The code handles its absence gracefully.
- Use Framer Motion for React component animations (easier integration)
- Use GSAP for complex timeline animations or when you need more control
- Both libraries are performant and work well together

