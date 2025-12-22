import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { FaExpand, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const getImageSrc = (image) => {
  if (!image) return null
  if (typeof image === 'string') return image
  return image.preview || image.data_url || image.url || null
}

function ProductMediaViewer({ thumbnail, gallery = [], productName }) {
  const [mediaList, setMediaList] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  // Zoom state
  const [showZoom, setShowZoom] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })
  const imageRef = useRef(null)

  useEffect(() => {
    const items = []
    const thumbSrc = getImageSrc(thumbnail)
    if (thumbSrc) {
      items.push({ src: thumbSrc, alt: `${productName} thumbnail` })
    }

    gallery.forEach((image, index) => {
      const src = getImageSrc(image)
      if (src) {
        items.push({ src, alt: `${productName} gallery ${index + 1}` })
      }
    })

    if (items.length === 0) {
      items.push({ src: 'https://via.placeholder.com/800x800?text=No+Image', alt: 'No image available' })
    }

    setMediaList(items)
  }, [thumbnail, gallery, productName])

  const activeMedia = mediaList[activeIndex] || (mediaList.length > 0 ? mediaList[0] : null)

  const handleMouseMove = (e) => {
    if (!imageRef.current) return
    const { left, top, width, height } = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setZoomPosition({ x, y })
  }

  const handleNext = (e) => {
    e?.stopPropagation()
    setActiveIndex((prev) => (prev + 1) % mediaList.length)
  }

  const handlePrev = (e) => {
    e?.stopPropagation()
    setActiveIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length)
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-full min-w-0 select-none">
        {/* Thumbnails - Left on Desktop, Bottom on Mobile */}
        <div className="lg:w-24 order-2 lg:order-1 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto scrollbar-hide max-w-full">
          {mediaList.map((media, index) => (
            <button
              key={`${media.src}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`relative flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${index === activeIndex
                ? 'border-indigo-600 ring-2 ring-indigo-100'
                : 'border-transparent hover:border-gray-300'
                }`}
            >
              <img
                src={media.src}
                alt={media.alt}
                className="w-full h-full object-cover"
              />
              {index === activeIndex && (
                <div className="absolute inset-0 bg-black/10" />
              )}
            </button>
          ))}
        </div>

        {/* Main Image Area */}
        <div className="relative flex-1 order-1 lg:order-2 z-10 w-full max-w-full min-w-0">
          <div
            className="group relative w-full aspect-square sm:aspect-[4/3] lg:aspect-[3/4] max-h-[500px] lg:max-h-[600px] bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200 shadow-sm cursor-zoom-in touch-pan-y mx-auto"
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setIsLightboxOpen(true)}
            ref={imageRef}
          >
            {activeMedia && (
              <motion.img
                key={activeMedia.src}
                initial={{ opacity: 0.8, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                src={activeMedia.src}
                alt={activeMedia.alt}
                className="w-full h-full object-contain"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.05}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x; // horizontal swipe distance

                  if (swipe < -50) {
                    // Swiped Left -> Next Image
                    handleNext(e);
                  } else if (swipe > 50) {
                    // Swiped Right -> Previous Image
                    handlePrev(e);
                  }
                }}
              />
            )}

            {/* Hover overlay hint */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none hidden lg:flex">
              <FaExpand className="w-3 h-3" />
              Click to expand
            </div>

            {/* Mobile Navigation Dots */}
            {mediaList.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-none p-1 bg-white/20 backdrop-blur-[2px] rounded-full">
                {mediaList.map((_, idx) => (
                  <div
                    key={`dot-${idx}`}
                    className={`rounded-full transition-all duration-300 shadow-sm ${idx === activeIndex
                      ? 'w-2 h-2 bg-gray-800'
                      : 'w-1.5 h-1.5 bg-gray-400/80'
                      }`}
                  />
                ))}
              </div>
            )}

            {/* Magnifying Glass / Zoom Box (Desktop Only) */}
            <AnimatePresence>
              {showZoom && activeMedia && activeMedia.src && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="hidden lg:block fixed top-1/2 right-8 -translate-y-1/2 w-[350px] h-[450px] bg-white rounded-2xl overflow-hidden shadow-2xl z-[60] border-2 border-gray-300"
                  style={{
                    backgroundImage: `url(${activeMedia.src})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    backgroundSize: '250%',
                    backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-20"
              onClick={() => setIsLightboxOpen(false)}
            >
              <FaTimes className="w-6 h-6" />
            </button>

            {/* Main Lightbox Image */}
            <div
              className="relative w-full max-w-6xl max-h-screen flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="hidden md:block absolute left-2 md:-left-12 p-3 text-white/50 hover:text-white transition-colors"
                onClick={handlePrev}
              >
                <FaChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>

              <motion.img
                key={activeMedia.src + '-lightbox'}
                initial={{ opacity: 0, scale: 1, x: 0 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                src={activeMedia.src}
                alt={activeMedia.alt}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl touch-pan-y"
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.1}
                whileTap={{ scale: 1.05 }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // Double tap to zoom on mobile
                  const img = e.currentTarget;
                  if (img.style.transform.includes('scale(2)')) {
                    img.style.transform = 'scale(1)';
                  } else {
                    img.style.transform = 'scale(2)';
                  }
                }}
                onDragEnd={(e, { offset }) => {
                  const swipe = offset.x;
                  if (swipe < -50) {
                    handleNext(e);
                  } else if (swipe > 50) {
                    handlePrev(e);
                  }
                }}
                style={{
                  cursor: 'grab',
                  touchAction: 'pinch-zoom'
                }}
              />

              <button
                className="hidden md:block absolute right-2 md:-right-12 p-3 text-white/50 hover:text-white transition-colors"
                onClick={handleNext}
              >
                <FaChevronRight className="w-8 h-8 md:w-10 md:h-10" />
              </button>
            </div>

            {/* Lightbox Thumbnails */}
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 overflow-x-auto max-w-full px-4 scrollbar-hide"
              onClick={(e) => e.stopPropagation()}
            >
              {mediaList.map((media, index) => (
                <button
                  key={`lb-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${index === activeIndex ? 'border-indigo-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                >
                  <img src={media.src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

ProductMediaViewer.propTypes = {
  thumbnail: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  gallery: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
  productName: PropTypes.string.isRequired
}

export default ProductMediaViewer


