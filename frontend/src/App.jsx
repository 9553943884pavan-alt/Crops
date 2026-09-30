import { useState, useRef } from 'react';

function App() {
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [land, setLand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Web Speech API for Voice Input
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Can be set to hi-IN or te-IN for Hindi/Telugu
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setLocation(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleOptimize = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          budget: parseFloat(budget),
          land_acres: parseFloat(land)
        })
      });
      
      const data = await response.json();
      setResult(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch", error);
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="glass-panel main-panel">
        
        <div className="header">
          <h1>Zero-Friction <span>AgriOptimizer</span></h1>
          <p>We fetch live weather data for you. Just tell us your location.</p>
        </div>

        {!result && (
          <form className="input-form" onSubmit={handleOptimize}>
            <div className="input-group">
              <label>📍 Your Village / Location</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="e.g., Nizamabad" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className={`glow-button ${isListening ? 'listening' : ''}`}
                  onClick={handleVoiceInput}
                  style={{ padding: '0 20px', marginTop: 0 }}
                  title="Speak your location"
                >
                  {isListening ? '🎤...' : '🎤'}
                </button>
              </div>
            </div>
            
            <div className="input-group">
              <label>💰 Total Budget (₹)</label>
              <input 
                type="number" 
                placeholder="e.g., 50000" 
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>🌾 Total Land (Acres)</label>
              <input 
                type="number" 
                placeholder="e.g., 10" 
                value={land}
                onChange={(e) => setLand(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="glow-button" disabled={loading}>
              {loading ? <span className="spinner"></span> : "Optimize My Farm"}
            </button>
          </form>
        )}

        {loading && (
          <div className="loading-state">
            <div className="pulse-ring"></div>
            <p>🛰️ Pinging Live Weather API...</p>
            <p>🤖 Running Machine Learning Models...</p>
          </div>
        )}

        {result && !loading && (
          <div className="results-dashboard fade-in">
            <div className="success-banner">
              {result.message}
            </div>
            
            <div className="dashboard-grid">
              <div className="glass-card stat-card">
                <h3>Total Estimated Profit</h3>
                <div className="profit-value">₹{result.total_estimated_profit.toLocaleString()}</div>
              </div>
              
              <div className="glass-card auto-data-card">
                <h3>Live Automated Data Found</h3>
                <div className="data-badges">
                  <span>Location: {result.resolved_location}</span>
                  <span style={{color: '#fde047'}}>Temp: {result.regional_data.temperature}°C</span>
                  <span style={{color: '#60a5fa'}}>Rain: {result.regional_data.rainfall}mm</span>
                  <span>Nitrogen: {result.regional_data.nitrogen}</span>
                  <span>pH Level: {result.regional_data.ph}</span>
                </div>
              </div>
            </div>

            <h3 className="section-title">Optimized Land Allocation</h3>
            <div className="allocation-list">
              {result.allocations.map((item, idx) => (
                <div key={idx} className="allocation-item">
                  <div className="crop-name">{item.crop}</div>
                  <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${(item.allocated_acres / land) * 100}%` }}></div>
                  </div>
                  <div className="allocation-stats">
                    <span><strong>{item.allocated_acres}</strong> Acres</span>
                    <span>Expected Yield: {item.expected_yield_tonnes} Tonnes</span>
                    <span className="profit-text">+₹{item.profit_est.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="reset-button" onClick={() => setResult(null)}>Plan Another Farm</button>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default App;
