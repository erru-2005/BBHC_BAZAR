import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { toggleDarkMode } from '../../store/themeSlice'
import { 
  FiMoon, 
  FiSun, 
  FiBell, 
  FiLock, 
  FiUser, 
  FiGlobe,
  FiChevronRight,
  FiShield
} from 'react-icons/fi'

export default function SellerSettings() {
  const dispatch = useDispatch()
  const { isDarkMode } = useSelector((state) => state.theme)
  const [notifications, setNotifications] = useState(true)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const sections = [
    {
      title: "Appearance",
      items: [
        { 
          label: "Dark Mode", 
          icon: isDarkMode ? FiMoon : FiSun, 
          type: "toggle", 
          value: isDarkMode, 
          onChange: () => dispatch(toggleDarkMode()),
          desc: "Adjust the visual appearance of your dashboard"
        },
        { 
          label: "Language", 
          icon: FiGlobe, 
          type: "link", 
          value: "English (US)",
          desc: "Select your preferred display language"
        }
      ]
    },
    {
      title: "Security & Privacy",
      items: [
        { 
          label: "Two-Factor Authentication", 
          icon: FiShield, 
          type: "toggle", 
          value: true,
          desc: "Add an extra layer of security to your account"
        },
        { 
          label: "Change Password", 
          icon: FiLock, 
          type: "link",
          desc: "Regulary update your password for safety"
        }
      ]
    },
    {
      title: "Notifications",
      items: [
        { 
          label: "Order Updates", 
          icon: FiBell, 
          type: "toggle", 
          value: notifications, 
          onChange: () => setNotifications(!notifications),
          desc: "Get notified when new orders arrive"
        }
      ]
    }
  ]

  return (
    <div className="p-4 md:p-12 max-w-4xl mx-auto w-full">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-12"
      >
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight font-outfit">Settings</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your dashboard preferences and account security</p>
        </div>

        {/* Sections */}
        {sections.map((section, idx) => (
          <motion.section key={idx} variants={itemVariants} className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600 px-2">
              {section.title}
            </h2>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              {section.items.map((item, iIdx) => (
                <div 
                  key={iIdx}
                  className={`flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors ${
                    iIdx !== section.items.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-white transition-all">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 tracking-tight">{item.label}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {item.type === 'toggle' ? (
                      <button 
                        onClick={item.onChange}
                        className={`w-14 h-8 rounded-full transition-all duration-500 p-1 relative ${
                          item.value ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      >
                        <motion.div 
                          animate={{ x: item.value ? 24 : 0 }}
                          className="w-6 h-6 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">{item.value}</span>
                        <FiChevronRight className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </motion.div>
    </div>
  )
}
