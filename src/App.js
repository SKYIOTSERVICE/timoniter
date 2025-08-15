import React, { useEffect, useState, useCallback } from 'react';
import './App.css';

function formatFullDateTime(timeInput) {
  if (!timeInput) return null;
  if (typeof timeInput === 'string' && timeInput.startsWith('0000')) return null;

  const d = new Date(timeInput);
  if (isNaN(d)) return null;

  return d.toLocaleString(undefined, {
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

function formatDuration(startTime, currentTime) {
  if (!startTime) return null;
  const diff = Math.floor((currentTime - new Date(startTime)) / 1000);
  const hrs = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;
  return `${hrs}h ${mins}m ${secs}s`;
}

function DeviceList({ devices, statusTimestamps }) {
  const names = [
    "Canteen", "Office", "Feed Mill", "Bathroom", "Boiler",
    "Hatchery 1", "Hatchery 2", "Bungalow"
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
              {t.empty && <div className="timestamp-item">Empty Tank: {formatFullDateTime(t.emptyRaw)}</div>}
              {t.full && <div className="timestamp-item">Full Tank: {formatFullDateTime(t.fullRaw)}</div>}
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

  const [powerOnTime, setPowerOnTime] = useState(null);
  const [powerOffTime, setPowerOffTime] = useState(null);
  const [motorOnTime, setMotorOnTime] = useState(null);
  const [motorOffTime, setMotorOffTime] = useState(null);

  const [autoRefresh, setAutoRefresh] = useState(false); 

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch('https://tinodes1023.asia-southeast1.firebasedatabase.app/uid/motor.json')
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(json => {
        const raw = json?.sdevice ?? [];
        const statuses = raw.map(o => {
          const [k] = Object.keys(o).filter(k => k !== 'etime' && k !== 'ftime');
          return parseInt(o[k], 10);
        });

        const ts = raw.map(o => ({
          full: o.ftime && !o.ftime.startsWith('0000') ? o.ftime : null,
          empty: o.etime && !o.etime.startsWith('0000') ? o.etime : null,
          fullRaw: o.ftime,
          emptyRaw: o.etime,
        }));

        setData({ ...json, sdevice: statuses });
        setStatusTimestamps(ts);

        const powerVal = json?.power ?? '0';
        const wifiVal = json?.wificonnect ?? '0';
        setPowerToggle(powerVal);
        setWifiToggle(wifiVal);

        const motorState = json?.motor_st;
        const savedMotorState = localStorage.getItem('lastMotorState');

        if (savedMotorState !== motorState) {
          const now = new Date();
          if (motorState === 'R') {
            setMotorOnTime(now);
            localStorage.setItem('motorOnTime', now);
          } else {
            setMotorOffTime(now);
            localStorage.setItem('motorOffTime', now);
          }
          localStorage.setItem('lastMotorState', motorState);
        } else {
          const onTime = localStorage.getItem('motorOnTime');
          const offTime = localStorage.getItem('motorOffTime');
          if (onTime) setMotorOnTime(new Date(onTime));
          if (offTime) setMotorOffTime(new Date(offTime));
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
    const savedPowerOnTime = localStorage.getItem('powerOnTime');
    const savedPowerOffTime = localStorage.getItem('powerOffTime');

    if (savedPowerOnTime) setPowerOnTime(new Date(savedPowerOnTime));
    if (savedPowerOffTime) setPowerOffTime(new Date(savedPowerOffTime));

    if (savedPowerState !== null && savedPowerState !== powerToggle) {
      const now = new Date();
      if (powerToggle === '1') {
        setPowerOnTime(now);
        localStorage.setItem('powerOnTime', now);
      } else {
        setPowerOffTime(now);
        localStorage.setItem('powerOffTime', now);
      }
      localStorage.setItem('lastPowerState', powerToggle);
    } else if (savedPowerState === null) {
      const now = new Date();
      localStorage.setItem('lastPowerState', powerToggle);
      if (powerToggle === '1') {
        setPowerOnTime(now);
        localStorage.setItem('powerOnTime', now);
      } else {
        setPowerOffTime(now);
        localStorage.setItem('powerOffTime', now);
      }
    }
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
        setPowerOffTime(now);
        localStorage.setItem('lastPowerState', '0');
        localStorage.setItem('powerOffTime', now);
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
      {}
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
        {currentDateTime.toLocaleString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })}
      </div>

      <div className="status-indicators">
        <div className="status-toggle">
          <label className="switch">
            <input type="checkbox" checked={powerToggle === '1'} readOnly />
            <span className="slider round"></span>
          </label>
          <span className={`label-text ${powerToggle === '1' ? 'online' : 'offline'}`}>⚡ Power</span>
          <div className="timestamp-info">
            {powerOnTime && <div>Power On: {formatFullDateTime(powerOnTime)}</div>}
            {powerOffTime && <div>Power Off: {formatFullDateTime(powerOffTime)}</div>}
          </div>
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
              <h4>Total Devices</h4><p>{total}</p>
            </div>
            <div className="stat-row">
              <div className="stat-card stat-running">
                <h4>Running Devices</h4><p>{running}</p>
              </div>
              <div className="stat-card stat-error">
                <h4>Error Devices</h4><p>{errors}</p>
              </div>
              <div className={`stat-card stat-motor ${motorOn === 'ON' ? 'motor-on' : 'motor-off'}`}>
                <h4>Motor Status</h4>
                <p>{motorOn}</p>
                {motorOn === 'ON' && motorOnTime && (
                  <>
                    <div>Motor Turned On: {formatFullDateTime(motorOnTime)}</div>
                    <div>Running for: {formatDuration(motorOnTime, currentDateTime)}</div>
                  </>
                )}
                {motorOn !== 'ON' && motorOffTime && (
                  <>
                    <div>Motor Turned Off: {formatFullDateTime(motorOffTime)}</div>
                    <div>Off since: {formatDuration(motorOffTime, currentDateTime)}</div>
                  </>
                )}
              </div>
            </div>
          </div>
          <DeviceList devices={data.sdevice} statusTimestamps={statusTimestamps} />
        </div>
      )}
    </div>
  );
}

export default App;
