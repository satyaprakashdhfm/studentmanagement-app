import React from 'react';
import ThemeToggle from '../Common/ThemeToggle';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const StudentLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const sidebarItems = [
    { path: '/student/personal-details', label: 'Personal Details', icon: '👤' },
    { path: '/student/attendance', label: 'Attendance Tracker', icon: '📅' },
    { path: '/student/fees', label: 'Fee History', icon: '💰' },
    { path: '/student/performance', label: 'Academic Performance', icon: '📊' },
    { path: '/student/syllabus', label: 'Syllabus Progress', icon: '📚' }
  ];

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2>Student Portal</h2>
        <nav>
          <ul className="sidebar-nav">
            {sidebarItems.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                >
                  <span style={{ marginRight: '10px' }}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      
      <div className="main-content">
        <div className="header">
          <h1>Student Dashboard</h1>
          <div className="user-info" style={{ gap: '10px' }}>
            <span>Welcome, Student</span>
            <ThemeToggle />
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default StudentLayout;
