import React from 'react';
import ThemeToggle from '../Common/ThemeToggle';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const sidebarItems = [
    { path: '/admin/fees', label: 'Fee Management', icon: '💰' },
    { path: '/admin/teachers', label: 'Teacher Management', icon: '👩‍🏫' },
    { path: '/admin/students', label: 'Student Management', icon: '🎓' },
    { path: '/admin/system-config', label: 'System Configuration', icon: '⚙️' }
  ];

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2>Admin Portal</h2>
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
          <h1>Admin Dashboard</h1>
          <div className="user-info" style={{ gap: '10px' }}>
            <span>Welcome, Admin</span>
            <ThemeToggle />
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
