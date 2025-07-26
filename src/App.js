import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';

function calculateRunDuration(ftime, etime) {
  if (!ftime || !etime || ftime === '0000' || etime === '0000') return null;

  const fHours = parseInt(ftime.slice(0, 2), 10);
  const fMinutes = parseInt(ftime.slice(2), 10);
  const eHours = parseInt(etime.slice(0, 2), 10);
  const eMinutes = parseInt(etime.slice(2), 10);

  const fullDate = new Date();
  fullDate.setHours(fHours, fMinutes, 0, 0);

  const emptyDate = new Date();
  emptyDate.setHours(eHours, eMinutes, 0, 0);

  let diff = emptyDate - fullDate;
  if (diff < 0) diff += 24 * 60 * 60 * 1000;

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} hr ${minutes} min`;
}

function DeviceList({ devices, statusTimestamps }) {
  const deviceNames = [
    "Canteen",
    "Office",
    "Feed Mill",
    "Bathroom",
    "Boiler",
    "Hatchery 1",
    "Hatchery 2",
    "Bungalow",
  ];

  return (
    <div className="device-grid">
      {devices.map((status, index) => {
        const timestamp = statusTimestamps?.[index] || {};
        const duration = calculateRunDuration(timestamp.emptyRaw, timestamp.fullRaw);

        return (
          <div
            key={index}
            className={`device ${status === 0 ? 'full' : status === 1 ? 'empty' : 'error'}`}
          >
            <div className="device-name">
              {deviceNames[index] || `Device ${index + 1}`}: {status === 0 ? 'FULL' : status === 1 ? 'EMPTY' : 'ERROR'}
            </div>
            <div className="timestamp-row">
              <div className="timestamp-item">
                {timestamp.empty && <div>Empty Tank: {timestamp.empty}</div>}
              </div>
              <div className="timestamp-item">
                {timestamp.full && <div>Full Tank: {timestamp.full}</div>}
              </div>
              {duration && status === 0 && (
                <div className="duration-value">{duration}</div>
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
  // const [mtStatus, setMtStatus] = useState(0);
  const prevStatusesRef = useRef([]);

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr.length !== 4) return null;
    const hours = parseInt(timeStr.slice(0, 2), 10);
    const minutes = parseInt(timeStr.slice(2), 10);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('https://anupam-32ea7-default-rtdb.firebaseio.com/user/uid/1011.json')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((json) => {
        const rawDevices = json?.sdevice || [];

        const newStatuses = rawDevices.map((devObj) => {
          const [key] = Object.keys(devObj).filter(k => !['etime', 'ftime'].includes(k));
          return parseInt(devObj[key], 10);
        });

        const newTimestamps = rawDevices.map((devObj) => ({
          full: devObj.ftime !== "0000" ? formatTime(devObj.ftime) : null,
          empty: devObj.etime !== "0000" ? formatTime(devObj.etime) : null,
          fullRaw: devObj.ftime,
          emptyRaw: devObj.etime,
        }));

        prevStatusesRef.current = [...newStatuses];
        setData({ ...json, sdevice: newStatuses });
        setStatusTimestamps(newTimestamps);
        // setMtStatus(json?.mt_status ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setError('Failed to load data.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // const toggleMtStatus = () => {
  //   const newStatus = mtStatus === 0 ? 1 : 0;
  //   const newMotorSt = newStatus === 1 ? 'R' : 'S';

  //   fetch('https://anupam-32ea7-default-rtdb.firebaseio.com/user/uid/1011.json', {
  //     method: 'PATCH',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       mt_status: newStatus,
  //       motor_st: newMotorSt,
  //     }),
  //   })
  //     .then((res) => {
  //       if (!res.ok) throw new Error('Failed to update status');
  //       setMtStatus(newStatus);
  //       setData((prev) => ({
  //         ...prev,
  //         motor_st: newMotorSt,
  //       }));
  //     })
  //     .catch((err) => {
  //       console.error('Error updating motor status:', err);
  //       alert('Failed to update motor control.');
  //     });
  // };

  const totalDevices = data?.sdevice?.length || 0;
  const runningDevices = data?.sdevice?.filter((d) => d === 1).length || 0;
  const errorDevices = data?.sdevice?.filter((d) => d !== 0 && d !== 1).length || 0;
  const motorStatus = data?.motor_st === 'R' ? 'ON' : 'OFF';

  return (
        
    <div className="container">
      
        <button className="logout-button" onClick={() => signOut(auth)}>Logout</button>


      {error ? (
        <div className="card"><h2>{error}</h2></div>
      ) : loading ? (
        <div className="card"><h2>Loading...</h2></div>
      ) : !data ? (
        <div className="card"><h2>No data found</h2></div>
      ) : (
        <div className="card">
          <h2>TI INDUSTRY</h2>

          <button className="refresh-button" onClick={fetchData}>
            Refresh
          </button>
              
          <div className="device-stats">
            <div className="stat-card stat-total">
              <h4>Total Devices</h4>
              <p>{totalDevices}</p>
            </div>
            <div className="stat-row">
              <div className="stat-card stat-running">
                <h4>Running Devices</h4>
                <p>{runningDevices}</p>
              </div>
              <div className="stat-card stat-error">
                <h4>Error Devices</h4>
                <p>{errorDevices}</p>
              </div>
              <div className={`stat-card stat-motor ${motorStatus === 'ON' ? 'motor-on' : 'motor-off'}`}>
                <h4>Motor Status</h4>
                <p>{motorStatus}</p>
              </div>
            </div>
          </div>

          {}
          {/* <div className="center-wrapper">
            <div className="switch-container">
              <label className="switch">
                <input type="checkbox" checked={mtStatus === 1} onChange={toggleMtStatus} />
                <span className={`slider ${mtStatus === 1 ? 'on' : 'off'}`}></span>
              </label>
                <span className="switch-label">{mtStatus === 1 ? 'Motor ON' : 'Motor OFF'}</span>
            </div>
          </div> */}



          <DeviceList devices={data.sdevice ?? []} statusTimestamps={statusTimestamps} />
        </div>
      )}
    </div>
    
  );
}

export default App;
