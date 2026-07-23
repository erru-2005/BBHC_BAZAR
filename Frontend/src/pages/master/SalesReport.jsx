import React, { useState, useEffect, useRef } from 'react';
import { getSalesReport } from '../../services/api';
import SalesCards from './components/sales/SalesCards';
import SalesFilters from './components/sales/SalesFilters';
import SalesCharts from './components/sales/SalesCharts';
import SalesTable from './components/sales/SalesTable';
import { Download, Printer, BarChart2, RefreshCw } from 'lucide-react';

// ---- Simple Error Boundary ----
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
          <p className="font-semibold">Something went wrong in this section.</p>
          <p className="text-sm mt-1">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- Spinner ----
const Spinner = () => (
  <div className="flex flex-col items-center justify-center h-64 gap-3">
    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    <p className="text-gray-500 text-sm">Loading report data...</p>
  </div>
);

const DEFAULT_FILTERS = {
  date_range: 'thisMonth',
  start_date: '',
  end_date: '',
  status: 'all',
  search: '',
};

const SalesReport = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportData, setReportData] = useState({
    orders: [],
    summary: null,
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  });

  // Track whether a fetch is already in flight
  const fetchingRef = useRef(false);

  const fetchData = async (activeFilters, page) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = {
        dateRange: activeFilters.date_range,
        status: activeFilters.status,
        search: activeFilters.search,
        page,
        limit: 20,
      };
      if (activeFilters.date_range === 'custom' && activeFilters.start_date && activeFilters.end_date) {
        params.startDate = activeFilters.start_date;
        params.endDate = activeFilters.end_date;
      }
      const response = await getSalesReport(params);
      // The API client interceptor already returns response.data, so response IS the data.
      const safeData = response;
      if (safeData && typeof safeData === 'object' && !Array.isArray(safeData) && ('orders' in safeData || 'summary' in safeData)) {
        setReportData(safeData);
      } else {
        // Log the actual bad value so we can diagnose it
        const statusInfo = response?.status ?? 'no status';
        const dataInfo = safeData === null ? 'null' : safeData === undefined ? 'undefined' : typeof safeData === 'string' ? `string:"${safeData.substring(0,80)}"` : JSON.stringify(safeData)?.substring(0, 100);
        setError(`API error (HTTP ${statusInfo}): received ${dataInfo}. Check backend logs.`);
      }
    } catch (err) {
      console.error('Sales report fetch error:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(DEFAULT_FILTERS, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    // Use a setTimeout to ensure any pending state updates from onChange are flushed
    setTimeout(() => {
      setFilters(currentFilters => {
        fetchData(currentFilters, 1);
        return currentFilters;
      });
    }, 0);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(filters, newPage);
  };

  // ---- Helper to fetch all records for export ----
  const fetchAllOrdersForExport = async () => {
    try {
      const params = {
        dateRange: filters.date_range,
        status: filters.status,
        search: filters.search,
        page: 1,
        limit: 10000, // Fetch up to 10k records for export
      };
      if (filters.date_range === 'custom' && filters.start_date && filters.end_date) {
        params.startDate = filters.start_date;
        params.endDate = filters.end_date;
      }
      const response = await getSalesReport(params);
      return response.orders || [];
    } catch (e) {
      alert('Failed to fetch data for export: ' + (e.message || ''));
      return [];
    }
  };

  // ---- PDF Export ----
  const handleExportPDF = async () => {
    const ordersToExport = await fetchAllOrdersForExport();
    if (!ordersToExport.length) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('BBHC BAZAR - Sales Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      if (reportData.summary) {
        doc.text(`Total Revenue: ₹${reportData.summary.total_revenue ?? 0}  |  Orders: ${reportData.summary.total_orders ?? 0}`, 14, 36);
      }
      autoTable(doc, {
        startY: 42,
        head: [['Order ID', 'Customer', 'Date', 'Payment', 'Status', 'Amount (₹)']],
        body: ordersToExport.map(o => [
          o.order_number || o._id?.substring(0, 8) || '-',
          o.user_info?.name || o.customer?.name || o.user_snapshot?.name || 'Unknown',
          o.created_at ? new Date(o.created_at).toLocaleDateString() : '-',
          o.metadata?.payment_method || 'N/A',
          o.status || '-',
          o.total_amount ?? 0,
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save(`sales_report_${Date.now()}.pdf`);
    } catch (e) {
      alert('PDF export failed: ' + e.message);
    }
  };

  // ---- Excel Export ----
  const handleExportExcel = async () => {
    const ordersToExport = await fetchAllOrdersForExport();
    if (!ordersToExport.length) return;
    try {
      const XLSX = await import('xlsx');
      const rows = ordersToExport.map(o => ({
        'Order ID': o.order_number || o._id || '-',
        'Customer': o.user_info?.name || o.customer?.name || o.user_snapshot?.name || 'Unknown',
        'Date': o.created_at ? new Date(o.created_at).toLocaleString() : '-',
        'Payment Method': o.metadata?.payment_method || 'N/A',
        'Status': o.status || '-',
        'Items': o.quantity || 1,
        'Total Amount (₹)': o.total_amount ?? 0,
        'Shipping (₹)': o.delivery_charge ?? 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
      XLSX.writeFile(wb, `sales_report_${Date.now()}.xlsx`);
    } catch (e) {
      alert('Excel export failed: ' + e.message);
    }
  };

  // ---- CSV Export ----
  const handleExportCSV = async () => {
    const ordersToExport = await fetchAllOrdersForExport();
    if (!ordersToExport.length) return;
    const headers = ['Order ID', 'Customer', 'Date', 'Payment', 'Status', 'Items', 'Total Amount'];
    const rows = ordersToExport.map(o => [
      o.order_number || o._id || '',
      o.user_info?.name || o.customer?.name || o.user_snapshot?.name || 'Unknown',
      o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
      o.metadata?.payment_method || 'N/A',
      o.status || '',
      o.quantity || 1,
      o.total_amount ?? 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-gray-500 text-sm">Comprehensive overview of store performance</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium shadow-sm transition-colors"
          >
            <Download size={15} /> CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-colors"
          >
            <Download size={15} /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors"
          >
            <Download size={15} /> PDF
          </button>
        </div>
      </div>

      {/* ---- KPI Cards & Charts (Shown before filters as requested) ---- */}
      {!loading && !error && reportData && (
        <>
          <ErrorBoundary>
            <SalesCards summary={reportData?.summary ?? null} />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <SalesCharts 
              summary={reportData?.summary ?? null} 
              trendData={reportData?.all_trend_data ?? reportData?.trend_data ?? []}
              monthlyPieData={reportData?.monthly_pie_data ?? {}}
            />
          </ErrorBoundary>
        </>
      )}

      {/* ---- Filters ---- */}
      <ErrorBoundary>
        <SalesFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
        />
      </ErrorBoundary>

      {/* ---- Error State ---- */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => fetchData(filters, currentPage)}
            className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ---- Loading ---- */}
      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* ---- Table Header ---- */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Detailed Orders</h2>
            <span className="text-sm text-gray-400">
              {reportData?.pagination?.total ?? 0} total orders
            </span>
          </div>

          {/* ---- Orders Table ---- */}
          <ErrorBoundary>
            <SalesTable
              orders={reportData?.orders ?? []}
              pagination={reportData?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 }}
              onPageChange={handlePageChange}
            />
          </ErrorBoundary>
        </>
      )}
    </div>
  );
};

export default SalesReport;
