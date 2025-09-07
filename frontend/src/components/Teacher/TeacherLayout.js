import React from 'react';
import ThemeToggle from '../Common/ThemeToggle';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const TeacherLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const sidebarItems = [
    { path: '/teacher/profile', label: 'Teacher Profile', icon: '👤' },
    { path: '/teacher/attendance', label: 'Attendance Management', icon: '📅' },
    { path: '/teacher/fees', label: 'Fee Inquiry', icon: '💰' },
    { path: '/teacher/marks', label: 'Marks Management', icon: '📝' },
    { path: '/teacher/syllabus', label: 'Syllabus Management', icon: '📚' }
  ];

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2>Teacher Portal</h2>
        <nav>
          <ul className="sidebar-nav">
            {sidebarItems.map(item => (
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
          <h1>Teacher Dashboard</h1>
          <div className="user-info" style={{ gap: '10px' }}>
            <span>Welcome, Teacher</span>
            <ThemeToggle />
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default TeacherLayout;
