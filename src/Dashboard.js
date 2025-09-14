import React, { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard({ token, onLogout }) {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [stats, setStats] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: "Loading...", email: "Loading..." });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateRange, setDateRange] = useState({
    from: "2025-09-10",
    to: "2025-09-14"
  });
  const [ordersDateRange, setOrdersDateRange] = useState({
    from: "2025-09-10",
    to: "2025-09-14"
  });

  // Helper function to generate date range
  const generateDateRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Helper function to generate mock data for date range
  const generateRevenueData = (startDate, endDate) => {
    const dates = generateDateRange(startDate, endDate);
    const data = dates.map((date, index) => {
      // Create a more realistic seed based on the actual date
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const dayOfMonth = dateObj.getDate();
      
      // Base revenue varies by day of week (weekends typically lower)
      let baseRevenue = 1500;
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        baseRevenue = 1200;
      } else if (dayOfWeek === 1) { // Monday
        baseRevenue = 1800;
      }
      
      // Add variation based on day of month and some randomness
      const variation = Math.sin(index * 0.8) * 300 + Math.cos(dayOfMonth * 0.3) * 150 + (date.charCodeAt(8) % 200);
      return Math.round((baseRevenue + variation) * 100) / 100;
    });
    return { labels: dates, data };
  };

  const generateOrdersData = (startDate, endDate) => {
    const dates = generateDateRange(startDate, endDate);
    const data = dates.map((date, index) => {
      // Create a more realistic seed based on the actual date
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const dayOfMonth = dateObj.getDate();
      
      // Base orders vary by day of week
      let baseOrders = 3;
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        baseOrders = 1;
      } else if (dayOfWeek === 1 || dayOfWeek === 5) { // Monday/Friday
        baseOrders = 5;
      }
      
      // Add variation based on day of month and some randomness
      const variation = Math.floor(Math.sin(index * 1.2) * 3 + Math.cos(dayOfMonth * 0.4) * 2 + (date.charCodeAt(8) % 4));
      return Math.max(0, baseOrders + variation);
    });
    return { labels: dates, data };
  };

  // Mock data for demonstration - replace with actual API calls
  const mockStats = {
    totalRevenue: 1721.89,
    totalOrders: 3,
    totalCustomers: 4,
    topCustomers: [
      { name: "Russell Winfield", email: "Russel.winfield@example.com", spend: 885.95, initials: "RW" },
      { name: "Demo Customer", email: "demo123customer@gmail.com", spend: 825.94, initials: "DC" },
      { name: "Ayumu Hirano", email: "ayumu.hirano@example.com", spend: 10.00, initials: "AH" }
    ]
  };

  // Fetch user information
  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:3000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        // Create a name from email (take part before @ and capitalize)
        const emailName = data.email.split('@')[0];
        const formattedName = emailName
          .split('.')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        
        setUserInfo({
          name: formattedName,
          email: data.email
        });
      })
      .catch((err) => {
        console.error("Failed to fetch user info:", err);
        setUserInfo({ name: "User", email: "user@example.com" });
      });
  }, [token]);

  // Fetch stores for the logged-in user
  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:3000/stores", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setStores(data);
        if (data.length > 0) {
          setSelectedStore(data[0]);
        }
      })
      .catch((err) => console.error(err));
  }, [token]);

  // Fetch stats for the selected store
  useEffect(() => {
    if (!selectedStore || !token) return;

    fetch(`http://localhost:3000/stats/${selectedStore.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => {
        console.error(err);
        // Use mock data if API fails
        setStats(mockStats);
      });
  }, [selectedStore, token]);

  const handleSync = async () => {
    if (!selectedStore || !token) return;
    
    setSyncing(true);
    setSyncMessage("");
    
    try {
      const response = await fetch(`http://localhost:3000/sync/${selectedStore.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSyncMessage(`✅ ${data.message}`);
        // Refresh stats after successful sync
        const statsResponse = await fetch(`http://localhost:3000/stats/${selectedStore.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsResponse.json();
        setStats(statsData);
        // Trigger chart refresh after a short delay to ensure sync is complete
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 500);
      } else {
        setSyncMessage(`❌ ${data.error || "Sync failed"}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncMessage("❌ Network error during sync");
    } finally {
      setSyncing(false);
    }
  };

  // State for chart data
  const [revenueChartData, setRevenueChartData] = useState({ labels: [], datasets: [] });
  const [ordersChartData, setOrdersChartData] = useState({ labels: [], datasets: [] });

  // Fetch revenue data when date range or selected store changes
  useEffect(() => {
    if (!selectedStore || !token) return;

    const fetchRevenueData = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/stats/${selectedStore.id}/revenue?startDate=${dateRange.from}&endDate=${dateRange.to}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        
        setRevenueChartData({
          labels: data.labels,
          datasets: [
            {
              label: 'Daily Revenue ($)',
              data: data.data,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.1
            }
          ]
        });
      } catch (error) {
        console.error('Failed to fetch revenue data:', error);
        // Fallback to mock data
        const revenueData = generateRevenueData(dateRange.from, dateRange.to);
        setRevenueChartData({
          labels: revenueData.labels,
          datasets: [
            {
              label: 'Daily Revenue ($)',
              data: revenueData.data,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.1
            }
          ]
        });
      }
    };

    fetchRevenueData();
  }, [selectedStore, token, dateRange.from, dateRange.to, refreshTrigger]);

  // Fetch orders data when date range or selected store changes
  useEffect(() => {
    if (!selectedStore || !token) return;

    const fetchOrdersData = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/stats/${selectedStore.id}/orders?startDate=${ordersDateRange.from}&endDate=${ordersDateRange.to}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        
        setOrdersChartData({
          labels: data.labels,
          datasets: [
            {
              label: 'Daily Orders',
              data: data.data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1
            }
          ]
        });
      } catch (error) {
        console.error('Failed to fetch orders data:', error);
        // Fallback to mock data
        const ordersData = generateOrdersData(ordersDateRange.from, ordersDateRange.to);
        setOrdersChartData({
          labels: ordersData.labels,
          datasets: [
            {
              label: 'Daily Orders',
              data: ordersData.data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1
            }
          ]
        });
      }
    };

    fetchOrdersData();
  }, [selectedStore, token, ordersDateRange.from, ordersDateRange.to, refreshTrigger]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 10
          }
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: false,
        ticks: {
          font: {
            size: 10
          }
        }
      }
    },
  };

  const ordersChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 10
          }
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 10
          }
        }
      }
    },
  };

  if (!token) return <p>Please log in to view your dashboard</p>;
  if (!stores.length) return <p>Loading your Shopify stores...</p>;

  return (
    <div className="dashboard-container">
      {/* Header Box */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="gradient-text">
              Welcome Back, {userInfo.name}! 👋
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Here's a snapshot of your store's performance.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span className="text-sm text-gray-600">{userInfo.email}</span>
            </div>
            <button 
              onClick={onLogout}
              className="gradient-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Store Selection and Sync Box */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Select Shopify Store
            </label>
            <select
              className="select-input"
              value={selectedStore ? selectedStore.id : ""}
              onChange={(e) =>
                setSelectedStore(stores.find((s) => s.id === parseInt(e.target.value)))
              }
            >
              <option value="">-- Select a Shopify store --</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-end">
            <button 
              onClick={handleSync} 
              disabled={syncing || !selectedStore}
              className="sync-button"
            >
              {syncing ? (
                <>
                  <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Data
                </>
              )}
            </button>
            {syncMessage && (
              <div className={`sync-message ${syncMessage.includes("✅") ? "sync-success" : "sync-error"}`}>
                {syncMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {!selectedStore && (
        <div className="loading-container">
          <div className="loading-icon">
            <svg className="h-10 w-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="loading-title">No store selected</h3>
          <p className="loading-text">Please select a Shopify store to view analytics</p>
        </div>
      )}

      {selectedStore && !stats && (
        <div className="loading-container">
          <div className="loading-icon">
            <div className="spinner"></div>
          </div>
          <h3 className="loading-title">Loading analytics</h3>
          <p className="loading-text">Fetching data for {selectedStore.name}...</p>
        </div>
      )}

      {selectedStore && stats && (
        <>
          {/* All 6 KPI Cards in 3+3 Layout */}
          <div 
          className="kpi-grid" 
        style={{ 
    display: "flex", 
    flexDirection: "column", 
    gap: "20px"  // spacing between the two rows
  }}
>
            {/* First Row - 3 KPI Cards */}
            <div className="kpi-row" style={{ display: "flex", gap: "0", justifyContent: "space-around" }}>
              {/* Revenue KPI */}
              <div className="kpi-card revenue-card" >
                <div className="text-center">
                  <div className="kpi-icon revenue-icon">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="kpi-title revenue-title">TOTAL REVENUE</h3>
                  <p className="kpi-value">
                    ${stats?.totalRevenue?.toFixed(2) || mockStats.totalRevenue.toFixed(2)}
                  </p>
                  <div className="kpi-label revenue-label">💰 Revenue</div>
                </div>
              </div>
              
              {/* Orders KPI */}
              <div className="kpi-card orders-card">
                <div className="text-center">
                  <div className="kpi-icon orders-icon">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="kpi-title orders-title">TOTAL ORDERS</h3>
                  <p className="kpi-value">
                    {stats?.totalOrders || mockStats.totalOrders}
                  </p>
                  <div className="kpi-label orders-label">📦 Orders</div>
                </div>
              </div>
              
              {/* Customers KPI */}
              <div className="kpi-card customers-card">
                <div className="text-center">
                  <div className="kpi-icon customers-icon">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="kpi-title customers-title">TOTAL CUSTOMERS</h3>
                  <p className="kpi-value">
                    {stats?.totalCustomers || mockStats.totalCustomers}
                  </p>
                  <div className="kpi-label customers-label">👥 Customers</div>
                </div>
              </div>
            </div>

            {/* Second Row - 3 Chart Cards */}
            <div className="kpi-row" style={{ display: "flex", gap: "0", justifyContent: "space-around" }}>
              {/* Revenue Over Time Chart */}
              <div className="kpi-card chart-card">
                <div className="chart-header">
                  <div className="chart-title-section">
                    <div className="chart-icon revenue-chart-icon">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h3 className="chart-title">Revenue Over Time</h3>
                  </div>
                  
                  <div className="date-inputs">
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                      className="date-input"
                    />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                      className="date-input"
                    />
                  </div>
                </div>
                
                <div className="chart-container">
                  <Line data={revenueChartData} options={chartOptions} />
                </div>
              </div>

              {/* Orders by Date Chart */}
              <div className="kpi-card chart-card">
                <div className="chart-header">
                  <div className="chart-title-section">
                    <div className="chart-icon orders-chart-icon">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="chart-title">Orders by Date</h3>
                  </div>
                  
                  <div className="date-inputs">
                    <input
                      type="date"
                      value={ordersDateRange.from}
                      onChange={(e) => setOrdersDateRange({...ordersDateRange, from: e.target.value})}
                      className="date-input orders-date-input"
                    />
                    <input
                      type="date"
                      value={ordersDateRange.to}
                      onChange={(e) => setOrdersDateRange({...ordersDateRange, to: e.target.value})}
                      className="date-input orders-date-input"
                    />
                  </div>
                </div>
                
                <div className="chart-container">
                  <Line data={ordersChartData} options={ordersChartOptions} />
                </div>
              </div>

              {/* Top Customers by Spend */}
              <div className="kpi-card chart-card">
                <div className="chart-header">
                  <div className="chart-title-section">
                    <div className="chart-icon customers-chart-icon">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="chart-title">Top Customers by Spend</h3>
                  </div>
                </div>
                
                <div className="customer-list">
                  {(stats?.topCustomers || mockStats.topCustomers).map((customer, idx) => (
                    <div key={idx} className="customer-item">
                      <div className="customer-info">
                        <div className="customer-avatar">
                          {customer.initials}
                        </div>
                        <div className="customer-details">
                          <h4>{customer.name}</h4>
                          <p>{customer.email}</p>
                        </div>
                      </div>
                      <div className="customer-spend">
                        <p className="amount">${customer.spend.toFixed(2)}</p>
                        <p className="rank">#{idx + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}