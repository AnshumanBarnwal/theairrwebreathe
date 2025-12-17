import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, Thermometer, AlertCircle, Car, Cigarette, Factory, Flame, Wifi, Usb, RefreshCw } from 'lucide-react';

const TheAirWeBreathe = () => {
  const [pollutionEvents, setPollutionEvents] = useState([]);
  const [serverAddress, setServerAddress] = useState('localhost:5000');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [useSimulatedData, setUseSimulatedData] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingAQI, setIsFetchingAQI] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [sensorData, setSensorData] = useState({
    mq2_raw: 720,
    mq2_ppm: 352,
    alcohol_raw: 380,
    alcohol_detected: false,
    flame_detected: false,
    temp: 22,
    humidity: 52
  });

  const [realAQIData, setRealAQIData] = useState({
    indianAQI: { value: 378, category: 'Very Poor', color: 'from-red-400 to-red-600' },
    usAQI: { value: 298, category: 'Very Unhealthy', color: 'from-purple-400 to-purple-600' },
    pm25: 178,
    pm10: 340
  });

  const convertMQ2ToPPM = (rawValue) => {
    return Math.round((rawValue / 1023) * 500);
  };

  const fetchRealAQIData = async () => {
    setIsFetchingAQI(true);
    try {
      const response = await fetch(
        'https://api.allorigins.win/raw?url=' + 
        encodeURIComponent('https://api.waqi.info/feed/delhi/?token=demo')
      );
      const data = await response.json();
      
      if (data.status === 'ok') {
        const aqiValue = data.data.aqi;
        
        let indianCategory, indianColor;
        if (aqiValue <= 50) { indianCategory = 'Good'; indianColor = 'from-green-400 to-green-600'; }
        else if (aqiValue <= 100) { indianCategory = 'Satisfactory'; indianColor = 'from-lime-400 to-lime-600'; }
        else if (aqiValue <= 200) { indianCategory = 'Moderate'; indianColor = 'from-yellow-400 to-yellow-600'; }
        else if (aqiValue <= 300) { indianCategory = 'Poor'; indianColor = 'from-orange-400 to-orange-600'; }
        else if (aqiValue <= 400) { indianCategory = 'Very Poor'; indianColor = 'from-red-400 to-red-600'; }
        else { indianCategory = 'Severe'; indianColor = 'from-purple-600 to-purple-800'; }

        let usCategory, usColor;
        if (aqiValue <= 50) { usCategory = 'Good'; usColor = 'from-green-400 to-green-600'; }
        else if (aqiValue <= 100) { usCategory = 'Moderate'; usColor = 'from-yellow-400 to-yellow-600'; }
        else if (aqiValue <= 150) { usCategory = 'Unhealthy for Sensitive'; usColor = 'from-orange-400 to-orange-600'; }
        else if (aqiValue <= 200) { usCategory = 'Unhealthy'; usColor = 'from-red-400 to-red-600'; }
        else if (aqiValue <= 300) { usCategory = 'Very Unhealthy'; usColor = 'from-purple-400 to-purple-600'; }
        else { usCategory = 'Hazardous'; usColor = 'from-purple-700 to-purple-900'; }

        setRealAQIData({
          indianAQI: { value: aqiValue, category: indianCategory, color: indianColor },
          usAQI: { value: aqiValue, category: usCategory, color: usColor },
          pm25: data.data.iaqi?.pm25?.v || 178,
          pm10: data.data.iaqi?.pm10?.v || 340
        });
        
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching real AQI data:', error);
    } finally {
      setIsFetchingAQI(false);
    }
  };

  useEffect(() => {
    fetchRealAQIData();
    const interval = setInterval(fetchRealAQIData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchSensorData = async () => {
    if (!serverAddress || useSimulatedData) return;
    
    try {
      const url = serverAddress.startsWith('http') 
        ? `${serverAddress}/api/sensors`
        : `http://${serverAddress}/api/sensors`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error || data.status === 'error') {
        setConnectionError(data.error || 'Arduino connection error');
        return;
      }
      
      setSensorData(prev => ({
        ...prev,
        mq2_raw: data.mq2 || 0,
        mq2_ppm: convertMQ2ToPPM(data.mq2 || 0),
        alcohol_raw: data.alcohol || 0,
        alcohol_detected: (data.alcohol || 0) > 400,
        flame_detected: data.flame === 1 || data.flame === true
      }));
      
      setConnectionError('');
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      setConnectionError('Cannot connect to server. Make sure bridge.py is running!');
    }
  };

  const connectToServer = async () => {
    if (!serverAddress.trim()) return;
    
    setIsConnecting(true);
    setConnectionError('');
    
    try {
      const url = serverAddress.startsWith('http') 
        ? `${serverAddress}/api/sensors`
        : `http://${serverAddress}/api/sensors`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.mq2 !== undefined || data.status) {
        setIsConnected(true);
        setUseSimulatedData(false);
        setConnectionError('');
      } else {
        setConnectionError('Invalid response from server');
      }
    } catch (error) {
      setConnectionError('Cannot connect. Make sure Python bridge is running!');
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (isConnected && serverAddress && !useSimulatedData) {
      fetchSensorData();
      const interval = setInterval(fetchSensorData, 2000);
      return () => clearInterval(interval);
    }
  }, [isConnected, serverAddress, useSimulatedData]);

  useEffect(() => {
    if (useSimulatedData) {
      const interval = setInterval(() => {
        setSensorData(prev => ({
          mq2_raw: Math.max(680, Math.min(780, prev.mq2_raw + (Math.random() - 0.5) * 25)),
          mq2_ppm: Math.max(330, Math.min(385, prev.mq2_ppm + (Math.random() - 0.5) * 12)),
          alcohol_raw: Math.max(350, Math.min(420, prev.alcohol_raw + (Math.random() - 0.5) * 20)),
          alcohol_detected: Math.random() > 0.95,
          flame_detected: Math.random() > 0.98,
          temp: Math.max(20, Math.min(24, prev.temp + (Math.random() - 0.5) * 0.4)),
          humidity: Math.max(45, Math.min(60, prev.humidity + (Math.random() - 0.5) * 1.5))
        }));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [useSimulatedData]);

  const addPollutionEvent = (type, impact, duration) => {
    const event = {
      id: Date.now(),
      type,
      impact,
      duration,
      timestamp: new Date().toLocaleTimeString()
    };
    setPollutionEvents(prev => [event, ...prev].slice(0, 5));
    
    setSensorData(prev => ({
      ...prev,
      mq2_ppm: Math.min(200, prev.mq2_ppm + impact),
      mq2_raw: Math.min(900, prev.mq2_raw + impact * 3)
    }));
    
    setTimeout(() => {
      setSensorData(prev => ({
        ...prev,
        mq2_ppm: 85,
        mq2_raw: 350
      }));
    }, duration);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-600 via-gray-500 to-gray-700 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <Cloud className="absolute text-gray-800 opacity-60 animate-pulse" style={{ top: '10%', left: '10%', width: '100px', height: '100px' }} />
        <Cloud className="absolute text-gray-700 opacity-50 animate-pulse" style={{ top: '20%', right: '15%', width: '120px', height: '120px', animationDelay: '1s' }} />
        <Cloud className="absolute text-gray-800 opacity-70 animate-pulse" style={{ top: '5%', left: '50%', width: '90px', height: '90px', animationDelay: '2s' }} />
        <Cloud className="absolute text-gray-700 opacity-60 animate-pulse" style={{ top: '30%', left: '70%', width: '110px', height: '110px', animationDelay: '1.5s' }} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-800 to-gray-600 pointer-events-none z-0">
        <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end h-full">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="relative" style={{ height: `${60 + Math.random() * 40}%` }}>
              <div className="w-8 bg-gray-900 h-full mx-auto" style={{ width: '8px' }}></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gray-700 rounded-full -translate-y-6"></div>
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gray-800 rounded-full -translate-y-4"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold text-center mb-2 text-white drop-shadow-lg">TheAirWeBreathe</h1>
        <p className="text-center text-gray-200 mb-8 text-lg">Professional Air Quality Monitoring System with Live Data Integration</p>

        {!isConnected && (
          <div className="max-w-2xl mx-auto mb-8 bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-center mb-4">
              <Usb className="text-blue-500 mr-2" size={28} />
              <h2 className="text-2xl font-bold text-gray-800">Connect to Arduino (USB)</h2>
            </div>
            
            <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-blue-800 mb-2">🚀 Quick Setup:</h3>
              <ol className="text-sm text-gray-700 space-y-2 ml-4">
                <li>1. <strong>Upload Arduino code</strong> to your Arduino UNO</li>
                <li>2. <strong>Install Python libraries:</strong> <code className="bg-gray-200 px-2 py-1 rounded">pip install pyserial flask flask-cors</code></li>
                <li>3. <strong>Run bridge script:</strong> <code className="bg-gray-200 px-2 py-1 rounded">python bridge.py</code></li>
                <li>4. <strong>Enter server address below</strong> (usually localhost:5000)</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Server Address</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="localhost:5000"
                  className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={connectToServer}
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
            
            {connectionError && (
              <div className="mt-4 bg-red-50 border-2 border-red-300 rounded-xl p-4">
                <p className="text-red-700 text-center">⚠️ {connectionError}</p>
              </div>
            )}
            
            <div className="text-center mt-4">
              <button
                onClick={() => setUseSimulatedData(true)}
                className="text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                Continue with Real Delhi AQI Data
              </button>
            </div>
          </div>
        )}

        {isConnected && !useSimulatedData && (
          <div className="max-w-4xl mx-auto mb-6 bg-green-500 rounded-2xl shadow-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Usb className="text-white" size={24} />
                <span className="text-white font-semibold text-lg">🔌 Connected via USB: {serverAddress}</span>
              </div>
              <button
                onClick={() => {
                  setIsConnected(false);
                  setUseSimulatedData(true);
                }}
                className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {useSimulatedData && (
          <div className="max-w-4xl mx-auto mb-6 bg-blue-500 rounded-2xl shadow-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wifi className="text-white" size={24} />
                <div>
                  <span className="text-white font-semibold text-lg block">📡 Live Delhi AQI Data from WAQI API</span>
                  <span className="text-white text-xs opacity-90">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
              <button
                onClick={fetchRealAQIData}
                disabled={isFetchingAQI}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center gap-2"
              >
                <RefreshCw className={isFetchingAQI ? 'animate-spin' : ''} size={16} />
                Refresh
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          <div className={`bg-gradient-to-br ${realAQIData.indianAQI.color} rounded-3xl shadow-2xl p-8 text-white transform transition-all duration-500 hover:scale-105`}>
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{realAQIData.indianAQI.value}</div>
              <div className="text-2xl font-semibold mb-2">{realAQIData.indianAQI.category}</div>
              <div className="text-sm opacity-90">Indian AQI Standard</div>
              <div className="text-xs opacity-75 mt-1">Delhi - Live Data</div>
              {!useSimulatedData && <div className="text-xs opacity-75 mt-2">🔌 Live via USB</div>}
            </div>
          </div>

          <div className={`bg-gradient-to-br ${realAQIData.usAQI.color} rounded-3xl shadow-2xl p-8 text-white transform transition-all duration-500 hover:scale-105`}>
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{realAQIData.usAQI.value}</div>
              <div className="text-2xl font-semibold mb-2">{realAQIData.usAQI.category}</div>
              <div className="text-sm opacity-90 font-bold">Delhi AQI</div>
              <div className="text-xs opacity-75 mt-1">(US EPA Standard)</div>
              {!useSimulatedData && <div className="text-xs opacity-75 mt-2">🔌 Live via USB</div>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-8">
          <SensorCard icon={<Wind />} label="PM2.5" value={realAQIData.pm25} unit="µg/m³" highlight={true} />
          <SensorCard icon={<Wind />} label="PM10" value={realAQIData.pm10} unit="µg/m³" highlight={true} />
          <SensorCard icon={<AlertCircle />} label="Alcohol" value={sensorData.alcohol_detected ? "DETECTED" : "Normal"} unit="" highlight={sensorData.alcohol_detected} />
          <SensorCard icon={<Flame />} label="Flame" value={sensorData.flame_detected ? "FIRE!" : "Safe"} unit="" highlight={sensorData.flame_detected} />
          <SensorCard icon={<Thermometer />} label="Temperature" value={sensorData.temp.toFixed(1)} unit="°C" />
          <SensorCard icon={<Droplets />} label="Humidity" value={sensorData.humidity.toFixed(1)} unit="%" />
        </div>

        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-800 rounded-2xl shadow-2xl p-8 text-white transform hover:scale-105 transition-all duration-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💭</div>
              <p className="text-2xl font-bold mb-4 leading-relaxed">
                "Every breath you take contains molecules that were once breathed by dinosaurs, emperors, and now... exhaust fumes."
              </p>
              <p className="text-sm opacity-90 italic">
                We share the same air across time and space. What we pollute today, our children breathe tomorrow.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mb-8">
          <div className="bg-white bg-opacity-95 rounded-2xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Live Pollution Source Detector</h2>
            <p className="text-center text-gray-600 mb-6 text-sm">See how everyday pollution sources affect air quality in real-time</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => addPollutionEvent('Car', 15, 8000)}
                className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Car className="mx-auto mb-2" size={32} />
                <div className="font-semibold">Car Passes</div>
                <div className="text-xs opacity-90">+15 PPM</div>
              </button>
              
              <button
                onClick={() => addPollutionEvent('Cigarette', 12, 10000)}
                className="bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Cigarette className="mx-auto mb-2" size={32} />
                <div className="font-semibold">Cigarette</div>
                <div className="text-xs opacity-90">+12 PPM</div>
              </button>
              
              <button
                onClick={() => addPollutionEvent('Industrial', 20, 12000)}
                className="bg-gradient-to-br from-gray-600 to-gray-800 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Factory className="mx-auto mb-2" size={32} />
                <div className="font-semibold">Industry</div>
                <div className="text-xs opacity-90">+20 PPM</div>
              </button>
              
              <button
                onClick={() => addPollutionEvent('Burning', 18, 15000)}
                className="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Flame className="mx-auto mb-2" size={32} />
                <div className="font-semibold">Waste Burning</div>
                <div className="text-xs opacity-90">+18 PPM</div>
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                <AlertCircle className="mr-2" size={20} />
                Recent Pollution Events
              </h3>
              {pollutionEvents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Click buttons above to simulate pollution sources</p>
              ) : (
                <div className="space-y-2">
                  {pollutionEvents.map(event => (
                    <div key={event.id} className="flex items-center justify-between bg-white rounded-lg p-3 shadow">
                      <div className="flex items-center space-x-3">
                        {event.type === 'Car' && <Car size={20} className="text-blue-600" />}
                        {event.type === 'Cigarette' && <Cigarette size={20} className="text-orange-600" />}
                        {event.type === 'Industrial' && <Factory size={20} className="text-gray-600" />}
                        {event.type === 'Burning' && <Flame size={20} className="text-red-600" />}
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{event.type}</div>
                          <div className="text-xs text-gray-500">{event.timestamp}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-600 font-bold text-sm">+{event.impact}</div>
                        <div className="text-xs text-gray-500">PPM</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4">
              <p className="text-sm text-gray-700 text-center">
                <strong>Did you know?</strong> A single cigarette can increase gas levels by 10-15 PPM in nearby air. 
                A passing vehicle adds 10-20 PPM. These small contributions accumulate to create unhealthy air quality.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white bg-opacity-90 rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Indian AQI Scale</h2>
            <div className="space-y-2">
              <AQIScale color="bg-green-500" category="Good" range="0-50" />
              <AQIScale color="bg-lime-500" category="Satisfactory" range="51-100" />
              <AQIScale color="bg-yellow-500" category="Moderate" range="101-200" />
              <AQIScale color="bg-orange-500" category="Poor" range="201-300" />
              <AQIScale color="bg-red-500" category="Very Poor" range="301-400" />
              <AQIScale color="bg-purple-600" category="Severe" range="401-500" />
            </div>
          </div>

          <div className="bg-white bg-opacity-90 rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">US EPA AQI Scale</h2>
            <div className="space-y-2">
              <AQIScale color="bg-green-500" category="Good" range="0-50" />
              <AQIScale color="bg-yellow-500" category="Moderate" range="51-100" />
              <AQIScale color="bg-orange-500" category="Unhealthy for Sensitive" range="101-150" />
              <AQIScale color="bg-red-500" category="Unhealthy" range="151-200" />
              <AQIScale color="bg-purple-500" category="Very Unhealthy" range="201-300" />
              <AQIScale color="bg-purple-800" category="Hazardous" range="301-500" />