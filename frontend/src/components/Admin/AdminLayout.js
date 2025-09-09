import React, { useState, useEffect } from 'react';
import ThemeToggle from '../Common/ThemeToggle';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFeeDropdown, setShowFeeDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch classes for dropdowns
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const response = await apiService.getClasses();
        if (response.classes) {
          setClasses(response.classes);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  // Group classes by grade (e.g., "8th", "9th", "10th")
  const classGroups = classes.reduce((groups, cls) => {
    const grade = cls.className; // e.g., "8th"
    if (!groups[grade]) {
      groups[grade] = [];
    }
    groups[grade].push(cls);
    return groups;
  }, {});
  
  // Get unique grades sorted (e.g., ["8th", "9th", "10th"])
  const uniqueGrades = Object.keys(classGroups).sort();

  return (
    <div className="dashboard">
      <div className="sidebar">
        <h2>Admin Portal</h2>
        <nav>
          <ul className="sidebar-nav">
            {/* Fee Management with Dropdown */}
            <li>
              <div 
                className={`dropdown-header ${location.pathname.includes('/admin/fees') ? 'active' : ''}`}
                onClick={() => setShowFeeDropdown(!showFeeDropdown)}
              >
                <span style={{ marginRight: '10px' }}>💰</span>
                Fee Management
                <span style={{ marginLeft: '10px' }}>{showFeeDropdown ? '▲' : '▼'}</span>
              </div>
              {showFeeDropdown && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="/admin/fees" className={location.pathname === '/admin/fees' ? 'active' : ''}>
                      All Classes
                    </Link>
                  </li>
                  {uniqueGrades.map(grade => (
                    <li key={grade}>
                      <Link 
                        to={`/admin/fees/grade/${grade}`} 
                        className={location.pathname === `/admin/fees/grade/${grade}` ? 'active' : ''}
                      >
                        Grade {grade}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* Teacher Management without Dropdown */}
            <li>
              <Link 
                to="/admin/teachers"
                className={location.pathname === '/admin/teachers' ? 'active' : ''}
              >
                <span style={{ marginRight: '10px' }}>👩‍🏫</span>
                Teacher Management
              </Link>
            </li>

            {/* Student Management with Dropdown */}
            <li>
              <div 
                className={`dropdown-header ${location.pathname.includes('/admin/students') ? 'active' : ''}`}
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              >
                <span style={{ marginRight: '10px' }}>🎓</span>
                Student Management
                <span style={{ marginLeft: '10px' }}>{showStudentDropdown ? '▲' : '▼'}</span>
              </div>
              {showStudentDropdown && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="/admin/students" className={location.pathname === '/admin/students' ? 'active' : ''}>
                      All Students
                    </Link>
                  </li>
                  {uniqueGrades.map(grade => (
                    <li key={grade}>
                      <Link 
                        to={`/admin/students/grade/${grade}`} 
                        className={location.pathname === `/admin/students/grade/${grade}` ? 'active' : ''}
                      >
                        Grade {grade}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* System Configuration without Dropdown */}
            <li>
              <Link 
                to="/admin/system-config"
                className={location.pathname === '/admin/system-config' ? 'active' : ''}
              >
                <span style={{ marginRight: '10px' }}>⚙️</span>
                System Configuration
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h1>Admin Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="academic-year-filter">
              <label>Academic Year:</label>
              <select defaultValue="2025-2026">
                <option value="2023-2024">2023-2024</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>
            <div className="user-info">
              <span>Welcome, Admin</span>
              <ThemeToggle />
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

// Add CSS for the dropdown menu and other new components
const styles = `
  .dropdown-header {
    display: flex;
    align-items: center;
    color: white;
    text-decoration: none;
    padding: 15px 20px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .dropdown-header:hover,
  .dropdown-header.active {
    background-color: #34495e;
    border-left: 4px solid #3498db;
  }
  
  .dropdown-menu {
    list-style: none;
    background-color: #34495e;
    padding-left: 20px;
    margin-bottom: 10px;
  }
  
  .dropdown-menu a {
    padding: 10px 15px;
    font-size: 0.9em;
    border-left: none;
  }
  
  .dropdown-subheader {
    color: #95a5a6;
    font-size: 0.8em;
    padding: 5px 15px;
    border-bottom: 1px solid #3c536d;
    margin-top: 8px;
  }
  
  .header-left, .header-right {
    display: flex;
    align-items: center;
  }
  
  .header-right {
    display: flex;
    gap: 20px;
  }
  
  .academic-year-filter {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .academic-year-filter select {
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #bdc3c7;
  }
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default AdminLayout;
