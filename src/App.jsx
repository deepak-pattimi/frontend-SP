import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';
import { addDays, isPast, isSameDay } from 'date-fns';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('empAuth') === 'true');
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [tempEmployeeId, setTempEmployeeId] = useState('');
  const [newPasswordForm, setNewPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [currentEmployeeId, setCurrentEmployeeId] = useState(() => localStorage.getItem('empId') || '');
  const [loginForm, setLoginForm] = useState({ employeeId: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('leave');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [startDate, setStartDate] = useState(null);
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [reason, setReason] = useState('');
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem('empId') || '');
  const [approvedDates, setApprovedDates] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leaveType, setLeaveType] = useState('FULL_DAY');
  const [duration, setDuration] = useState('First Half');
  
  const [employeeDetails, setEmployeeDetails] = useState({ name: '', email: '' });
  const [profilePassForm, setProfilePassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showProfilePass, setShowProfilePass] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  
  const [myLeaves, setMyLeaves] = useState([]);
  
  const endDate = startDate ? addDays(startDate, numberOfDays - 1) : null;

  const formatDateRange = (leave) => {
    const start = new Date(leave.startDate).toLocaleDateString();
    const end = new Date(leave.endDate).toLocaleDateString();
    let dates = start === end ? start : `${start} to ${end}`;
    if (leave.leaveType === 'HALF_DAY') {
      dates += ` (Half Day - ${leave.duration})`;
    } else if (leave.leaveType === 'HOURLY') {
      dates += ` (Hourly - ${leave.duration} Hours)`;
    }
    return dates;
  };

  const fetchMyLeaves = () => {
    if (!employeeId) return;
    axios.get(`${import.meta.env.VITE_API_URL}/api/leaves/employee/${employeeId}?t=${Date.now()}`)
      .then(res => setMyLeaves(res.data))
      .catch(err => console.error("Could not fetch my leaves", err));
  };

  const fetchApprovedLeaves = () => {
    if (!employeeId) return;
    axios.get(`${import.meta.env.VITE_API_URL}/api/leaves?t=${Date.now()}`)
      .then(res => {
        const myApproved = res.data.filter(l => l.status === 'APPROVED' && l.employeeId === employeeId);
        const blockedDates = [];
        myApproved.forEach(leave => {
          if (leave.leaveType === 'FULL_DAY') {
            let current = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            while (current <= end) {
              blockedDates.push(new Date(current));
              current = addDays(current, 1);
            }
          }
        });
        setApprovedDates(blockedDates);
      })
      .catch(err => console.error("Could not fetch leaves", err));
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchApprovedLeaves();
    fetchMyLeaves();
    const interval = setInterval(() => {
      fetchApprovedLeaves();
      fetchMyLeaves();
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, employeeId]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'profile') {
      axios.get(`${import.meta.env.VITE_API_URL}/api/employees/${employeeId}`)
        .then(res => setEmployeeDetails(res.data))
        .catch(err => console.error('Error fetching profile', err));
    }
  }, [isAuthenticated, activeTab, employeeId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/employees/login`, loginForm);
      if (!res.data.hasChangedPassword) {
        setTempEmployeeId(res.data.employeeId);
        setNeedsPasswordChange(true);
      } else {
        setIsAuthenticated(true);
        setCurrentEmployeeId(res.data.employeeId);
        setEmployeeId(res.data.employeeId);
        localStorage.setItem('empAuth', 'true');
        localStorage.setItem('empId', res.data.employeeId);
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Invalid credentials');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (newPasswordForm.newPassword !== newPasswordForm.confirmPassword) {
      setLoginError("Passwords do not match");
      return;
    }
    if (newPasswordForm.newPassword.length < 6) {
      setLoginError("Password must be at least 6 characters");
      return;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/employees/change-password`, {
        employeeId: tempEmployeeId,
        newPassword: newPasswordForm.newPassword
      });
      setNeedsPasswordChange(false);
      setIsAuthenticated(true);
      setCurrentEmployeeId(tempEmployeeId);
      setEmployeeId(tempEmployeeId);
      localStorage.setItem('empAuth', 'true');
      localStorage.setItem('empId', tempEmployeeId);
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Failed to update password');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    
    if (profilePassForm.newPassword !== profilePassForm.confirmPassword) {
      setProfileMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (profilePassForm.newPassword.length < 6) {
      setProfileMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/employees/update-password`, {
        employeeId: employeeId,
        oldPassword: profilePassForm.oldPassword,
        newPassword: profilePassForm.newPassword
      });
      setProfileMsg({ type: 'success', text: 'Password updated successfully!' });
      setProfilePassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update password' });
    }
  };

  const isBlockedDate = (date) => {
    if (isPast(addDays(date, 1))) return true; 
    return approvedDates.some(blocked => isSameDay(blocked, date));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !employeeId || !reason.trim()) {
      setMessage('Please fill in all required fields.');
      return;
    }
    
    let current = new Date(startDate);
    const end = new Date(endDate);
    let hasOverlap = false;
    while (current <= end) {
      if (isBlockedDate(current)) {
        hasOverlap = true;
        break;
      }
      current = addDays(current, 1);
    }
    
    if (hasOverlap) {
      setMessage('Your selected range includes dates that are blocked or already approved. Please adjust the date or number of days.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/leaves`, {
        employeeId: employeeId,
        startDate,
        endDate: leaveType === 'FULL_DAY' ? endDate : startDate,
        leaveType,
        duration: leaveType === 'FULL_DAY' ? null : duration,
        reason
      });
      setMessage('Leave requested successfully! Admin will review it.');
      setStartDate(null);
      setNumberOfDays(1);
      setReason('');
      setLeaveType('FULL_DAY');
      fetchMyLeaves();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setMessage(err.response.data.error);
      } else {
        setMessage('Failed to submit leave.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated && !needsPasswordChange) {
    return (
      <div className="login-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <div className="glass-panel floating-animation" style={{ width: '400px', margin: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', background: 'rgba(255,255,255,0.8)', padding: '15px', borderRadius: '12px' }}>
            <img src="/logo.png" alt="Subhada Polymers" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ textAlign: 'center', color: '#0f172a', fontSize: '24px', marginBottom: '30px', fontWeight: '700' }}>
            Employee Portal Login
          </h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label>Employee ID Code</label>
              <input type="text" className="edit-input" required value={loginForm.employeeId} onChange={e => setLoginForm({...loginForm, employeeId: e.target.value})} placeholder="e.g. X7B9Q" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showLoginPassword ? "text" : "password"} className="edit-input" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="******" style={{ paddingRight: '40px' }} />
                <span 
                  onClick={() => setShowLoginPassword(!showLoginPassword)} 
                  style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7, fontSize: '18px' }}
                >
                  {showLoginPassword ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            {loginError && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{loginError}</div>}
            <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '16px', marginTop: '10px' }}>Login</button>
          </form>
        </div>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body, html, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; overflow-x: hidden; }
          .login-wrapper {
            background: radial-gradient(circle at 15% 50%, rgba(25, 118, 210, 0.4), transparent 50%),
                        radial-gradient(circle at 85% 30%, rgba(13, 71, 161, 0.4), transparent 50%),
                        linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            background-size: cover;
          }
          .glass-panel { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
          .floating-animation { animation: float 6s ease-in-out infinite; }
          @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
          .input-group label { display: block; margin-bottom: 8px; color: #e2e8f0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .edit-input { width: 100%; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(255,255,255,0.5); padding: 14px 16px; border-radius: 12px; color: #0f172a; outline: none; font-size: 15px; font-family: inherit; transition: all 0.3s; }
          .edit-input:focus { box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.4); border-color: #38bdf8; background: #ffffff; }
          .btn { border: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 12px; font-weight: 600; font-family: inherit; }
          .btn-primary { background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); color: white; box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.5); }
          .btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 15px 25px -5px rgba(2, 132, 199, 0.6); }
        `}</style>
      </div>
    );
  }

  if (needsPasswordChange) {
    return (
      <div className="login-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
        <div className="glass-panel floating-animation" style={{ width: '400px', margin: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', background: 'rgba(255,255,255,0.8)', padding: '15px', borderRadius: '12px' }}>
            <img src="/logo.png" alt="Subhada Polymers" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ textAlign: 'center', color: '#0f172a', fontSize: '24px', marginBottom: '10px', fontWeight: '700' }}>
            Action Required
          </h1>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginBottom: '30px' }}>
            You are logging in with a temporary PIN. For security, please create a new password.
          </p>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showNewPassword ? "text" : "password"} className="edit-input" required value={newPasswordForm.newPassword} onChange={e => setNewPasswordForm({...newPasswordForm, newPassword: e.target.value})} placeholder="******" style={{ paddingRight: '40px' }} />
                <span 
                  onClick={() => setShowNewPassword(!showNewPassword)} 
                  style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7, fontSize: '18px' }}
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </span>
              </div>
            </div>
            <div className="input-group">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showNewPassword ? "text" : "password"} className="edit-input" required value={newPasswordForm.confirmPassword} onChange={e => setNewPasswordForm({...newPasswordForm, confirmPassword: e.target.value})} placeholder="******" style={{ paddingRight: '40px' }} />
              </div>
            </div>
            {loginError && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{loginError}</div>}
            <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '16px', marginTop: '10px' }}>Set Password & Proceed</button>
          </form>
        </div>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body, html, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; overflow-x: hidden; }
          .login-wrapper {
            background: radial-gradient(circle at 15% 50%, rgba(25, 118, 210, 0.4), transparent 50%),
                        radial-gradient(circle at 85% 30%, rgba(13, 71, 161, 0.4), transparent 50%),
                        linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            background-size: cover;
          }
          .glass-panel { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 40px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
          .floating-animation { animation: float 6s ease-in-out infinite; }
          @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
          .input-group label { display: block; margin-bottom: 8px; color: #e2e8f0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .edit-input { width: 100%; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(255,255,255,0.5); padding: 14px 16px; border-radius: 12px; color: #0f172a; outline: none; font-size: 15px; font-family: inherit; transition: all 0.3s; }
          .edit-input:focus { box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.4); border-color: #38bdf8; background: #ffffff; }
          .btn { border: none; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 12px; font-weight: 600; font-family: inherit; }
          .btn-primary { background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); color: white; box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.5); }
          .btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 15px 25px -5px rgba(2, 132, 199, 0.6); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="crm-layout">
      {/* MOBILE MENU OVERLAY */}
      <div 
        className="mobile-menu-overlay" 
        style={{ display: isSidebarOpen ? 'block' : 'none' }}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* FLOATING SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="Subhada Polymers" style={{ width: '100%', maxHeight: '50px', objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('leave'); }} className={`nav-item ${activeTab === 'leave' ? 'active' : ''}`}>
            <span className="nav-icon">📅</span> Leave Portal
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('requests'); }} className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}>
            <span className="nav-icon">📋</span> My Requests
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('profile'); setIsSidebarOpen(false); }} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
            <span className="nav-icon">👤</span> My Profile
          </a>
          <div style={{ flex: 1 }}></div>
          <a href="/tracker-setup.exe" download className="nav-item" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', marginTop: '20px' }} onClick={() => setIsSidebarOpen(false)}>
            <span className="nav-icon">⬇️</span> Download Tracker App
          </a>
        </nav>
        <div className="sidebar-footer" style={{ flexDirection: 'column', gap: '15px' }}>
          <div className="admin-profile">
            <div className="admin-avatar">{employeeDetails.name ? employeeDetails.name[0].toUpperCase() : 'E'}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {employeeDetails.name || 'Employee'}
              </div>
              <div style={{ fontSize: '12px', color: '#e0f2fe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ID: {currentEmployeeId}
              </div>
            </div>
          </div>
          <button className="btn btn-neutral" style={{ width: '100%', padding: '8px', fontSize: '13px' }} onClick={() => {
            setIsAuthenticated(false);
            localStorage.removeItem('empAuth');
            localStorage.removeItem('empId');
          }}>Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-header glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-hamburger btn btn-neutral" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: '8px 12px' }}>
              ☰
            </button>
            <h1 className="page-title">
              {activeTab === 'profile' ? 'My Profile' : activeTab === 'requests' ? 'My Leave Requests' : 'Leave Request Portal'}
            </h1>
          </div>
          <div className="header-actions">
          </div>
        </header>

        <div className="dashboard-grid fade-in-up">
          
          {/* LEAVE PORTAL */}
          {activeTab === 'leave' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
                <h2 className="section-title">Request Time Off</h2>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="input-group">
                    <label>Employee ID Code</label>
                    <input type="text" className="edit-input" disabled value={currentEmployeeId} style={{ opacity: 0.5 }} />
                  </div>

                  <div className="input-group">
                    <label>Leave Type</label>
                    <select className="edit-input" value={leaveType} onChange={(e) => {
                      setLeaveType(e.target.value);
                      if (e.target.value !== 'FULL_DAY') setNumberOfDays(1);
                      if (e.target.value === 'HALF_DAY') setDuration('First Half (9:00 AM - 1:00 PM)');
                      if (e.target.value === 'HOURLY') setDuration('2');
                    }}>
                      <option value="FULL_DAY">Full Day(s)</option>
                      <option value="HALF_DAY">Half Day</option>
                      <option value="HOURLY">Hourly Permission</option>
                    </select>
                  </div>

                  {leaveType === 'HALF_DAY' && (
                    <div className="input-group">
                      <label>Which Half?</label>
                      <select className="edit-input" value={duration} onChange={(e) => setDuration(e.target.value)}>
                        <option value="First Half (9:00 AM - 1:00 PM)">First Half (9:00 AM - 1:00 PM)</option>
                        <option value="Second Half (2:00 PM - 6:00 PM)">Second Half (2:00 PM - 6:00 PM)</option>
                      </select>
                    </div>
                  )}

                  {leaveType === 'HOURLY' && (
                    <div className="input-group">
                      <label>Number of Hours</label>
                      <input type="number" min="1" max="8" className="edit-input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2" />
                    </div>
                  )}

                  {leaveType === 'FULL_DAY' && (
                    <div className="input-group">
                      <label>Number of Days</label>
                      <div className="counter-wrapper">
                        <button type="button" onClick={() => setNumberOfDays(p => (p > 1 ? p - 1 : 1))} className="counter-btn">-</button>
                        <span className="counter-display">{numberOfDays}</span>
                        <button type="button" onClick={() => setNumberOfDays(p => p + 1)} className="counter-btn">+</button>
                      </div>
                    </div>
                  )}

                  <div className="input-group">
                    <label>{numberOfDays === 1 ? 'Date' : 'Start Date'}</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      filterDate={(date) => !isBlockedDate(date)}
                      placeholderText="Select your date..."
                      className="edit-input"
                      required
                    />
                    {numberOfDays > 1 && startDate && (
                      <p className="end-date-text">
                        ➔ End Date will be: <span style={{ color: '#1976d2', fontWeight: 'bold' }}>{endDate.toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>

                  <div className="input-group">
                    <label>Reason for Leave</label>
                    <textarea required className="edit-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly explain your reason..." rows="3"></textarea>
                  </div>

                  <button type="submit" disabled={isLoading} className={`btn btn-primary ${isLoading ? 'loading' : ''}`} style={{ padding: '14px', fontSize: '16px' }}>
                    {isLoading ? 'Submitting Request...' : 'Submit Leave Request'}
                  </button>
                </form>
                
                {message && (
                  <div className={`message-box ${message.includes('success') ? 'success' : 'error'}`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE PORTAL */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
                <h2 className="section-title">My Information</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                  <div className="input-group">
                    <label>Full Name</label>
                    <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', color: '#0f172a' }}>
                      {employeeDetails.name || 'Loading...'}
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Email Address</label>
                    <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', color: '#0f172a' }}>
                      {employeeDetails.email || 'Loading...'}
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Employee ID Code</label>
                    <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', color: '#0f172a' }}>
                      {currentEmployeeId}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ width: '100%', maxWidth: '600px' }}>
                <h2 className="section-title">Change Password</h2>
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                  <div className="input-group">
                    <label>Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showProfilePass ? "text" : "password"} className="edit-input" required value={profilePassForm.oldPassword} onChange={e => setProfilePassForm({...profilePassForm, oldPassword: e.target.value})} placeholder="******" style={{ paddingRight: '40px' }} />
                      <span onClick={() => setShowProfilePass(!showProfilePass)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.7, fontSize: '18px' }}>
                        {showProfilePass ? '🙈' : '👁️'}
                      </span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showProfilePass ? "text" : "password"} className="edit-input" required value={profilePassForm.newPassword} onChange={e => setProfilePassForm({...profilePassForm, newPassword: e.target.value})} placeholder="******" style={{ paddingRight: '40px' }} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showProfilePass ? "text" : "password"} className="edit-input" required value={profilePassForm.confirmPassword} onChange={e => setProfilePassForm({...profilePassForm, confirmPassword: e.target.value})} placeholder="******" style={{ paddingRight: '40px' }} />
                    </div>
                  </div>
                  {profileMsg.text && (
                    <div className={`message-box ${profileMsg.type}`}>
                      {profileMsg.text}
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '16px', marginTop: '10px' }}>Update Password</button>
                </form>
              </div>
            </div>
          )}

          {/* MY REQUESTS PORTAL */}
          {activeTab === 'requests' && (
            <div className="glass-panel">
              <h2 className="section-title">Leave History</h2>
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Dates Requested</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>No leave requests found.</td>
                      </tr>
                    ) : (
                      myLeaves.map(leave => (
                        <tr key={leave.id} className="table-row">
                          <td style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{formatDateRange(leave)}</td>
                          <td style={{ maxWidth: '300px' }}>
                            <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#64748b', fontSize: '13px' }} title={leave.reason}>
                              {leave.reason}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge glow-${leave.status.toLowerCase()}`}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body, html, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; font-family: 'Inter', sans-serif; color: #0f172a; overflow: hidden; }
        
        /* Ultra-Premium Mesh Background */
        #root {
          background-color: #f1f5f9;
          background-image: 
            radial-gradient(at 0% 0%, rgba(224, 242, 254, 0.8) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(186, 230, 253, 0.8) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(240, 249, 255, 0.8) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(224, 242, 254, 0.8) 0px, transparent 50%);
          background-attachment: fixed;
        }

        .crm-layout { display: flex; height: 100vh; width: 100%; overflow: hidden; padding: 20px; gap: 20px; }

        /* Floating Sidebar Styles */
        .sidebar { 
          width: 280px; 
          background: linear-gradient(160deg, rgba(25, 118, 210, 0.9) 0%, rgba(13, 71, 161, 0.95) 100%); 
          display: flex; flex-direction: column; flex-shrink: 0; 
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(13, 71, 161, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          overflow: hidden;
        }
        .sidebar-brand { padding: 30px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.9); margin: 20px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .sidebar-nav { padding: 10px 20px; flex: 1; }
        .nav-item { display: flex; align-items: center; padding: 14px 18px; color: #e0f2fe; text-decoration: none; border-radius: 12px; margin-bottom: 8px; font-weight: 500; font-size: 15px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .nav-item:hover { background: rgba(255, 255, 255, 0.15); color: white; transform: translateX(5px); }
        .nav-item.active { background: rgba(255, 255, 255, 0.95); color: #0d47a1; font-weight: 600; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.2); transform: scale(1.02); }
        .nav-icon { margin-right: 14px; font-size: 18px; transition: transform 0.3s; }
        .nav-item:hover .nav-icon { transform: scale(1.2); }
        .sidebar-footer { padding: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0,0,0,0.1); }
        .admin-profile { display: flex; align-items: center; gap: 14px; }
        .admin-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ffffff, #e0f2fe); color: #0d47a1; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

        /* Main Content Styles */
        .main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; gap: 20px; border-radius: 24px; }
        
        .top-header { height: 80px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; border-radius: 20px !important; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
        .header-actions { display: flex; align-items: center; gap: 20px; }

        .dashboard-grid { overflow-y: auto; flex: 1; padding-bottom: 20px; padding-right: 5px; }
        .dashboard-grid::-webkit-scrollbar { width: 8px; }
        .dashboard-grid::-webkit-scrollbar-track { background: transparent; }
        .dashboard-grid::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; }
        
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* True Glass Panels */
        .glass-panel { 
          background: rgba(255, 255, 255, 0.6); 
          backdrop-filter: blur(24px); 
          -webkit-backdrop-filter: blur(24px); 
          border: 1px solid rgba(255, 255, 255, 0.8); 
          border-radius: 24px; 
          padding: 32px; 
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255,255,255,0.5); 
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-panel:hover {
          transform: translateY(-4px);
          box-shadow: 0 30px 50px -15px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255,255,255,0.6);
        }
        
        .section-title { margin-top: 0; color: #0f172a; font-weight: 700; font-size: 20px; margin-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 15px; letter-spacing: -0.5px; }
        
        .input-group label { display: block; margin-bottom: 8px; color: #475569; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .edit-input { width: 100%; background: rgba(255,255,255,0.8); border: 1px solid rgba(203, 213, 225, 0.8); padding: 12px 16px; border-radius: 10px; color: #0f172a; outline: none; font-size: 14px; font-family: inherit; font-weight: 500; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .edit-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2); background: #ffffff; transform: translateY(-1px); }
        textarea.edit-input { resize: vertical; min-height: 80px; }

        /* Counter Styles */
        .counter-wrapper { display: inline-flex; align-items: center; background: rgba(255,255,255,0.8); border: 1px solid rgba(203, 213, 225, 0.8); border-radius: 10px; overflow: hidden; transition: all 0.3s; }
        .counter-btn { background: transparent; border: none; border-right: 1px solid rgba(203, 213, 225, 0.8); color: #475569; padding: 10px 20px; font-size: 20px; cursor: pointer; transition: background 0.2s; }
        .counter-btn:last-child { border-left: 1px solid rgba(203, 213, 225, 0.8); border-right: none; }
        .counter-btn:hover { background: rgba(255,255,255,0.9); color: #0f172a; }
        .counter-display { font-size: 18px; font-weight: 600; width: 50px; text-align: center; color: #1976d2; }

        /* Date Picker Fixes */
        .react-datepicker-wrapper { display: block; width: 100%; }
        .end-date-text { font-size: 13px; color: #64748b; margin-top: 10px; background: rgba(241, 245, 249, 0.7); padding: 10px; border-radius: 8px; border-left: 3px solid #1976d2; }

        /* Vibrant Buttons */
        .btn { padding: 10px 18px; border: none; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-family: inherit; letter-spacing: 0.5px; }
        .btn-primary { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.3); }
        .btn-primary:hover:not(:disabled) { transform: translateY(-3px) scale(1.02); box-shadow: 0 15px 25px -5px rgba(34, 197, 94, 0.4); filter: brightness(1.1); }
        .btn-primary.loading { background: #94a3b8; cursor: not-allowed; box-shadow: none; transform: none; }
        
        .btn-neutral { background: rgba(255,255,255,0.8); color: #475569; border: 1px solid rgba(203, 213, 225, 0.8); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .btn-neutral:hover { background: #ffffff; color: #0f172a; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        /* Messages */
        .message-box { margin-top: 25px; padding: 15px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .message-box.success { background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #166534; border: 1px solid #86efac; }
        .message-box.error { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #b91c1c; border: 1px solid #fca5a5; }

        /* Tables */
        .table-container { overflow-x: auto; border-radius: 12px; }
        .premium-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; text-align: left; }
        .premium-table th { padding: 16px 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; }
        .premium-table td { padding: 16px 20px; vertical-align: middle; background: rgba(255,255,255,0.4); transition: background 0.2s; }
        .premium-table td:first-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
        .premium-table td:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
        .table-row:hover td { background: rgba(255,255,255,0.8); }
        
        .status-badge { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: inline-block; box-shadow: 0 4px 10px -2px rgba(0,0,0,0.1); }
        .glow-pending { background: linear-gradient(135deg, #fef08a, #facc15); color: #854d0e; }
        .glow-approved { background: linear-gradient(135deg, #bbf7d0, #4ade80); color: #14532d; }
        .glow-rejected { background: linear-gradient(135deg, #fecaca, #f87171); color: #7f1d1d; }

        .mobile-hamburger { display: none; }
        .mobile-menu-overlay { display: none; }

        @media (max-width: 768px) {
          .crm-layout { flex-direction: column; overflow-y: auto; padding-bottom: 0; }
          .mobile-hamburger { display: flex; font-size: 20px; }
          .mobile-menu-overlay { display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; }
          
          .sidebar { 
            position: fixed; top: 0; left: 0; bottom: 0; 
            width: 280px; height: 100vh; 
            border-radius: 0; border-right: 1px solid rgba(255,255,255,0.2); 
            flex-direction: column; padding: 20px; z-index: 1000; 
            align-items: stretch; justify-content: flex-start; 
            background: linear-gradient(160deg, rgba(25, 118, 210, 0.98) 0%, rgba(13, 71, 161, 0.98) 100%); 
            transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar-brand, .sidebar-footer { display: flex; }
          .sidebar-nav { flex-direction: column; flex-wrap: nowrap; justify-content: flex-start; overflow-y: auto; overflow-x: hidden; padding-bottom: 0; }
          .nav-item { flex-direction: row; justify-content: flex-start; padding: 12px 20px; font-size: 15px; margin-bottom: 10px; white-space: normal; }
          .nav-icon { margin-right: 12px; font-size: 20px; }
          
          .glass-panel { padding: 20px; }
          .premium-table th, .premium-table td { padding: 10px 12px; font-size: 12px; }
          
          .top-header { flex-direction: column !important; align-items: flex-start !important; height: auto !important; padding: 15px !important; gap: 10px !important; }
          .header-actions { width: 100%; justify-content: space-between; }
          .login-wrapper .glass-panel { width: 100% !important; max-width: 400px; margin: 15px !important; padding: 20px !important; }
          .page-title { font-size: 18px !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
