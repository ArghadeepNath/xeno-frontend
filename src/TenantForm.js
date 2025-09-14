import React, { useState } from "react";

export default function TenantForm({ onTenantCreated }) {
  const [name, setName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate store URL when name changes
  const handleNameChange = (e) => {
    const storeName = e.target.value;
    setName(storeName);
    
    if (storeName.trim()) {
      // Convert to lowercase and replace spaces with hyphens
      const urlFriendlyName = storeName.toLowerCase().replace(/\s+/g, '-');
      setStoreUrl(`https://${urlFriendlyName}.myshopify.com`);
    } else {
      setStoreUrl("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You must be logged in to add a Shopify store");
        setLoading(false);
        return;
      }

      const res = await fetch("https://xeno-backend-7jfm.onrender.com/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name, storeUrl, apiToken }),
      });

      const data = await res.json();
      if (res.ok) {
        onTenantCreated(data);
        setName(""); 
        setStoreUrl(""); 
        setApiToken("");
        setError("");
      } else {
        setError(data.error || "Failed to add Shopify store");
      }
    } catch (err) {
      console.error("STORE CREATE ERROR:", err);
      setError("Error adding Shopify store");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="icon-md text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">Add New Shopify Store</h3>
            <p className="text-sm text-gray-600">
              Connect a Shopify store to start syncing data and analytics
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="alert alert-error">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Store Name
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder="e.g., xeno2, Fashion Store, Electronics Store" 
              value={name} 
              onChange={handleNameChange} 
              required 
            />
            <p className="text-xs text-gray-500 mt-1">
              Just enter the store name and the URL will be auto-generated!
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Store URL
            </label>
            <input 
              type="url"
              className="form-input"
              placeholder="https://your-store.myshopify.com" 
              value={storeUrl} 
              onChange={e => setStoreUrl(e.target.value)} 
              required 
              style={{ backgroundColor: "#f9fafb", color: "#6b7280" }}
            />
            <p className="text-xs text-gray-500 mt-1">
              This URL is automatically generated from your store name
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Admin API Access Token
            </label>
            <input 
              type="password"
              className="form-input"
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
              value={apiToken} 
              onChange={e => setApiToken(e.target.value)} 
              required 
            />
            <p className="text-xs text-gray-500 mt-1">
              Get this from your Shopify store's Apps section
            </p>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Adding Store...
                </>
              ) : (
                <>
                  <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Shopify Store
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
