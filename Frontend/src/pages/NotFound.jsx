/**
 * 404 Not Found Page Component
 */
import { useNavigate } from 'react-router-dom'
import pagenotfoundIcon from '../assets/External_images/pagenotfoundicon.png'

function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-12">
        {/* Character Image */}
        <div className="flex-shrink-0 order-1">
          <img 
            src={pagenotfoundIcon} 
            alt="404 Error Character" 
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain"
          />
        </div>

        {/* Error Content */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left order-2">
          {/* 404 ERROR! Text */}
          <div className="mb-3 sm:mb-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-orange-500 leading-tight">
              404
            </h1>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-orange-500">
              ERROR!
            </h2>
          </div>

          {/* Message */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-orange-500 mb-6 sm:mb-8">
            Sorry, the page not found
          </p>

          {/* Back to Home Button */}
          <button
            onClick={() => navigate('/')}
            className="bg-orange-500 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg font-semibold text-base sm:text-lg hover:bg-orange-600 active:bg-orange-700 transition-colors duration-200 shadow-lg w-full sm:w-auto"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
