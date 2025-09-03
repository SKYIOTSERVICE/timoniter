import React, { useEffect, useState, useCallback } from 'react';
import './App.css';

// Utility: Format full date and time
function formatFullDateTime(timeInput) {
  if (!timeInput) return 'N/A';
  const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
  if (!(date instanceof Date) || isNaN(date)) return 'N/A';
  if (typeof timeInput === 'string' && timeInput.startsWith('0000')) return 'N/A';

  return date.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}



// Device display
function DeviceList({ devices, statusTimestamps }) {
  const names = [
    "Canteen", "Office", "Feed Mill", "Bathroom", "Boiler",
    "Hatchery 1", "Hatchery 2", "Bungalow"
  ];

  return (
    <div className="device-grid">
      {devices.map((status, i) => {
        const t = statusTimestamps[i] || {};
        return (
          <div
            key={i}
            className={`device ${
              status === 0 ? 'full' :
              status === 1 ? 'empty' : 'error'
            }`}
          >
            <div className="device-name">
              {names[i] || `Device ${i + 1}`}: {status === 0 ? 'FULL' : status === 1 ? 'EMPTY' : 'ERROR'}
            </div>
            <div className="timestamp-row">
              {t.emptyRaw && !t.emptyRaw.startsWith('0000') && (
                <div className="timestamp-item">Empty Tank: {formatFullDateTime(t.emptyRaw)}</div>
              )}
              {t.fullRaw && !t.fullRaw.startsWith('0000') && (
                <div className="timestamp-item">Full Tank: {formatFullDateTime(t.fullRaw)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusTimestamps, setStatusTimestamps] = useState([]);
  const [powerToggle, setPowerToggle] = useState('0');
  const [wifiToggle, setWifiToggle] = useState('0');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());


  const [motorOnTime, setMotorOnTime] = useState(null);
  const [motorOffTime, setMotorOffTime] = useState(null);

  const [autoRefresh, setAutoRefresh] = useState(false);

  function loadTimeFromStorage(key) {
    const stored = localStorage.getItem(key);
    const d = new Date(stored);
    return isNaN(d) ? null : d;
  }

  function saveTimeToStorage(key, date) {
    if (!(date instanceof Date)) return;
    localStorage.setItem(key, date.toISOString());
  }

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch('https://tinodes1023.asia-southeast1.firebasedatabase.app/uid/motor.json')
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(json => {
        const rawDevices = json?.sdevice ?? [];
        const statuses = rawDevices.map(o => {
          const key = Object.keys(o).find(k => k !== 'etime' && k !== 'ftime');
          return parseInt(o[key], 10);
        });

        const ts = rawDevices.map(o => ({
          full: o.ftime && !o.ftime.startsWith('0000') ? o.ftime : null,
          empty: o.etime && !o.etime.startsWith('0000') ? o.etime : null,
          fullRaw: o.ftime,
          emptyRaw: o.etime,
        }));

        setData({ ...json, sdevice: statuses });
        setStatusTimestamps(ts);
        setPowerToggle(json?.power ?? '0');
        setWifiToggle(json?.wificonnect ?? '0');

        // Motor status handling
        const motorState = json?.motor_st;
        const savedMotorState = localStorage.getItem('lastMotorState');
        const now = new Date();

        if (motorState !== savedMotorState) {
          if (motorState === 'R') {
            setMotorOnTime(now);
            saveTimeToStorage('motorOnTime', now);
          } else {
            setMotorOffTime(now);
            saveTimeToStorage('motorOffTime', now);
          }
          localStorage.setItem('lastMotorState', motorState);
        } else {
          const onTime = loadTimeFromStorage('motorOnTime');
          const offTime = loadTimeFromStorage('motorOffTime');
          if (onTime) setMotorOnTime(onTime);
          if (offTime) setMotorOffTime(offTime);
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load data.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  useEffect(() => {
    const savedPowerState = localStorage.getItem('lastPowerState');



    const now = new Date();
    if (savedPowerState !== null && savedPowerState !== powerToggle) {
      if (powerToggle === '1') {
        
        saveTimeToStorage('powerOnTime', now);
      } else {
     
        saveTimeToStorage('powerOffTime', now);
      }
      localStorage.setItem('lastPowerState', powerToggle);
    } else if (savedPowerState === null) {
      localStorage.setItem('lastPowerState', powerToggle);
      if (powerToggle === '1') {

        saveTimeToStorage('powerOnTime', now);
      } else {
      
        saveTimeToStorage('powerOffTime', now);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const savedPowerState = localStorage.getItem('lastPowerState');
    if (savedPowerState === powerToggle) return;

    const now = new Date();
    if (powerToggle === '1') {
     
      saveTimeToStorage('powerOnTime', now);
    } else {
    
      saveTimeToStorage('powerOffTime', now);
    }
    localStorage.setItem('lastPowerState', powerToggle);
  }, [powerToggle]);

  useEffect(() => {
    if (wifiToggle === '1') {
      const timer = setTimeout(() => {
        setWifiToggle('0');
        fetch('https://tinodes1023.asia-southeast1.firebasedatabase.app/uid/motor.json', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wificonnect: '0' }),
        }).catch(err => console.error('Wi-Fi reset failed:', err));
      }, 300000);

      return () => clearTimeout(timer);
    }
  }, [wifiToggle]);

  useEffect(() => {
    if (powerToggle === '1') {
      const timer = setTimeout(() => {
        setPowerToggle('0');
        const now = new Date();
        
        localStorage.setItem('lastPowerState', '0');
        saveTimeToStorage('powerOffTime', now);
        fetch('https://tinodes1023.asia-southeast1.firebasedatabase.app/uid/motor.json', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ power: '0' }),
        }).catch(err => console.error('Power reset failed:', err));
      }, 300000);

      return () => clearTimeout(timer);
    }
  }, [powerToggle]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const total = data?.sdevice?.length ?? 0;
  const running = data?.sdevice?.filter(d => d === 1).length ?? 0;
  const errors = data?.sdevice?.filter(d => d !== 0 && d !== 1).length ?? 0;
  const motorOn = data?.motor_st === 'R' ? 'ON' : 'OFF';

  return (
    <div className="container">
      <div className="top-right-toggle">
        <label className="switch">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={() => setAutoRefresh(prev => !prev)}
          />
          <span className="slider round"></span>
        </label>
        <span className={`label-text ${autoRefresh ? 'online' : 'offline'}`}>
          🔁 Auto Refresh
        </span>
      </div>

      <div className="current-time">
        <strong>Current Date & Time: </strong>
        {formatFullDateTime(currentDateTime)}
      </div>

      <div className="status-indicators">
        <div className="status-toggle">
          <label className="switch">
            <input type="checkbox" checked={powerToggle === '1'} readOnly />
            <span className="slider round"></span>
          </label>
          <span className={`label-text ${powerToggle === '1' ? 'online' : 'offline'}`}>⚡ Power</span>

        </div>

        <div className="status-toggle">
          <label className="switch">
            <input type="checkbox" checked={wifiToggle === '1'} readOnly />
            <span className="slider round"></span>
          </label>
          <span className={`label-text ${wifiToggle === '1' ? 'online' : 'offline'}`}>📶 Wi‑Fi</span>
        </div>
      </div>

      <h1 className="title">SKYIOT SERVICE</h1>

      {error ? (
        <div className="card"><h2>{error}</h2></div>
      ) : loading ? (
        <div className="card"><h2>Loading...</h2></div>
      ) : !data ? (
        <div className="card"><h2>No data found</h2></div>
      ) : (
        <div className="card">
          <h2>TI INDUSTRY</h2>
          <button className="refresh-button" onClick={fetchData}>Refresh</button>

          <div className="device-stats">
            <div className="stat-card stat-total">
              <h4>Total Devices</h4>
              <p>{total}</p>
            </div>
            <div className="stat-card stat-running">
              <h4>Devices Running</h4>
              <p>{running}</p>
            </div>
            <div className="stat-card stat-error">
              <h4>Error Devices</h4>
              <p>{errors}</p>
            </div>

            <div className={`stat-card stat-motor ${motorOn === 'ON' ? 'motor-on' : 'motor-off'}`}>
              <h4>Motor Status</h4>
              <p>{motorOn}</p>

              {motorOn === 'ON' && motorOnTime && (
                <>
                 
                  
                </>
              )}
              {motorOn === 'OFF' && motorOffTime && (
                <>
                  <div>Motor Turned Off at: {formatFullDateTime(motorOffTime)}</div>
                 
                </>
              )}
            </div>
          </div>

          <DeviceList devices={data.sdevice} statusTimestamps={statusTimestamps} />
        </div>
      )}
    </div>
  );
}

export default App;
