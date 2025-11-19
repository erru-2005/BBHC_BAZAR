/**
 * Add Category Dialog Component
 */
import { useState } from 'react'
import Popup from 'reactjs-popup'
import { motion } from 'framer-motion'
import { FaTag } from 'react-icons/fa'
import { motionVariants, transitions } from '../utils/animations'

function AddCategoryDialog({ open, onClose, onAdd, existingCategories = [] }) {
  const [categoryName, setCategoryName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedName = categoryName.trim()

    if (!trimmedName) {
      setError('Category name is required')
      return
    }

    if (existingCategories.includes(trimmedName)) {
      setError('This category already exists')
      return
    }

    onAdd(trimmedName)
    setCategoryName('')
    setError('')
    onClose()
  }

  const handleClose = () => {
    setCategoryName('')
    setError('')
    onClose()
  }

  return (
    <Popup
      open={open}
      closeOnDocumentClick={true}
      modal
      nested
      contentStyle={{
        padding: '0',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '420px',
        width: '90%'
      }}
      overlayStyle={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClose={handleClose}
    >
      <motion.div
        className="bg-white rounded-xl overflow-hidden"
        initial={motionVariants.scaleIn.initial}
        animate={motionVariants.scaleIn.animate}
        exit={motionVariants.scaleIn.exit}
        transition={transitions.spring}
      >
        {/* Header */}
        <motion.div
          className="px-6 py-4 bg-blue-50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transitions.smooth, delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 rounded-full bg-blue-100 text-blue-600"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...transitions.spring, delay: 0.2 }}
            >
              <FaTag className="w-5 h-5" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900">Add New Category</h3>
          </div>
        </motion.div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <motion.div
            className="px-6 py-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...transitions.smooth, delay: 0.2 }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value)
                  setError('')
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Enter category name"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.smooth, delay: 0.3 }}
          >
            <motion.button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Add Category
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </Popup>
  )
}

export default AddCategoryDialog

