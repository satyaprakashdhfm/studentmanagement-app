import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import './Login.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  useEffect(() => {
    document.title = 'Admin Login - Student Management System';

    // If user is already authenticated and is admin, redirect to dashboard
    if (isAuthenticated && user && user.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
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

    console.log('🔐 Admin login attempt:', formData.username);

    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
        role: 'admin'
      });
      
      console.log('🔐 Admin login result:', result);

      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      console.error('🔐 Admin login error:', err);
      setError(`Network error: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="role-icon">👑</div>
          <h2>Administrator Login</h2>
          <p>Access the admin dashboard</p>
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
              placeholder="admin"
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

          <button type="submit" className="login-btn admin-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Administrator'}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/login/teacher')}
          >
            Login as Teacher
          </button>
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/login/student')}
          >
            Login as Student
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;