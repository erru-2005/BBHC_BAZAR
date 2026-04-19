import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { motion } from 'framer-motion'

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
        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-2 group-hover:text-slate-900 transition-colors">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
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
  return (
    <div className="seller-card-premium p-8 col-span-1 lg:col-span-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sales Analytics</h3>
          <p className="text-sm text-slate-500 font-medium">Real-time revenue visualization</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">View by</span>
           <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
             <option>Monthly Peak</option>
             <option>Weekly View</option>
             <option>Daily Stats</option>
           </select>
        </div>
      </div>
      
      <div className="h-[320px] w-full min-h-[320px] active-glow-blue rounded-[2rem] bg-white p-4">
        <ResponsiveContainer width="100%" height="100%" debounce={1}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
            />
            <Area 
              type="monotone" 
              dataKey="sales" 
              stroke="#2563EB" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSales)" 
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
