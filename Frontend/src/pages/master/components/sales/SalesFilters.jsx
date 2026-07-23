import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Calendar, RefreshCw, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'seller_accepted', label: 'Accepted (Not at Outlet)' },
  { value: 'pending_seller', label: 'Pending' },
  { value: 'handed_over', label: 'At Outlet (Not Delivered)' },
  { value: 'cancelled', label: 'Cancelled (User)' },
  { value: 'cancelled_master', label: 'Cancelled (Admin)' },
  { value: 'seller_rejected', label: 'Cancelled (Seller)' }
];

const SalesFilters = ({ filters, onFilterChange, onApply }) => {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusRef = useRef(null);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onApply && onApply();
  };

  const handleSelectChange = (key, value) => {
    onFilterChange(key, value);
  };

  const handleStatusToggle = (value) => {
    const currentStatuses = filters.status === 'all' || !filters.status 
      ? [] 
      : filters.status.split(',');
      
    let newStatuses;
    if (currentStatuses.includes(value)) {
      newStatuses = currentStatuses.filter(s => s !== value);
    } else {
      newStatuses = [...currentStatuses, value];
    }
    
    onFilterChange('status', newStatuses.length > 0 ? newStatuses.join(',') : 'all');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Date Range */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Date Range
          </label>
          <select
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 p-2.5"
            value={filters.date_range}
            onChange={(e) => handleSelectChange('date_range', e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Order Status (Multi-Select) */}
        <div ref={statusRef} className="relative">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Order Status
          </label>
          <div 
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg p-2.5 cursor-pointer flex justify-between items-center"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
          >
            <span className="truncate pr-4">
              {filters.status === 'all' || !filters.status 
                ? 'All Statuses' 
                : `${filters.status.split(',').length} Selected`}
            </span>
            <ChevronDown size={16} className="text-gray-400" />
          </div>
          
          {isStatusOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div 
                className="px-3 py-2 border-b border-gray-100 text-sm text-blue-600 cursor-pointer hover:bg-gray-50"
                onClick={() => onFilterChange('status', 'all')}
              >
                Clear / All Statuses
              </div>
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={filters.status !== 'all' && filters.status?.split(',').includes(option.value)}
                    onChange={() => handleStatusToggle(option.value)}
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Search
          </label>
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={14} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 p-2.5 pl-9"
              placeholder="Search Seller (Name/ID)..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onApply();
                }
              }}
            />
          </form>
        </div>

        {/* Custom Date Range — show only when custom is selected */}
        {filters.date_range === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                From Date
              </label>
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 p-2.5"
                value={filters.start_date || ''}
                onChange={(e) => onFilterChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                To Date
              </label>
              <input
                type="date"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 p-2.5"
                value={filters.end_date || ''}
                onChange={(e) => onFilterChange('end_date', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* Apply Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={onApply}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 text-sm font-semibold shadow-sm transition-colors"
        >
          <RefreshCw size={14} />
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default SalesFilters;
