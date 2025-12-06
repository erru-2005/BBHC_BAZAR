/**
 * Master Dashboard Page Component
 */
import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout, loginSuccess } from '../../store/authSlice'
import { clearDeviceToken } from '../../utils/device'
import { initSocket, getSocket, disconnectSocket } from '../../utils/socket'
import logoImage from '../../assets/External_images/IEDC-removebg-preview.png'
import { HiHome } from 'react-icons/hi'
import { IoMdPersonAdd } from 'react-icons/io'
import { MdList, MdBlock } from 'react-icons/md'
import { FaBox, FaThList, FaBars, FaShoppingBag, FaSignOutAlt, FaPercent } from 'react-icons/fa'
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
import OrdersList from './components/OrdersList'
import CommissionManagement from './components/CommissionManagement'
import Analysis from './components/analysis/Analysis'
import ActiveCounters from './components/ActiveCounters'

const TAB_ORDER_VERSION = '2'

function Master() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, token } = useSelector((state) => state.auth)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productsRefreshKey, setProductsRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)

  // Default tab order (Home always first, others can be reordered)
  const defaultTabs = [
    { id: 'home', label: 'Home', icon: HiHome },
    { id: 'orders', label: 'Orders', icon: FaShoppingBag },
    { id: 'add-product', label: 'Add Product', icon: FaBox },
    { id: 'list-products', label: 'List Products', icon: FaThList },
    { id: 'commission', label: 'Commission', icon: FaPercent },
    { id: 'add-seller', label: 'Add Seller', icon: IoMdPersonAdd },
    { id: 'list-sellers', label: 'List Sellers', icon: MdList },
    { id: 'add-outlet-man', label: 'Add Outlet Man', icon: IoMdPersonAdd },
    { id: 'list-outlet-men', label: 'List Outlet Men', icon: MdList },
    { id: 'add-master', label: 'Add Master', icon: IoMdPersonAdd },
    { id: 'list-masters', label: 'List Masters', icon: MdList },
    { id: 'blacklisted-sellers', label: 'Blacklisted', icon: MdBlock }
  ]

  // Initialize tab order from localStorage or use default
  const [tabs, setTabs] = useState(() => {
    const savedOrder = localStorage.getItem('master_tab_order')
    const savedVersion = localStorage.getItem('master_tab_order_version')

    if (savedOrder && savedVersion === TAB_ORDER_VERSION) {
      try {
        const order = JSON.parse(savedOrder)
        const homeTab = defaultTabs.find(t => t.id === 'home')
        const otherTabs = defaultTabs.filter(t => t.id !== 'home')

        const orderedOtherTabs = order
          .filter(id => id !== 'home')
          .map(id => otherTabs.find(t => t.id === id))
          .filter(Boolean)

        otherTabs.forEach(tab => {
          if (!orderedOtherTabs.find(t => t.id === tab.id)) {
            orderedOtherTabs.push(tab)
          }
        })

        return [homeTab, ...orderedOtherTabs]
      } catch (e) {
        // fall through to default order
      }
    }

    localStorage.setItem('master_tab_order_version', TAB_ORDER_VERSION)
    localStorage.setItem(
      'master_tab_order',
      JSON.stringify(defaultTabs.map(tab => tab.id))
    )
    return defaultTabs
  })

  // Drag and drop handlers
  const [draggedTab, setDraggedTab] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  
  // Touch handlers for mobile
  const [touchStartPos, setTouchStartPos] = useState(null)
  const [longPressTimer, setLongPressTimer] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchCurrentIndex, setTouchCurrentIndex] = useState(null)
  const touchTargetRef = useRef(null)
  const tabsContainerRef = useRef(null)

  // Save tab order to localStorage whenever it changes
  useEffect(() => {
    const order = tabs.map(tab => tab.id)
    localStorage.setItem('master_tab_order', JSON.stringify(order))
    localStorage.setItem('master_tab_order_version', TAB_ORDER_VERSION)
  }, [tabs])

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  }, [longPressTimer])

  // Attach non-passive touch listeners when dragging
  useEffect(() => {
    if (!isDragging || !touchTargetRef.current) return

    const element = touchTargetRef.current
    const handleTouchMoveNative = (e) => {
      // Only prevent default if the event is cancelable
      // This avoids warnings when scrolling has already started
      if (e.cancelable) {
        e.preventDefault()
      }
    }

    // Attach non-passive listener to prevent scrolling during drag
    element.addEventListener('touchmove', handleTouchMoveNative, { passive: false })

    return () => {
      element.removeEventListener('touchmove', handleTouchMoveNative)
    }
  }, [isDragging])

  const handleLogout = () => {
    // Notify server about logout via socket
    const socket = getSocket()
    if (socket && socket.connected && user) {
      socket.emit('user_logout', {
        user_id: user.id,
        user_type: 'master'
      })
    }
    
    // Disconnect socket
    disconnectSocket()
    
    // Clear device token
    clearDeviceToken()
    // Dispatch logout action
    dispatch(logout())
    // Navigate to login page
    navigate('/master/login')
  }

  // Initialize socket connection on component mount
  useEffect(() => {
    // User data should be in Redux state from login
    if (!user || !user.id || !token) {
      // If no user or token in Redux, ProtectedRoute will handle redirect
      return
    }
    
    // Initialize socket connection
    const socket = initSocket(token)
    socket.on('connect', () => {
      socket.emit('user_authenticated', {
        user_id: user.id,
        user_type: 'master'
      })
    })
    
    return () => {
      // Cleanup on unmount
      const socket = getSocket()
      if (socket && socket.connected && user) {
        socket.emit('user_logout', {
          user_id: user.id,
          user_type: 'master'
        })
      }
    }
  }, [user, token, navigate])

  // Desktop drag handlers
  const handleDragStart = (e, index) => {
    // Don't allow dragging Home tab
    if (tabs[index].id === 'home') {
      e.preventDefault()
      return
    }
    setDraggedTab(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    // Don't allow dropping over Home tab
    if (tabs[index].id === 'home') {
      return
    }
    
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    performDrop(draggedTab, dropIndex)
  }

  const handleDragEnd = () => {
    setDraggedTab(null)
    setDragOverIndex(null)
  }

  // Mobile touch handlers
  const handleTouchStart = (e, index) => {
    // Don't allow dragging Home tab
    if (tabs[index].id === 'home') {
      return
    }

    const touch = e.touches[0]
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setTouchCurrentIndex(index)
    touchTargetRef.current = e.currentTarget

    // Start long press timer (500ms)
    const timer = setTimeout(() => {
      setIsDragging(true)
      setDraggedTab(index)
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      // Prevent click event
      if (touchTargetRef.current) {
        touchTargetRef.current.style.pointerEvents = 'none'
      }
    }, 500)

    setLongPressTimer(timer)
  }

  const handleTouchMove = (e) => {
    if (!isDragging && !longPressTimer) return

    const touch = e.touches[0]
    
    // If long press hasn't triggered yet, check if moved too much
    if (longPressTimer && touchStartPos) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.x)
      const deltaY = Math.abs(touch.clientY - touchStartPos.y)
      
      // If moved more than 10px, cancel long press
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
        setTouchStartPos(null)
        return
      }
    }

    if (!isDragging) return

    // Find which tab we're over
    const touchX = touch.clientX
    const elements = document.elementsFromPoint(touchX, touch.clientY)
    const tabButton = elements.find(el => 
      el.classList.contains('tab-button') && 
      el.dataset.tabIndex !== undefined
    )

    if (tabButton) {
      const overIndex = parseInt(tabButton.dataset.tabIndex)
      if (overIndex !== dragOverIndex && tabs[overIndex].id !== 'home') {
        setDragOverIndex(overIndex)
      }
    }
  }

  const handleTouchEnd = (e) => {
    // Clear long press timer if it hasn't fired
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    // Restore pointer events
    if (touchTargetRef.current) {
      touchTargetRef.current.style.pointerEvents = ''
    }

    if (!isDragging) {
      setTouchStartPos(null)
      setTouchCurrentIndex(null)
      touchTargetRef.current = null
      return
    }

    // Find drop target
    const touch = e.changedTouches[0]
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY)
    const tabButton = elements.find(el => 
      el.classList.contains('tab-button') && 
      el.dataset.tabIndex !== undefined
    )

    if (tabButton) {
      const dropIndex = parseInt(tabButton.dataset.tabIndex)
      performDrop(draggedTab, dropIndex)
    } else {
      // If no valid drop target, reset
      setDraggedTab(null)
      setDragOverIndex(null)
    }

    // Reset touch state
    setIsDragging(false)
    setTouchStartPos(null)
    setTouchCurrentIndex(null)
    touchTargetRef.current = null
    
    // Prevent click event from firing after drag (only if cancelable)
    if (e.cancelable) {
      e.preventDefault()
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setIsDragging(false)
    setDraggedTab(null)
    setDragOverIndex(null)
    setTouchStartPos(null)
    setTouchCurrentIndex(null)
    
    // Restore pointer events
    if (touchTargetRef.current) {
      touchTargetRef.current.style.pointerEvents = ''
    }
    touchTargetRef.current = null
  }

  // Common drop logic for both desktop and mobile
  const performDrop = (sourceIndex, dropIndex) => {
    if (sourceIndex === null || dropIndex === null) {
      setDraggedTab(null)
      setDragOverIndex(null)
      return
    }

    // Don't allow dropping on Home tab or if no tab is being dragged
    if (tabs[dropIndex].id === 'home') {
      setDraggedTab(null)
      setDragOverIndex(null)
      return
    }

    // Don't allow moving Home tab
    if (tabs[sourceIndex].id === 'home') {
      setDraggedTab(null)
      setDragOverIndex(null)
      return
    }

    // If dropping on the same position, do nothing
    if (sourceIndex === dropIndex) {
      setDraggedTab(null)
      setDragOverIndex(null)
      return
    }

    // Reorder tabs
    const newTabs = [...tabs]
    const draggedTabData = newTabs[sourceIndex]
    
    // Remove dragged tab from its current position
    newTabs.splice(sourceIndex, 1)
    
    // Calculate new insert index (accounting for the removed item)
    let insertIndex = dropIndex
    if (sourceIndex < dropIndex) {
      insertIndex = dropIndex - 1
    }
    
    // Insert at new position (ensure it's after Home which is at index 0)
    insertIndex = Math.max(1, insertIndex)
    newTabs.splice(insertIndex, 0, draggedTabData)
    
    // Ensure Home is always first (should already be, but double-check)
    const homeIndex = newTabs.findIndex(t => t.id === 'home')
    if (homeIndex !== 0) {
      const homeTab = newTabs.splice(homeIndex, 1)[0]
      newTabs.unshift(homeTab)
    }
    
    setTabs(newTabs)
    setDraggedTab(null)
    setDragOverIndex(null)
  }

  const handleTabSelection = (tabId) => {
    setActiveTab(tabId)
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Integrated Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex justify-between items-end py-4">
            {/* Logo and Brand Name */}
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="BBHCBazaar Logo" 
                className="h-10 w-10 object-contain"
              />
              <h1 className="text-2xl font-bold text-gray-900">BBHCBazaar</h1>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="text-sm font-semibold text-gray-700 underline underline-offset-4 hover:text-gray-900"
                onClick={() => setResetPasswordOpen(true)}
              >
                Reset password
              </button>
            </div>
          </div>

          {/* Tabs Navigation - Integrated with Header */}
          <div 
            ref={tabsContainerRef}
            className="flex items-center gap-2 overflow-x-auto pb-3 relative"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overflowY: 'hidden'
            }}
            onWheel={(e) => {
              if (tabsContainerRef.current) {
                tabsContainerRef.current.scrollLeft += e.deltaY
              }
            }}
          >
            <button
              onClick={() => setIsMenuOpen(true)}
              className="tab-button px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center justify-center gap-2 select-none bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 flex-shrink-0 z-10 min-w-[44px] min-h-[44px]"
              title="Open menu"
              aria-label="Open tab menu"
            >
              <FaBars className="w-5 h-5 flex-shrink-0 text-gray-700" />
            </button>

            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                data-tab-index={index}
                draggable={tab.id !== 'home' && !isDragging}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                onClick={() => {
                  if (!isDragging && !longPressTimer) {
                    handleTabSelection(tab.id)
                  }
                }}
                className={`tab-button px-5 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 select-none ${
                  activeTab === tab.id
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${
                  tab.id === 'home' 
                    ? 'cursor-default' 
                    : 'cursor-move'
                } ${
                  (draggedTab === index || touchCurrentIndex === index) && isDragging
                    ? 'opacity-50 scale-95' 
                    : ''
                } ${
                  dragOverIndex === index && tab.id !== 'home'
                    ? 'ring-2 ring-black ring-offset-2 scale-105'
                    : ''
                } ${
                  isDragging && tab.id !== 'home'
                    ? 'transition-transform'
                    : ''
                }`}
                title={tab.id === 'home' ? 'Home (Fixed)' : 'Long press and drag to reorder'}
              >
                {tab.id === 'home' ? (
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <>
                    <tab.icon className="w-5 h-5 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PasswordResetDialog
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        userType="master"
        identifier={user?.username}
        displayLabel="Master"
      />

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Master Dashboard Title */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Master Dashboard</h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600">Comprehensive Analytics & Insights</p>
            </div>
            <ActiveCounters />
            <Analysis />
          </div>
        )}
        
        {activeTab === 'add-seller' && <AddSeller />}
        
        {activeTab === 'add-outlet-man' && <AddOutletMan />}
        
        {activeTab === 'add-master' && <AddMaster />}
        
        {activeTab === 'add-product' && (
          <AddProduct
            editingProduct={editingProduct}
            onProductSaved={() => {
              setEditingProduct(null)
              setProductsRefreshKey((prev) => prev + 1)
            }}
            onCancelEdit={() => setEditingProduct(null)}
          />
        )}
        
        {activeTab === 'list-sellers' && <ListSellers />}
        
        {activeTab === 'list-outlet-men' && <ListOutletMan />}
        
        {activeTab === 'list-masters' && <ListMasters />}

        {activeTab === 'blacklisted-sellers' && <BlacklistedSellers />}

        {activeTab === 'list-products' && (
          <ListProducts
            refreshSignal={productsRefreshKey}
            onEditProduct={(product) => {
              setActiveTab('add-product')
              setEditingProduct(product)
            }}
          />
        )}

        {activeTab === 'orders' && <OrdersList />}

        {activeTab === 'commission' && <CommissionManagement />}
      </div>

      {/* Right-side Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-80 max-w-full bg-white shadow-2xl p-6 flex flex-col gap-4 transform transition-transform duration-300 translate-x-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Quick Navigation</h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={`menu-${tab.id}`}
                  onClick={() => handleTabSelection(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  handleLogout()
                }}
                className="mt-2 flex items-center gap-3 px-4 py-3 rounded-lg text-left transition bg-red-50 text-red-600 hover:bg-red-100 font-semibold"
              >
                <FaSignOutAlt className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Master

