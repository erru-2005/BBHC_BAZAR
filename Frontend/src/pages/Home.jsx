/**
 * Home Page Component
 */
import { Link } from 'react-router-dom'
import { Card, Button } from '../components'

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to BBHC Bazar
          </h1>
          <p className="text-xl text-gray-600">
            Your one-stop marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Featured Products">
            <p className="text-gray-600 mb-4">
              Discover our featured collection of products
            </p>
            <Link to="/products">
              <Button variant="primary">View Products</Button>
            </Link>
          </Card>

          <Card title="About Us">
            <p className="text-gray-600 mb-4">
              Learn more about our mission and values
            </p>
            <Link to="/about">
              <Button variant="secondary">Learn More</Button>
            </Link>
          </Card>

          <Card title="Contact">
            <p className="text-gray-600 mb-4">
              Get in touch with our team
            </p>
            <Link to="/contact">
              <Button variant="outline">Contact Us</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Home

