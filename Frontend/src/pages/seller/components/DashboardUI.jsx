import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
)

export const StatCard = ({ label, value, icon: Icon, color, percentage }) => {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className="seller-card-premium p-6 flex flex-col gap-4 relative overflow-hidden group hover:active-glow-blue"
    >
      {/* Background Decorative Element */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${color.bg} opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-700`} />
      
      <div className="flex items-start justify-between">
        <motion.div 
          whileHover={{ rotate: 15 }}
          className={`p-4 rounded-[1.25rem] ${color.bg} ${color.text} shadow-sm group-hover:shadow-lg transition-all duration-300`}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight ${percentage >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          <span>{percentage >= 0 ? '↑' : '↓'} {Math.abs(percentage)}%</span>
        </div>
      </div>
      
      <div className="relative">
        <p className="text-[12px] md:text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mb-3 group-hover:text-slate-900 transition-colors">{label}</p>
        <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>

      <div className="mt-2 flex items-center gap-2">
         <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: '70%' }}
               transition={{ delay: 0.5, duration: 1.5 }}
               className={`h-full ${color.bg.replace('50', '500')}`} 
            />
         </div>
         <span className="text-[10px] font-bold text-slate-400">Target: 80%</span>
      </div>
    </motion.div>
  )
}

export const SalesPerformanceChart = ({ data }) => {
  const chartRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Robust dummy data fallback
  const finalData = useMemo(() => {
    const rawData = (data && data.length > 0) ? data : [
      { name: 'WEEK 01', sales: 4200 },
      { name: 'WEEK 02', sales: 3800 },
      { name: 'WEEK 03', sales: 5400 },
      { name: 'WEEK 04', sales: 4800 },
      { name: 'WEEK 05', sales: 6200 },
      { name: 'WEEK 06', sales: 5900 },
    ]

    return {
      labels: rawData.map(d => d.name),
      datasets: [
        {
          fill: true,
          label: 'Revenue',
          data: rawData.map(d => d.sales),
          borderColor: '#2563EB',
          borderWidth: 4,
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0.1, 'rgba(37, 99, 235, 0.25)');
            gradient.addColorStop(0.9, 'rgba(37, 99, 235, 0)');
            return gradient;
          },
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#2563EB',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
        },
      ],
    }
  }, [data])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#1e293b',
        bodyColor: '#1e293b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 14, weight: '900' },
        padding: 16,
        displayColors: false,
        borderRadius: 16,
        borderColor: '#f1f5f9',
        borderWidth: 1,
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
        callbacks: {
          label: (context) => `₹${context.parsed.y.toLocaleString('en-IN')}`,
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10,
            weight: 'bold',
          },
          padding: 10,
        },
        border: {
          display: false,
        }
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  }

  return (
    <div className="seller-card-premium p-8 col-span-1 lg:col-span-2 min-h-[450px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Sales Analytics</h3>
          <p className="text-sm md:text-base text-slate-500 font-medium">Real-time revenue visualization</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest">View by</span>
           <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
             <option>Monthly Peak</option>
             <option>Weekly View</option>
             <option>Daily Stats</option>
           </select>
        </div>
      </div>
      
      <div className="h-[300px] w-full active-glow-blue rounded-[3rem] bg-white p-6 overflow-hidden shadow-inner border border-slate-50 flex items-center justify-center relative">
        {!mounted ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line 
            ref={chartRef}
            data={finalData} 
            options={options} 
          />
        )}
      </div>
    </div>
  )
}
