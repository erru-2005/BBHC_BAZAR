import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const getImageSrc = (image) => {
  if (!image) return null
  if (typeof image === 'string') return image
  return image.preview || image.data_url || image.url || null
}

function ProductMediaViewer({ thumbnail, gallery = [], productName }) {
  const mediaList = useMemo(() => {
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

    return items
  }, [thumbnail, gallery, productName])

  const [activeIndex, setActiveIndex] = useState(0)
  const activeMedia = mediaList[activeIndex] || mediaList[0]

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 w-full">
      <div className="lg:w-20 order-2 lg:order-1 flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0">
        {mediaList.map((media, index) => (
          <button
            key={`${media.src}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 flex-shrink-0 rounded-lg sm:rounded-xl border ${
              index === activeIndex ? 'border-gray-900' : 'border-gray-200'
            } overflow-hidden focus:outline-none focus:ring-2 focus:ring-black`}
          >
            <img src={media.src} alt={media.alt} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      <div className="flex-1 order-1 lg:order-2 w-full flex items-start justify-center min-h-[240px] sm:min-h-[280px] lg:min-h-[320px] pt-0">
        <img src={activeMedia.src} alt={activeMedia.alt} className="max-h-[240px] sm:max-h-[400px] lg:max-h-[520px] w-full h-auto object-contain" />
      </div>
    </div>
  )
}

ProductMediaViewer.propTypes = {
  thumbnail: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  gallery: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
  productName: PropTypes.string.isRequired
}

export default ProductMediaViewer


