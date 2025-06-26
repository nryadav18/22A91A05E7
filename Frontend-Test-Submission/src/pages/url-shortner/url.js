import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './url.css'

const Logger = {
  async log(stack, level, packageName, message) {
    try {
      const response = await axios.post(`${process.env.BACKEND_URL}/evaluation-service/logs`, {
        stack: stack.toLowerCase(),
        level: level.toLowerCase(),
        package: packageName.toLowerCase(),
        message: message
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 200) {
      }
    } catch (error) {
      console.error('Logging failed:', error.response?.data || error.message);
    }
  }
};

const generateShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const AffordmedURLShortner = () => {
  const [urls, setUrls] = useState([]);
  const [longUrl, setLongUrl] = useState('');
  const [validity, setValidity] = useState(30);
  const [customAlias, setCustomAlias] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState({});

  useEffect(() => {
    Logger.log('frontend', 'info', 'component', 'URLShortener component mounted');

    const savedUrls = JSON.parse(localStorage.getItem('urlShortenerData') || '[]');
    setUrls(savedUrls);

    const initialAnalytics = {};
    savedUrls.forEach(url => {
      initialAnalytics[url.shortCode] = {
        clicks: url.clicks || 0,
        createdAt: url.createdAt,
        lastAccessed: url.lastAccessed || null
      };
    });
    setAnalytics(initialAnalytics);
  }, []);

  const handleCreateShortUrl = async () => {
    Logger.log('frontend', 'info', 'handler', 'Starting URL shortening process');

    if (!longUrl.trim()) {
      Logger.log('frontend', 'error', 'validation', 'URL field is empty');
      alert('Please enter a URL');
      return;
    }

    if (!isValidUrl(longUrl)) {
      Logger.log('frontend', 'error', 'validation', 'Invalid URL format provided');
      alert('Please enter a valid URL');
      return;
    }

    if (validity <= 0) {
      Logger.log('frontend', 'error', 'validation', 'Invalid validity period provided');
      alert('Validity must be greater than 0 minutes');
      return;
    }

    setIsLoading(true);

    try {
      let shortCode = customAlias.trim();

      if (!shortCode) {
        do {
          shortCode = generateShortCode();
        } while (urls.find(url => url.shortCode === shortCode));
      } else {
        if (urls.find(url => url.shortCode === shortCode)) {
          Logger.log('frontend', 'error', 'validation', 'Custom alias already exists');
          alert('Custom alias already exists. Please choose a different one.');
          setIsLoading(false);
          return;
        }
      }

      const newUrl = {
        id: Date.now(),
        longUrl: longUrl,
        shortCode: shortCode,
        shortUrl: `https://affordmed.ly/${shortCode}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + validity * 60 * 1000).toISOString(),
        validity: validity,
        clicks: 0,
        isActive: true
      };

      const updatedUrls = [...urls, newUrl];
      setUrls(updatedUrls);
      localStorage.setItem('urlShortenerData', JSON.stringify(updatedUrls));


      setAnalytics(prev => ({
        ...prev,
        [shortCode]: {
          clicks: 0,
          createdAt: newUrl.createdAt,
          lastAccessed: null
        }
      }));

      Logger.log('frontend', 'info', 'handler', `URL shortened successfully with code: ${shortCode}`);

      setLongUrl('');
      setCustomAlias('');
      setValidity(30);

    } catch (error) {
      alert('Failed to create short URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlClick = (shortCode) => {
    Logger.log('frontend', 'info', 'analytics', `Short URL clicked: ${shortCode}`);

    const urlIndex = urls.findIndex(url => url.shortCode === shortCode);
    if (urlIndex === -1) return;

    const url = urls[urlIndex];

    if (new Date() > new Date(url.expiresAt)) {
      Logger.log('frontend', 'warn', 'handler', `Attempted to access expired URL: ${shortCode}`);
      alert('This URL has expired');
      return;
    }

    const updatedUrls = [...urls];
    updatedUrls[urlIndex].clicks += 1;
    updatedUrls[urlIndex].lastAccessed = new Date().toISOString();

    setUrls(updatedUrls);
    localStorage.setItem('urlShortenerData', JSON.stringify(updatedUrls));

    setAnalytics(prev => ({
      ...prev,
      [shortCode]: {
        ...prev[shortCode],
        clicks: updatedUrls[urlIndex].clicks,
        lastAccessed: updatedUrls[urlIndex].lastAccessed
      }
    }));

    // Simulate redirect
    window.open(url.longUrl, '_blank');
  };

  const handleDeleteUrl = (id) => {
    Logger.log('frontend', 'info', 'handler', `Deleting URL with ID: ${id}`);

    const updatedUrls = urls.filter(url => url.id !== id);
    setUrls(updatedUrls);
    localStorage.setItem('urlShortenerData', JSON.stringify(updatedUrls));

    const urlToDelete = urls.find(url => url.id === id);
    if (urlToDelete) {
      const newAnalytics = { ...analytics };
      delete newAnalytics[urlToDelete.shortCode];
      setAnalytics(newAnalytics);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiresAt) => {
    return new Date() > new Date(expiresAt);
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="url-page">
      <div className="container">
        <header className="header">
          <h1> Affordmed - URL Shortener</h1>
          <p>Shorten the URLs here with minimum Expiry Time of 30 min</p>
        </header>

        <div className="main-content">
          <div className="url-form">
            <h2>Raj - Shortening URL</h2>
            <div className="form-group">
              <label htmlFor="longUrl">Enter your LONG URL</label>
              <input
                id="longUrl"
                type="url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="https://example.com/very-long-url"
                className="input-field"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="validity">Select the Validity (minutes)</label>
                <input
                  id="validity"
                  type="number"
                  value={validity}
                  onChange={(e) => setValidity(parseInt(e.target.value) || 30)}
                  min="1"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="customAlias">Create your Own Link (optional)</label>
                <input
                  id="customAlias"
                  type="text"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder="create-custom-link"
                  className="input-field"
                />
              </div>
            </div>

            <button
              onClick={handleCreateShortUrl}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Creating...' : 'Shorten URL'}
            </button>
          </div>

          <div className="urls-section">
            <h2>Created URLs ({urls.length})</h2>
            {urls.length === 0 ? (
              <div className="empty-state">
                <p>No URLs created as of now. Thanks to Affordmed for the Task!</p>
              </div>
            ) : (
              <div className="urls-grid">
                {urls.map((url) => (
                  <div key={url.id} className={`url-card ${isExpired(url.expiresAt) ? 'expired' : ''}`}>
                    <div className="url-header">
                      <div className="url-info">
                        <h3 className="short-url" onClick={() => handleUrlClick(url.shortCode)}>
                          {url.shortUrl}
                        </h3>
                        <p className="long-url">{url.longUrl}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteUrl(url.id)}
                        className="delete-btn"
                        title="Delete URL"
                      >
                        X
                      </button>
                    </div>

                    <div className="url-stats">
                      <div className="stat">
                        <span className="stat-label">Clicks:</span>
                        <span className="stat-value">{url.clicks}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Status:</span>
                        <span className={`status ${isExpired(url.expiresAt) ? 'expired' : 'active'}`}>
                          {isExpired(url.expiresAt) ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Time Remaining:</span>
                        <span className="stat-value">{getTimeRemaining(url.expiresAt)}</span>
                      </div>
                    </div>

                    <div className="url-details">
                      <div className="detail">
                        <span>Created at: {formatDate(url.createdAt)}</span>
                      </div>
                      <div className="detail">
                        <span>Expires on: {formatDate(url.expiresAt)}</span>
                      </div>
                      {url.lastAccessed && (
                        <div className="detail">
                          <span>Last accessed on: {formatDate(url.lastAccessed)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {urls.length > 0 && (
            <div className="analytics-section">
              <h2>Affordmed Created Links Overview</h2>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>Total Created URLs</h3>
                  <div className="metric">{urls.length}</div>
                </div>
                <div className="analytics-card">
                  <h3>Total Active URLs</h3>
                  <div className="metric">{urls.filter(url => !isExpired(url.expiresAt)).length}</div>
                </div>
                <div className="analytics-card">
                  <h3>Total   Expired URLs</h3>
                  <div className="metric">{urls.filter(url => isExpired(url.expiresAt)).length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AffordmedURLShortner;