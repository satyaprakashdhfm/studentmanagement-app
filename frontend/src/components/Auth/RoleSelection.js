import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    navigate(`/login/${role}`);
  };

  return (
    <div className="role-selection-container">
      <div className="role-selection-card">
        <h1>Student Management System</h1>
        <p className="subtitle">Select your role to continue</p>

        <div className="role-buttons">
          <div className="role-card admin-card" onClick={() => handleRoleSelect('admin')}>
            <div className="role-icon">👑</div>
            <h3>Administrator</h3>
            <p>Manage system settings, users, and oversee all operations</p>
            <button className="role-btn admin-btn">Login as Admin</button>
          </div>

          <div className="role-card teacher-card" onClick={() => handleRoleSelect('teacher')}>
            <div className="role-icon">👨‍🏫</div>
            <h3>Teacher</h3>
            <p>Manage classes, attendance, marks, and student progress</p>
            <button className="role-btn teacher-btn">Login as Teacher</button>
          </div>

          <div className="role-card student-card" onClick={() => handleRoleSelect('student')}>
            <div className="role-icon">🎓</div>
            <h3>Student</h3>
            <p>View your attendance, marks, fees, and academic progress</p>
            <button className="role-btn student-btn">Login as Student</button>
          </div>
        </div>

        <div className="demo-info">
          <h4>Demo Accounts</h4>
          <div className="demo-grid">
            <div className="demo-item">
              <strong>Admin:</strong><br />
              Email: admin@demo.com<br />
              Password: admin123
            </div>
            <div className="demo-item">
              <strong>Teacher:</strong><br />
              Email: teacher@demo.com<br />
              Password: teacher123
            </div>
            <div className="demo-item">
              <strong>Student:</strong><br />
              Email: student@demo.com<br />
              Password: student123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;