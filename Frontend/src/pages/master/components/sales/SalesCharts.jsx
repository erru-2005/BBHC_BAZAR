import React, { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(ym) {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

/** Build the full list of YYYY-MM keys from Jan of the given year to the current month */
function buildFullYearMonths() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based
  const months = [];
  for (let m = 1; m <= currentMonth; m++) {
    months.push(`${currentYear}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

const STATUS_COLORS = {
  completed: '#10b981',
  pending:   '#eab308',
  cancelled: '#ef4444',
};

const SalesCharts = ({ summary, trendData, monthlyPieData }) => {
  const lineChartRef = useRef(null);
  const animTimerRef = useRef(null);

  // All months from Jan this year to current month
  const fullMonths = buildFullYearMonths();

  // Build a lookup map from trendData: { "2026-07": 45000, ... }
  const trendMap = {};
  (trendData || []).forEach(d => {
    if (d.date) trendMap[d.date] = d.sales || 0;
  });

  // Line chart uses ALL months (Jan→now), filling 0 for missing
  const lineLabels = fullMonths.map(formatMonthLabel);
  const lineValues = fullMonths.map(ym => trendMap[ym] || 0);

  // Pie: available months = all months in fullMonths (show 0 for months without data)
  const availableMonths = fullMonths;

  const [selectedMonth, setSelectedMonth] = useState(
    availableMonths[availableMonths.length - 1] || null
  );

  // Keep selectedMonth valid when data refreshes
  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1] || null);
    }
  }, [monthlyPieData]);

  // ── Repeating line animation ──────────────────────────────────────────────
  useEffect(() => {
    const replay = () => {
      const chart = lineChartRef.current;
      if (!chart) return;
      chart.reset();
      chart.update('active');
    };

    animTimerRef.current = setTimeout(() => {
      replay();
      animTimerRef.current = setInterval(replay, 6000);
    }, 800);

    return () => {
      clearTimeout(animTimerRef.current);
      clearInterval(animTimerRef.current);
    };
  }, [trendData]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!summary) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[0, 1].map(i => (
          <div key={i}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64
                       flex items-center justify-center text-gray-400 text-sm">
            No chart data available
          </div>
        ))}
      </div>
    );
  }

  // ── Line Chart config ─────────────────────────────────────────────────────
  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: 'Monthly Sales (₹)',
      data: lineValues,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#6366f1',
      fill: true,
      tension: 0.4,
      borderWidth: 2.5,
    }],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1400,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleColor: '#111827',
        bodyColor: '#6b7280',
        padding: 10,
        callbacks: {
          label: ctx => `₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          callback: v => `₹${Number(v).toLocaleString('en-IN', { notation: 'compact', maximumFractionDigits: 1 })}`,
          font: { size: 11 },
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };

  // ── Pie Chart config ──────────────────────────────────────────────────────
  const pieMonth = selectedMonth && monthlyPieData && monthlyPieData[selectedMonth];
  const pieItems = [
    { name: 'Completed', value: pieMonth ? (pieMonth.completed || 0) : 0, color: STATUS_COLORS.completed },
    { name: 'Pending',   value: pieMonth ? (pieMonth.pending   || 0) : 0, color: STATUS_COLORS.pending   },
    { name: 'Cancelled', value: pieMonth ? (pieMonth.cancelled || 0) : 0, color: STATUS_COLORS.cancelled },
  ].filter(i => i.value > 0);

  const pieData = {
    labels: pieItems.map(i => i.name),
    datasets: [{
      data: pieItems.map(i => i.value),
      backgroundColor: pieItems.map(i => i.color),
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 8,
    }],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { animateRotate: true, duration: 900 },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 12 },
          generateLabels: chart => {
            const ds = chart.data.datasets[0];
            return chart.data.labels.map((label, i) => ({
              text: `${label}: ₹${Number(ds.data[i]).toLocaleString('en-IN')}`,
              fillStyle: ds.backgroundColor[i],
              strokeStyle: '#fff',
              lineWidth: 2,
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleColor: '#111827',
        bodyColor: '#6b7280',
        padding: 10,
        callbacks: {
          label: ctx => {
            const val = ctx.parsed;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return ` ₹${Number(val).toLocaleString('en-IN')}  (${pct}%)`;
          },
        },
      },
    },
  };

  // Total for selected month
  const monthTotal = pieItems.reduce((s, i) => s + i.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

      {/* ── Monthly Sales Trend ─────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Monthly Sales Trend</h3>
          <span className="text-xs text-indigo-400 italic font-medium">↻ Animates every 6s</span>
        </div>
        <div className="flex-1 min-h-[260px] relative">
          <Line ref={lineChartRef} data={lineData} options={lineOptions} />
        </div>
      </div>

      {/* ── Revenue by Status Pie ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Revenue by Status</h3>
            {monthTotal > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Total: ₹{monthTotal.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <select
            value={selectedMonth || ''}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-h-[260px] relative">
          {pieItems.length > 0 ? (
            <Pie data={pieData} options={pieOptions} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <span className="text-3xl">📊</span>
              <span>No orders for {formatMonthLabel(selectedMonth)}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SalesCharts;
