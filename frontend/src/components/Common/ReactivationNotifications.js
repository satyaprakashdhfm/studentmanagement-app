import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import './ReactivationNotifications.css';

const ReactivationNotifications = () => {
  const [deactivatedData, setDeactivatedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkForDeactivatedRecords();
  }, []);

  const checkForDeactivatedRecords = async () => {
    try {
      const response = await apiService.get('/reactivation/deactivated');
      if (response.success && response.counts.total > 0) {
        setDeactivatedData(response);
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error checking deactivated records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateClass = async (classId, includingStudents = false) => {
    setProcessing(true);
    try {
      const endpoint = includingStudents 
        ? `/reactivation/class/${classId}/students`
        : `/reactivation/class/${classId}`;
      
      const response = await apiService.post(endpoint);
      if (response.success) {
        alert(response.message);
        // Refresh the deactivated records
        await checkForDeactivatedRecords();
      }
    } catch (error) {
      console.error('Error reactivating class:', error);
      alert(error.response?.data?.error || 'Failed to reactivate class');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivateStudent = async (studentId) => {
    setProcessing(true);
    try {
      const response = await apiService.post(`/reactivation/student/${studentId}`);
      if (response.success) {
        alert(response.message);
        // Refresh the deactivated records
        await checkForDeactivatedRecords();
      }
    } catch (error) {
      console.error('Error reactivating student:', error);
      alert(error.response?.data?.error || 'Failed to reactivate student');
    } finally {
      setProcessing(false);
    }
  };

  const closeNotification = () => {
    setShowNotification(false);
  };

  if (loading || !showNotification || !deactivatedData) {
    return null;
  }

  const { data, counts } = deactivatedData;

  return (
    <div className="reactivation-notification-overlay">
      <div className="reactivation-notification-modal">
        <div className="notification-header">
          <h3>⚠️ Deactivated Records Found</h3>
          <button className="close-btn" onClick={closeNotification}>×</button>
        </div>
        
        <div className="notification-content">
          <p className="notification-summary">
            Found <strong>{counts.total}</strong> deactivated records that can be restored:
          </p>

          {/* Deactivated Classes */}
          {counts.classes > 0 && (
            <div className="deactivated-section">
              <h4>📚 Deactivated Classes ({counts.classes})</h4>
              <div className="deactivated-list">
                {data.classes.map((cls) => (
                  <div key={cls.classId} className="deactivated-item class-item">
                    <div className="item-info">
                      <strong>{cls.className} - {cls.section}</strong>
                      <span className="item-details">
                        Academic Year: {cls.academicYear} | 
                        Students: {cls._count.students} |
                        Teacher: {cls.classTeacher?.name || 'Not assigned'}
                      </span>
                    </div>
                    <div className="item-actions">
                      <button 
                        className="reactivate-btn primary"
                        onClick={() => handleReactivateClass(cls.classId, true)}
                        disabled={processing}
                      >
                        Reactivate Class + Students
                      </button>
                      <button 
                        className="reactivate-btn secondary"
                        onClick={() => handleReactivateClass(cls.classId, false)}
                        disabled={processing}
                      >
                        Reactivate Class Only
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deactivated Students */}
          {counts.students > 0 && (
            <div className="deactivated-section">
              <h4>👥 Deactivated Students ({counts.students})</h4>
              <div className="deactivated-list">
                {data.students.map((student) => (
                  <div key={student.studentId} className="deactivated-item student-item">
                    <div className="item-info">
                      <strong>{student.name}</strong>
                      <span className="item-details">
                        ID: {student.studentId} | 
                        Class: {student.class ? `${student.class.className} - ${student.class.section}` : 'No class'} |
                        Class Status: {student.class?.active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                    <div className="item-actions">
                      {student.class?.active ? (
                        <button 
                          className="reactivate-btn primary"
                          onClick={() => handleReactivateStudent(student.studentId)}
                          disabled={processing}
                        >
                          Reactivate Student
                        </button>
                      ) : (
                        <button 
                          className="reactivate-btn disabled"
                          disabled={true}
                          title="Cannot reactivate student because their class is deactivated. Reactivate the class first."
                        >
                          Reactivate Class First
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deactivated Users */}
          {counts.users > 0 && (
            <div className="deactivated-section">
              <h4>👤 Deactivated Users ({counts.users})</h4>
              <div className="deactivated-list">
                {data.users.map((user) => (
                  <div key={user.username} className="deactivated-item user-item">
                    <div className="item-info">
                      <strong>{user.firstName} {user.lastName}</strong>
                      <span className="item-details">
                        Username: {user.username} | 
                        Email: {user.email} | 
                        Role: {user.role}
                      </span>
                    </div>
                    <div className="item-actions">
                      <button 
                        className="reactivate-btn secondary"
                        disabled={true}
                        title="Manual user reactivation not implemented yet"
                      >
                        Manual Reactivation Required
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="notification-footer">
          <button className="close-notification-btn" onClick={closeNotification}>
            Close Notification
          </button>
          <button className="refresh-btn" onClick={checkForDeactivatedRecords} disabled={processing}>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReactivationNotifications;