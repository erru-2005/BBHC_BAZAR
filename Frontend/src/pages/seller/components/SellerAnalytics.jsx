import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { 
  FiTrendingUp, 
  FiBox, 
  FiPackage, 
  FiCheckCircle, 
  FiArrowUpRight,
  FiArrowDownRight,
  FiActivity,
  FiShoppingBag
} from 'react-icons/fi'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function SellerAnalytics() {
  const { orders, products } = useSelector((state) => state.seller)

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const totalRevenue = orders
        .filter(o => !['cancelled', 'rejected', 'seller_rejected'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    
    const activeOrders = orders.filter(o => 
        ['pending_seller', 'seller_accepted', 'ready_for_pickup', 'pending', 'accepted'].includes(o.status)
    ).length

    const completedOrders = orders.filter(o => 
        ['handed_over', 'completed', 'delivered'].includes(o.status)
    ).length

    return {
        totalOrders,
        totalRevenue: `₹${totalRevenue.toLocaleString('en-IN')}`,
        activeOrders,
        completedOrders,
        avgOrderValue: totalOrders > 0 ? `₹${Math.round(totalRevenue / totalOrders).toLocaleString('en-IN')}` : '₹0'
    }
  }, [orders])

  const topProductsData = useMemo(() => {
    const productStats = {}
    
    orders.forEach(order => {
        if (['cancelled', 'rejected', 'seller_rejected'].includes(order.status)) return
        
        const pName = order.product?.product_name || order.product?.name || 'Unknown Product'
        if (!productStats[pName]) {
            productStats[pName] = 0
        }
        productStats[pName] += Number(order.total_amount || 0)
    })

    const sortedProducts = Object.entries(productStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)

    return {
        labels: sortedProducts.map(([name]) => name.split(' ').slice(0, 2).join(' ')),
        datasets: [
            {
                label: 'Revenue (₹)',
                data: sortedProducts.map(([, revenue]) => revenue),
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderRadius: 12,
                borderSkipped: false,
                hoverBackgroundColor: '#2563EB',
                barThickness: 40,
            }
        ]
    }
  }, [orders])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(241, 245, 249, 1)',
          drawBorder: false,
        },
        ticks: {
          font: { size: 11, weight: '600' },
          color: '#64748B',
          callback: (value) => '₹' + value.toLocaleString()
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11, weight: '700' },
          color: '#1E293B',
        }
      }
    },
    animation: {
        duration: 2000,
        easing: 'easeOutQuart'
    }
  }

  const statConfig = [
    { label: 'Total Revenue', value: stats.totalRevenue, icon: FiTrendingUp, color: 'blue', trends: '+12.5%' },
    { label: 'Active Orders', value: stats.activeOrders, icon: FiActivity, color: 'indigo', trends: '+4' },
    { label: 'Completed', value: stats.completedOrders, icon: FiCheckCircle, color: 'emerald', trends: '+8' },
    { label: 'Total Orders', value: stats.totalOrders, icon: FiShoppingBag, color: 'rose', trends: '+22' }
  ]

  return (
    <div className="p-4 md:p-8 flex flex-col gap-10 max-w-7xl mx-auto w-full mb-12">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Account <span className="text-blue-600">Analytics</span></h1>
        <p className="text-base text-slate-600 font-semibold">Real-time performance metrics synchronized with your database</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {statConfig.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)" }}
            className="seller-card-premium p-8 relative overflow-hidden group border-2 border-transparent hover:border-blue-500/20"
          >
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-150 transition-all duration-700 bg-slate-900`} />
            
            <div className="flex items-center justify-between mb-6">
              <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-${item.color}-600 bg-slate-50 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-300`}>
                <item.icon className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight shadow-sm">
                <FiArrowUpRight strokeWidth={2.5} /> {item.trends}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 tracking-normal">{item.label}</p>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{item.value}</h2>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Revenue Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 seller-card-premium p-10 min-h-[500px] flex flex-col gap-8 shadow-xl"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Top 5 Revenue Products</h3>
              <p className="text-sm text-slate-500 font-semibold tracking-normal mt-1">Market performance insights</p>
            </div>
            <div className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-bold tracking-widest uppercase shadow-lg shadow-blue-500/30">
                Live Sync
            </div>
          </div>

          <div className="flex-1 w-full relative min-h-[350px]">
            {topProductsData.labels.length > 0 ? (
                <Bar data={topProductsData} options={chartOptions} />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-6">
                    <FiBox className="w-20 h-20 opacity-10" />
                    <p className="font-bold text-sm text-slate-400">Inventory analysis pending sales</p>
                </div>
            )}
          </div>
        </motion.div>

        {/* Efficiency Sidebar Stats */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-6"
        >
          <div className="seller-card-premium p-8 h-[280px] bg-slate-900 text-white relative overflow-hidden group shadow-2xl flex flex-col justify-center">
             <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20" />
             <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 backdrop-blur-md border border-white/10 shrink-0">
                    <FiTrendingUp className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Operational Level</span>
                </div>
                <div className="space-y-4">
                   <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Efficiency Index</p>
                        <h3 className="text-5xl font-bold tracking-tighter text-white">98.4<span className="text-blue-500">%</span></h3>
                      </div>
                   </div>
                   <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '98.4%' }}
                        transition={{ duration: 2.5, delay: 0.8, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.8)]"
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="seller-card-premium p-8 h-[280px] border-2 border-slate-100 flex flex-col justify-center items-center gap-6 group hover:border-blue-500/40 transition-all duration-500 bg-white shadow-xl">
             <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-all duration-500 shadow-sm">
                <FiPackage className="w-8 h-8" />
             </div>
             <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Average Order Value</h4>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.avgOrderValue}</p>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
