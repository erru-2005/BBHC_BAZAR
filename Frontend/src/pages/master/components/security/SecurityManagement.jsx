import React, { useState, useEffect } from 'react';
import { getBlockedUsers, blockUser, unblockUser, getBlockedIPs, blockIP, unblockIP } from '../../../../services/api';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import Toast from '../../../../components/Toast';

const SecurityManagement = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    type: 'danger',
    onConfirm: () => {}
  });
  const [toastInfo, setToastInfo] = useState({ isVisible: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToastInfo({ isVisible: true, message, type });
  const closeToast = () => setToastInfo(prev => ({ ...prev, isVisible: false }));

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const data = await getBlockedUsers();
        setBlockedUsers(Array.isArray(data) ? data : []);
      } else {
        const data = await getBlockedIPs();
        setBlockedIPs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      alert('Failed to load security data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Pause User',
      message: 'Are you sure you want to pause this user?',
      confirmText: 'Pause',
      type: 'danger',
      onConfirm: async () => {
        try {
          await blockUser(userId);
          showToast('User paused successfully', 'success');
          fetchData();
        } catch (error) {
          showToast(error.response?.data?.error || 'Failed to block user', 'error');
        }
      }
    });
  };

  const handleUnblockUser = async (userId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unpause User',
      message: 'Are you sure you want to unpause this user?',
      confirmText: 'Unpause',
      type: 'info',
      onConfirm: async () => {
        try {
          await unblockUser(userId);
          showToast('User unpaused successfully', 'success');
          fetchData();
        } catch (error) {
          showToast(error.response?.data?.error || 'Failed to unblock user', 'error');
        }
      }
    });
  };

  const handleBlockIP = async (ip) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Pause IP',
      message: 'Are you sure you want to pause this IP?',
      confirmText: 'Pause',
      type: 'danger',
      onConfirm: async () => {
        try {
          await blockIP(ip);
          showToast('IP paused successfully', 'success');
          fetchData();
        } catch (error) {
          showToast(error.response?.data?.error || 'Failed to block IP', 'error');
        }
      }
    });
  };

  const handleUnblockIP = async (ip) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unpause IP',
      message: 'Are you sure you want to unpause this IP?',
      confirmText: 'Unpause',
      type: 'info',
      onConfirm: async () => {
        try {
          await unblockIP(ip);
          showToast('IP unpaused successfully', 'success');
          fetchData();
        } catch (error) {
          showToast(error.response?.data?.error || 'Failed to unblock IP', 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Security Management</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Blocked Users
            </button>
            <button
              onClick={() => setActiveTab('ips')}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'ips'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Blocked IPs
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Blocks</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {(!blockedUsers || blockedUsers.length === 0) ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">No blocked users found.</td>
                    </tr>
                  ) : (
                    blockedUsers.map((user) => (
                      <tr key={user._id || Math.random()}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{user.username || user.email || 'N/A'}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {user.total_blocks || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_permanently_blocked ? 'bg-red-100 text-red-800' : (user.blocked_until && new Date(user.blocked_until) > new Date() ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800')}`}>
                            {user.is_permanently_blocked ? 'Paused' : (user.blocked_until && new Date(user.blocked_until) > new Date() ? 'Temporarily Blocked' : 'Active')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!user.is_permanently_blocked && (
                            <button
                              onClick={() => handleBlockUser(user._id)}
                              className="text-red-600 hover:text-red-900 mr-4"
                            >
                              Pause Account
                            </button>
                          )}
                          {(user.is_permanently_blocked || (user.blocked_until && new Date(user.blocked_until) > new Date())) && (
                            <button
                              onClick={() => handleUnblockUser(user._id)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Unpause
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP Address</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Failed Count</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Failed</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {(!blockedIPs || blockedIPs.length === 0) ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">No blocked IPs found.</td>
                    </tr>
                  ) : (
                    blockedIPs.map((ip) => (
                      <tr key={ip._id || Math.random()}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{ip.ip_address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {ip.failed_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {ip.last_failed_at ? new Date(ip.last_failed_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ip.is_permanently_blocked ? 'bg-red-100 text-red-800' : (ip.blocked_until && new Date(ip.blocked_until) > new Date() ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800')}`}>
                            {ip.is_permanently_blocked ? 'Paused' : (ip.blocked_until && new Date(ip.blocked_until) > new Date() ? 'Temporarily Blocked' : 'Active')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {!ip.is_permanently_blocked && (
                            <button
                              onClick={() => handleBlockIP(ip.ip_address)}
                              className="text-red-600 hover:text-red-900 mr-4"
                            >
                              Pause IP
                            </button>
                          )}
                          {(ip.is_permanently_blocked || (ip.blocked_until && new Date(ip.blocked_until) > new Date())) && (
                            <button
                              onClick={() => handleUnblockIP(ip.ip_address)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Unpause
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
      />
      <div className="fixed bottom-4 right-4 z-50">
        <Toast
            message={toastInfo.message}
            type={toastInfo.type}
            isVisible={toastInfo.isVisible}
            onClose={closeToast}
        />
      </div>
    </div>
  );
};

export default SecurityManagement;
