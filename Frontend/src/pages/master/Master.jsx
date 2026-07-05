/**
 * Master Dashboard Page Component - Clean Redesign
 */
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { logout } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { initSocket, getSocket, disconnectSocket } from '../../utils/socket'
import { bindPortalRealtimeSync } from '../../services/api'
import logoImage from '../../assets/External_images/IEDC-removebg-preview.png'
import {
  HiHome, HiOfficeBuilding, HiMenuAlt2, HiX, HiLogout,
  HiChevronRight, HiViewGrid, HiGlobe, HiUsers
} from 'react-icons/hi'
import {
  FaBox, FaPercent, FaCoins, FaShoppingBag, FaStore, FaUserPlus, FaList, FaBan
} from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import PasswordResetDialog from '../../components/PasswordResetDialog'
import AddSeller from './components/AddSeller'
import AddMaster from './components/AddMaster'
import AddOutletMan from './components/AddOutletMan'
import ListSellers from './components/ListSellers'
import ListMasters from './components/ListMasters'
import ListOutletMan from './components/ListOutletMan'
import AddProduct from './components/AddProduct'
import BlacklistedSellers from './components/BlacklistedSellers'
import ListProducts from './components/ListProducts'
import ListServices from './components/ListServices'
import AddService from './components/AddService'
import OrdersList from './components/OrdersList'
import CommissionManagement from './components/CommissionManagement'
import ServiceCreditManagement from './components/ServiceCreditManagement'
import Analysis from './components/analysis/Analysis'
import ActiveCounters from './components/ActiveCounters'
import WebContainerSettings from './components/WebContainerSettings'

const NAV = [
  {
    section: 'Overview',
    items: [
      { id: 'home', label: 'Dashboard', icon: HiHome },
      { id: 'orders', label: 'Orders', icon: FaShoppingBag },
    ]
  },
  {
    section: 'Sellers',
    items: [
      { id: 'list-sellers', label: 'Seller List', icon: FaList },
      { id: 'add-seller', label: 'Add Seller', icon: FaUserPlus },
      { id: 'blacklisted-sellers', label: 'Blacklisted', icon: FaBan },
    ]
  },
  {
    section: 'Outlet',
    items: [
      { id: 'list-outlet-men', label: 'Outlet Staff', icon: FaStore },
      { id: 'add-outlet-man', label: 'Add Outlet Man', icon: FaUserPlus },
    ]
  },
  {
    section: 'Products & Services',
    items: [
      { id: 'list-products', label: 'Products', icon: FaBox },
      { id: 'add-product', label: 'Add Product', icon: FaBox },
      { id: 'list-services', label: 'Services', icon: HiViewGrid },
      { id: 'add-service', label: 'Add Service', icon: HiViewGrid },
    ]
  }
]

function Master() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useSelector((state) => state.auth)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingService, setEditingService] = useState(null)
  const [productsRefreshKey, setProductsRefreshKey] = useState(0)
  const [servicesRefreshKey, setServicesRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    bindPortalRealtimeSync()
  }, [token])

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state?.tab])

  const handleLogout = () => {
    const socket = getSocket()
    if (socket?.connected && user) {
      socket.emit('user_logout', { user_id: user.id, user_type: 'master' })
    }
    disconnectSocket()
    clearDeviceToken()
    dispatch(logout())
    navigate('/master/login')
  }

  useEffect(() => {
    if (!user?.id || !token) return
    const socket = initSocket(token)
    socket.on('connect', () => {
      socket.emit('user_authenticated', { user_id: user.id, user_type: 'master' })
    })
    return () => {
      const s = getSocket()
      if (s?.connected && user) s.emit('user_logout', { user_id: user.id, user_type: 'master' })
    }
  }, [user, token, navigate])

  const handleTabSelection = (tabId) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
  }

  const activeLabel = NAV.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard'
  const activeSection = NAV.find(g => g.items.find(i => i.id === activeTab))?.section || ''
  const masterName = user?.name || user?.first_name || user?.username || 'Master'

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700/60">
          <img src={logoImage} alt="Logo" className="h-8 w-8 object-contain" />
          <div>
            <p className="font-black text-white text-base leading-tight">BBHCBazaar</p>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Master Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-gray-400 hover:text-white lg:hidden">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV.map(group => (
            <div key={group.section}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3 mb-2">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${activeTab === item.id
                        ? 'bg-white text-gray-900 shadow-sm font-bold'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                    {activeTab === item.id && <HiChevronRight className="w-4 h-4 ml-auto text-gray-500" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-700/60 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center font-bold text-white text-sm">
              {masterName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{masterName}</p>
              <p className="text-[10px] text-gray-400">Master Admin</p>
            </div>
          </div>
          <button
            onClick={() => setResetPasswordOpen(true)}
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            Reset Password
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm font-semibold transition-all"
          >
            <HiLogout className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <HiMenuAlt2 className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">{activeLabel}</h1>
            <p className="text-xs text-gray-400 font-medium">
              {activeSection ? `Master → ${activeSection} → ${activeLabel}` : 'Master Dashboard'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {[
              { label: 'Orders', id: 'orders', icon: FaShoppingBag },
              { label: 'Sellers', id: 'list-sellers', icon: FaStore },
              { label: 'Outlet', id: 'list-outlet-men', icon: HiOfficeBuilding },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => handleTabSelection(btn.id)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${activeTab === btn.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <btn.icon className="w-3.5 h-3.5" /> {btn.label}
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto">

          {/* HOME / DASHBOARD */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="bg-gray-900 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Welcome back</p>
                <h2 className="text-2xl font-black mb-1">{masterName} 👋</h2>
                <p className="text-gray-300 text-sm">Here is what is happening across BBHCBazaar today.</p>
                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    { label: 'View Orders', id: 'orders', icon: FaShoppingBag },
                    { label: 'Sellers', id: 'list-sellers', icon: FaStore },
                    { label: 'Outlet Staff', id: 'list-outlet-men', icon: HiOfficeBuilding },
                    { label: 'Products', id: 'list-products', icon: FaBox },
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => handleTabSelection(btn.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold text-white transition-all border border-white/10"
                    >
                      <btn.icon className="w-4 h-4" />
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tight">Analytics</h3>
                <Analysis />
              </div>
            </div>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && (
            <div className="max-w-7xl mx-auto">
              <OrdersList />
            </div>
          )}

          {/* SELLERS */}
          {activeTab === 'list-sellers' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Seller List</h2>
                  <p className="text-sm text-gray-500">All registered sellers on BBHCBazaar</p>
                </div>
                <button
                  onClick={() => handleTabSelection('add-seller')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-all"
                >
                  <FaUserPlus className="w-4 h-4" /> Add New Seller
                </button>
              </div>
              <ListSellers />
            </div>
          )}
          {activeTab === 'add-seller' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900">Add New Seller</h2>
                <p className="text-sm text-gray-500">Register a new seller account</p>
              </div>
              <AddSeller />
            </div>
          )}
          {activeTab === 'blacklisted-sellers' && (
            <div className="max-w-7xl mx-auto">
              <div className="mb-4">
                <h2 className="text-xl font-black text-gray-900">Blacklisted Sellers</h2>
                <p className="text-sm text-gray-500">Sellers blocked from the platform</p>
              </div>
              <BlacklistedSellers />
            </div>
          )}

          {/* OUTLET */}
          {activeTab === 'list-outlet-men' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Outlet Staff</h2>
                  <p className="text-sm text-gray-500">All outlet managers on the platform</p>
                </div>
                <button
                  onClick={() => handleTabSelection('add-outlet-man')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-all"
                >
                  <FaUserPlus className="w-4 h-4" /> Add Outlet Man
                </button>
              </div>
              <ListOutletMan />
            </div>
          )}
          {activeTab === 'add-outlet-man' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900">Add Outlet Man</h2>
                <p className="text-sm text-gray-500">Register a new outlet staff member</p>
              </div>
              <AddOutletMan />
            </div>
          )}

          {/* PRODUCTS */}
          <div className={activeTab === 'add-product' ? '' : 'hidden'} aria-hidden={activeTab !== 'add-product'}>
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                <p className="text-sm text-gray-500">{editingProduct ? 'Update' : 'Create'} a product listing</p>
              </div>
              <AddProduct
                editingProduct={editingProduct}
                onProductSaved={() => { setEditingProduct(null); setProductsRefreshKey(p => p + 1) }}
                onCancelEdit={() => setEditingProduct(null)}
              />
            </div>
          </div>

          <div className={activeTab === 'add-service' ? '' : 'hidden'} aria-hidden={activeTab !== 'add-service'}>
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900">{editingService ? 'Edit Service' : 'Add Service'}</h2>
                <p className="text-sm text-gray-500">{editingService ? 'Update' : 'Create'} a service listing</p>
              </div>
              <AddService
                editingService={editingService}
                onServiceSaved={() => { setEditingService(null); setServicesRefreshKey(p => p + 1); setActiveTab('list-services') }}
                onCancelEdit={() => setEditingService(null)}
              />
            </div>
          </div>

          {activeTab === 'list-products' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Product List</h2>
                  <p className="text-sm text-gray-500">All listed products</p>
                </div>
                <button
                  onClick={() => handleTabSelection('add-product')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-all"
                >
                  <FaBox className="w-4 h-4" /> Add Product
                </button>
              </div>
              <ListProducts
                refreshSignal={productsRefreshKey}
                onEditProduct={(product) => { setActiveTab('add-product'); setEditingProduct(product) }}
              />
            </div>
          )}

          {activeTab === 'list-services' && (
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Service List</h2>
                  <p className="text-sm text-gray-500">All listed services</p>
                </div>
                <button
                  onClick={() => handleTabSelection('add-service')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-all"
                >
                  <HiViewGrid className="w-4 h-4" /> Add Service
                </button>
              </div>
              <ListServices
                refreshSignal={servicesRefreshKey}
                onEditService={(service) => { setEditingService(service); setActiveTab('add-service') }}
              />
            </div>
          )}



        </main>
      </div>

      <PasswordResetDialog
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        userType="master"
        identifier={user?.username}
        displayLabel="Master"
      />
    </div>
  )
}

export default Master
