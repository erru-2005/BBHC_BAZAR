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
import { FaBox, FaThList } from 'react-icons/fa'
import AddSeller from './components/AddSeller'
import AddMaster from './components/AddMaster'
import ListSellers from './components/ListSellers'
import ListMasters from './components/ListMasters'
import AddProduct from './components/AddProduct'
import BlacklistedSellers from './components/BlacklistedSellers'
import ListProducts from './components/ListProducts'

function Master() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, token } = useSelector((state) => state.auth)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productsRefreshKey, setProductsRefreshKey] = useState(0)
  
  // Initialize activeTab from localStorage or default to 'home'
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('master_active_tab')
    return savedTab || 'home'
  })

  // Default tab order (Home always first, others can be reordered)
  const defaultTabs = [
    { id: 'home', label: 'Home', icon: HiHome },
    { id: 'add-seller', label: 'Add Seller', icon: IoMdPersonAdd },
    { id: 'add-master', label: 'Add Master', icon: IoMdPersonAdd },
    { id: 'add-product', label: 'Add Product', icon: FaBox },
    { id: 'list-products', label: 'List Products', icon: FaThList },
    { id: 'list-sellers', label: 'List Sellers', icon: MdList },
    { id: 'list-masters', label: 'List Masters', icon: MdList },
    { id: 'blacklisted-sellers', label: 'Blacklisted', icon: MdBlock }
  ]

  // Initialize tab order from localStorage or use default
  const [tabs, setTabs] = useState(() => {
    const savedOrder = localStorage.getItem('master_tab_order')
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder)
        // Ensure Home is always first
        const homeTab = defaultTabs.find(t => t.id === 'home')
        const otherTabs = defaultTabs.filter(t => t.id !== 'home')
        // Reorder other tabs based on saved order
        const orderedOtherTabs = order
          .filter(id => id !== 'home')
          .map(id => otherTabs.find(t => t.id === id))
          .filter(Boolean)
        // Add any missing tabs
        otherTabs.forEach(tab => {
          if (!orderedOtherTabs.find(t => t.id === tab.id)) {
            orderedOtherTabs.push(tab)
          }
        })
        return [homeTab, ...orderedOtherTabs]
      } catch (e) {
        return defaultTabs
      }
    }
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
    // Clear saved tab state
    localStorage.removeItem('master_active_tab')
    // Dispatch logout action
    dispatch(logout())
    // Navigate to login page
    navigate('/master/login')
  }

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('master_active_tab', activeTab)
  }, [activeTab])

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Integrated Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex justify-between items-center py-4">
            {/* Logo and Brand Name */}
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="BBHCBazaar Logo" 
                className="h-10 w-10 object-contain"
              />
              <h1 className="text-2xl font-bold text-gray-900">BBHCBazaar</h1>
            </div>
            
            {/* Logout Icon */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <svg
                className="w-6 h-6 text-gray-600 hover:text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>

          {/* Tabs Navigation - Integrated with Header */}
          <div 
            ref={tabsContainerRef}
            className="flex items-center gap-2 overflow-x-auto pb-3"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              overflowY: 'hidden'
            }}
          >
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
                  // Don't trigger click if we just finished dragging
                  if (!isDragging && !longPressTimer) {
                    setActiveTab(tab.id)
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
                  <tab.icon className="w-5 h-5" />
                ) : (
                  <>
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {activeTab === 'home' && (
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Master Dashboard</h2>
            <p className="text-xl text-gray-600">Manage the entire BBHCBazaar platform</p>
          </div>
        )}
        
        {activeTab === 'add-seller' && <AddSeller />}
        
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
      </div>

    </div>
  )
}

export default Master

