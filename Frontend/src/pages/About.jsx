/**
 * About Page Component
 */
function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About Us</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-4">
              Welcome to BBHC Bazar, your trusted marketplace for quality products
              and exceptional service.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-600 mb-4">
              We strive to provide the best shopping experience with a wide
              selection of products, competitive prices, and excellent customer service.
            </p>
            
            <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">
              Why Choose Us
            </h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Quality products from trusted sellers</li>
              <li>Secure and easy payment options</li>
              <li>Fast and reliable delivery</li>
              <li>24/7 customer support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About

