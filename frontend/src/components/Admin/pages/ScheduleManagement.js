import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScheduleManagement.css';

const ScheduleManagement = () => {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState(null);

  const scheduleOptions = [
    {
      id: 'exams',
      title: 'Exam Schedules',
      description: 'Create and manage exam schedules for all classes',
      icon: '📚',
      color: '#3498db',
      path: '/admin/schedule-management/exams'
    },
    {
      id: 'holidays',
      title: 'Holiday Schedules',
      description: 'Add and manage holidays for all classes',
      icon: '🏖️',
      color: '#27ae60',
      path: '/admin/schedule-management/holidays'
    },
    {
      id: 'timetable',
      title: 'Class Timetables',
      description: 'Manage regular class schedules and timetables',
      icon: '📅',
      color: '#f39c12',
      path: '/admin/timemanagement'
    },
    {
      id: 'events',
      title: 'Special Events',
      description: 'Schedule special school events and activities',
      icon: '🎉',
      color: '#9b59b6',
      path: '#',
      comingSoon: true
    }
  ];

  const handleOptionClick = (option) => {
    if (option.comingSoon) {
      alert('This feature is coming soon!');
      return;
    }
    
    setSelectedAction(option.id);
    setTimeout(() => {
      navigate(option.path);
    }, 200);
  };

  return (
    <div className="schedule-management">
      <div className="schedule-header">
        <h2>📋 Schedule Management</h2>
        <p>Centralized management for all school schedules and events</p>
      </div>

      <div className="schedule-options-grid">
        {scheduleOptions.map((option) => (
          <div
            key={option.id}
            className={`schedule-option-card ${selectedAction === option.id ? 'selected' : ''} ${option.comingSoon ? 'coming-soon' : ''}`}
            onClick={() => handleOptionClick(option)}
            style={{ '--card-color': option.color }}
          >
            <div className="card-icon">
              {option.icon}
            </div>
            <div className="card-content">
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              {option.comingSoon && (
                <span className="coming-soon-badge">Coming Soon</span>
              )}
            </div>
            <div className="card-arrow">
              {!option.comingSoon ? '→' : '🔒'}
            </div>
          </div>
        ))}
      </div>

      <div className="quick-stats">
        <h3>Quick Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h4>Exam Schedules</h4>
              <p>Manage upcoming exams across all classes with flexible scheduling options</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏖️</div>
            <div className="stat-content">
              <h4>Holiday Management</h4>
              <p>Schedule holidays and breaks for all classes or specific grades</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h4>Regular Timetables</h4>
              <p>Maintain daily class schedules and subject timings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="schedule-tips">
        <h3>💡 Scheduling Tips</h3>
        <div className="tips-list">
          <div className="tip-item">
            <span className="tip-icon">✅</span>
            <span className="tip-text">Use "All Classes" option when scheduling events that affect the entire school</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📊</span>
            <span className="tip-text">Review upcoming schedules regularly to avoid conflicts</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔔</span>
            <span className="tip-text">Set holidays and exam dates well in advance for better planning</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <span className="tip-text">Use specific class selection for grade-specific events</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagement;