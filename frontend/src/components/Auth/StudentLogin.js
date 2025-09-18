import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import './Login.css';

const StudentLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  useEffect(() => {
    document.title = 'Student Login - Student Management System';

    // If user is already authenticated and is student, redirect to dashboard
    if (isAuthenticated && user && user.role === 'student') {
      navigate('/student/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
        role: 'student'
      });

      if (result.success) {
        navigate('/student/dashboard');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="role-icon">🎓</div>
          <h2>Student Login</h2>
          <p>Access your student dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your student ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn student-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Student'}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/login/admin')}
          >
            Login as Admin
          </button>
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/login/teacher')}
          >
            Login as Teacher
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;