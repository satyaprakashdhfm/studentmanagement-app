import React, { useState, useEffect } from 'react';
import {
  User, Plus, Search, Edit2, Trash2, BookOpen, GraduationCap, Users, TrendingUp, 
  Eye, EyeOff, LogOut, X, Calendar, Mail, Phone, MapPin, Loader, AlertCircle, Hash
} from 'lucide-react';

import './App.css'; // Assuming you have a CSS file for styles

const API_URL = 'http://localhost:8080/api';

const StudentManagementApp = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [newStudent, setNewStudent] = useState({
    id: '', // Add ID field
    name: '',
    email: '',
    phoneNumber: '',
    age: '',
    course: '',
    enrolled: true
  });

  // Function to generate next available ID
  const generateNextId = () => {
    if (students.length === 0) return '1';
    const maxId = Math.max(...students.map(student => parseInt(student.id) || 0));
    return String(maxId + 1);
  };

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudents();
    }
  }, [isAuthenticated]);

  const fetchStudents = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/students`, {
        headers: headers,
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setStudents(data || []);
      } else if (res.status === 401) {
        handleLogout();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      let csrfToken = null;
      try {
        const csrfResponse = await fetch(`${API_URL}/csrf`, {
          credentials: 'include'
        });
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          csrfToken = csrfData.token;
        }
      } catch (csrfError) {
        console.log('CSRF token not available');
      }

      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });

      if (!res.ok) {
        throw new Error('Invalid username or password');
      }

      const responseData = await res.json();
      
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
      }
      
      setIsAuthenticated(true);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setStudents([]);
    setLoginForm({ username: '', password: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const token = localStorage.getItem('token');
    const method = editingStudent ? 'PUT' : 'POST';
    const url = editingStudent ? `${API_URL}/students/${editingStudent.id}` : `${API_URL}/students`;
    
    // For new students, ensure ID is set
    const studentData = { ...newStudent };
    if (!editingStudent && !studentData.id) {
      studentData.id = generateNextId();
    }
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method,
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(studentData)
      });

      if (!res.ok) {
        throw new Error('Failed to save student');
      }

      await fetchStudents();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setNewStudent({ 
      id: student.id || '',
      name: student.name || '',
      email: student.email || '',
      phoneNumber: student.phoneNumber || '',
      age: student.age || '',
      course: student.course || '',
      enrolled: student.enrolled !== undefined ? student.enrolled : true
    });
    setShowModal(true);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    setIsLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/students/${id}`, {
        method: 'DELETE',
        headers: headers,
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to delete student');
      }

      setStudents(students.filter(s => s.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setNewStudent({
      id: '',
      name: '',
      email: '',
      phoneNumber: '',
      age: '',
      course: '',
      enrolled: true
    });
    setError('');
  };

  // Helper function to open modal for new student with auto-generated ID
  const handleAddStudent = () => {
    const nextId = generateNextId();
    setNewStudent({
      id: nextId,
      name: '',
      email: '',
      phoneNumber: '',
      age: '',
      course: '',
      enrolled: true
    });
    setShowModal(true);
    setError('');
  };

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Safe filtering function
  const filteredStudents = students.filter(student => {
    if (!student) return false;
    const searchString = `${student.name || ''} ${student.email || ''} ${student.course || ''} ${student.id || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-wrapper">
          <div className="login-card">
            <div className="login-header">
              <div className="login-icon">
                <GraduationCap className="icon-large" />
              </div>
              <h1 className="login-title">EduManage Pro</h1>
              <p className="login-subtitle">Premium Student Management System</p>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle className="icon-small" />
                <span className="error-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <User className="input-icon" />
                <input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="input-group">
                <div className="password-icon">🔒</div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="input-field password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                >
                  {showPassword ? <EyeOff className="icon-small" /> : <Eye className="icon-small" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="login-button"
              >
                {isLoading ? (
                  <div className="loading-content">
                    <Loader className="loading-spinner" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="demo-text">
                Demo credentials: any username/password
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-brand">
            <div className="brand-icon">
              <GraduationCap className="icon-large" />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">EduManage Pro</h1>
              <p className="brand-subtitle">Premium Student Management</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            <LogOut className="icon-small" />
            Logout
          </button>
        </div>
      </header>

      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-blue">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Total Students</p>
                <h2 className="stat-value">{students.length}</h2>
              </div>
              <Users className="stat-icon" />
            </div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Active Courses</p>
                <h2 className="stat-value">12</h2>
              </div>
              <BookOpen className="stat-icon" />
            </div>
          </div>
          <div className="stat-card stat-green">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Growth Rate</p>
                <h2 className="stat-value">+24%</h2>
              </div>
              <TrendingUp className="stat-icon" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search students by name, email, course, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            onClick={handleAddStudent}
            className="add-button"
          >
            <Plus className="icon-small" />
            Add Student
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="main-error">
            <AlertCircle className="icon-medium" />
            <span>{error}</span>
          </div>
        )}

        {/* Students Grid */}
        {isLoading ? (
          <div className="loading-container">
            <Loader className="loading-spinner-large" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="students-grid">
            {filteredStudents.map((student) => (
              <div key={student.id} className="student-card">
                <div className="student-header">
                  <div className="student-avatar">
                    {getInitials(student.name)}
                  </div>
                  <div className="student-info">
                    <h3 className="student-name">{student.name || 'Unknown'}</h3>
                    <p className="student-email">
                      <Mail className="icon-tiny" />
                      {student.email || 'No email'}
                    </p>
                  </div>
                  <div className="student-id-badge">
                    <Hash className="icon-tiny" />
                    {student.id}
                  </div>
                </div>
                
                <div className="student-details">
                  <p className="detail-item">
                    <Phone className="icon-small" />
                    {student.phoneNumber || 'No phone'}
                  </p>
                  <p className="detail-item">
                    <Calendar className="icon-small" />
                    Age: {student.age || 'Unknown'}
                  </p>
                  <p className="detail-item">
                    <BookOpen className="icon-small" />
                    {student.course || 'No course'}
                  </p>
                  <p className="detail-item">
                    <Users className="icon-small" />
                    Status: {student.enrolled ? 'Enrolled' : 'Not Enrolled'}
                  </p>
                </div>
                
                <div className="student-actions">
                  <button
                    onClick={() => handleEdit(student)}
                    className="edit-button"
                  >
                    <Edit2 className="icon-small" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="delete-button"
                  >
                    <Trash2 className="icon-small" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <GraduationCap className="empty-icon" />
            <p className="empty-text">No students found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button
                onClick={closeModal}
                className="modal-close"
              >
                <X className="icon-medium" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <Hash className="icon-small" style={{color: '#666', marginRight: '0.5rem'}} />
                <input
                  type="text"
                  placeholder="Student ID"
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                  className="form-input"
                  required
                  readOnly={!!editingStudent} // Make ID read-only when editing
                  style={editingStudent ? {backgroundColor: '#f5f5f5', cursor: 'not-allowed'} : {}}
                />
                {editingStudent && (
                  <small style={{color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem'}}>
                    ID cannot be changed when editing
                  </small>
                )}
              </div>
              
              <input
                type="text"
                placeholder="Full Name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="form-input"
                required
              />
              
              <input
                type="email"
                placeholder="Email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="form-input"
                required
              />
              
              <input
                type="tel"
                placeholder="Phone Number"
                value={newStudent.phoneNumber}
                onChange={(e) => setNewStudent({ ...newStudent, phoneNumber: e.target.value })}
                className="form-input"
                required
              />
              
              <input
                type="number"
                placeholder="Age"
                value={newStudent.age}
                onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                className="form-input"
                required
                min="1"
                max="100"
              />
              
              <input
                type="text"
                placeholder="Course"
                value={newStudent.course}
                onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                className="form-input"
                required
              />

              <div className="form-row">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={newStudent.enrolled}
                    onChange={(e) => setNewStudent({ ...newStudent, enrolled: e.target.checked })}
                  />
                  Enrolled
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="submit-button"
                >
                  {isLoading ? (
                    <div className="loading-content">
                      <Loader className="loading-spinner-small" />
                      Saving...
                    </div>
                  ) : (
                    editingStudent ? 'Update' : 'Add Student'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagementApp;