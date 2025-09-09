import React, { useState, useEffect } from 'react';
import ThemeToggle from '../Common/ThemeToggle';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import { useAcademicYear } from '../../context/AcademicYearContext';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFeeDropdown, setShowFeeDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  
  // Use the academic year context
  const { 
    selectedAcademicYear, 
    setSelectedAcademicYear, 
    classes, 
    setClasses, 
    loading, 
    setLoading 
  } = useAcademicYear();

  // Fetch classes for dropdowns
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const response = await apiService.getClasses();
        if (response.classes) {
          // Filter classes by selected academic year
          const filteredClasses = response.classes.filter(
            cls => cls.academicYear === selectedAcademicYear
          );
          setClasses(filteredClasses);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [selectedAcademicYear]); // Re-fetch when academic year changes

  const handleStudentDropdownToggle = () => {
    setShowStudentDropdown(!showStudentDropdown);
    // Close fee dropdown when student dropdown is opened
    if (!showStudentDropdown) {
      setShowFeeDropdown(false);
    }
  };

  const handleFeeDropdownToggle = () => {
    setShowFeeDropdown(!showFeeDropdown);
    // Close student dropdown when fee dropdown is opened
    if (!showFeeDropdown) {
      setShowStudentDropdown(false);
    }
  };

  // Close all dropdowns when clicking on Teacher Management or System Configuration
  const handleSingleNavClick = () => {
    setShowStudentDropdown(false);
    setShowFeeDropdown(false);
  };

  const handleAcademicYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedAcademicYear(newYear);
    console.log('Academic year changed to:', newYear);
    
    // Close dropdowns when academic year changes
    setShowFeeDropdown(false);
    setShowStudentDropdown(false);
  };

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
        
        {/* Academic Year Filter in Sidebar */}
        <div className="sidebar-academic-year">
          <label>Academic Year:</label>
          <select 
            value={selectedAcademicYear} 
            onChange={handleAcademicYearChange}
            disabled={loading}
          >
            <option value="2023-2024">2023-2024</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
          {loading && (
            <div className="loading-indicator">
              <small>Loading classes...</small>
            </div>
          )}
        </div>

        <nav>
          <ul className="sidebar-nav">
            {/* Teacher Management without Dropdown */}
            <li>
              <Link 
                to="/admin/teachers"
                className={location.pathname === '/admin/teachers' ? 'active' : ''}
                onClick={handleSingleNavClick}
              >
                <span style={{ marginRight: '10px' }}>👩‍🏫</span>
                Teacher Management
              </Link>
            </li>

            {/* Student Management with Dropdown */}
            <li>
              <div 
                className={`dropdown-header ${location.pathname.includes('/admin/students') ? 'active' : ''}`}
                onClick={handleStudentDropdownToggle}
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

            {/* Fee Management with Dropdown */}
            <li>
              <div 
                className={`dropdown-header ${location.pathname.includes('/admin/fees') ? 'active' : ''}`}
                onClick={handleFeeDropdownToggle}
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

            {/* System Configuration without Dropdown */}
            <li>
              <Link 
                to="/admin/system-config"
                className={location.pathname === '/admin/system-config' ? 'active' : ''}
                onClick={handleSingleNavClick}
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
            <div className="user-info">
              <span>Welcome, Admin</span>
              <ThemeToggle />
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
        {/* Pass academic year context to children */}
        <div className="academic-year-context" data-academic-year={selectedAcademicYear}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Add CSS for the dropdown menu and sidebar academic year filter
const styles = `
  .sidebar-academic-year {
    background-color: #34495e;
    padding: 15px 20px;
    border-bottom: 1px solid #2c3e50;
    margin-bottom: 10px;
  }
  
  .sidebar-academic-year label {
    color: #ecf0f1;
    font-size: 0.9em;
    margin-bottom: 8px;
    display: block;
  }
  
  .sidebar-academic-year select {
    width: 100%;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid #bdc3c7;
    background-color: #ecf0f1;
    color: #2c3e50;
    font-size: 0.9em;
  }
  
  .sidebar-academic-year select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .loading-indicator {
    margin-top: 5px;
  }
  
  .loading-indicator small {
    color: #95a5a6;
    font-style: italic;
  }
  
  .academic-year-context {
    height: 100%;
  }
  
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
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default AdminLayout;
