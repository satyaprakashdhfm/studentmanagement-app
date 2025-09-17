import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import apiService from '../../../services/api';
import './HolidayManagement.css';

const HolidayManagement = () => {
  const { selectedAcademicYear, classes } = useAcademicYear();
  const [loading, setLoading] = useState(false);
  
  // Holiday management state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    holidayName: '',
    startDate: '',
    endDate: '',
    duration: 'full_day', // 'full_day', 'half_day'
    classId: 'all' // Default to 'all' for all classes
  });
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [allUpcomingHolidays, setAllUpcomingHolidays] = useState([]); // Store all holidays
  const [holidayFilter, setHolidayFilter] = useState('all'); // Filter for displaying holidays
  const [editingHoliday, setEditingHoliday] = useState(null);

  // Fetch upcoming holidays for all classes
  const fetchUpcomingHolidays = async () => {
    try {
      setLoading(true);
      console.log('🏖️ Fetching upcoming holidays for all classes');
      console.log('📊 Available classes for filtering:', classes);
      
      const response = await apiService.get('/timemanagement/upcoming-holidays/all');
      if (response && response.success) {
        console.log('🏖️ All upcoming holidays received:', response.data);
        setAllUpcomingHolidays(response.data);
        filterHolidays(response.data, holidayFilter);
      } else {
        setAllUpcomingHolidays([]);
        setUpcomingHolidays([]);
      }
    } catch (error) {
      console.error('❌ Error fetching upcoming holidays:', error);
      setAllUpcomingHolidays([]);
      setUpcomingHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter holidays based on selected class
  const filterHolidays = (holidays, filterClassId) => {
    console.log('🔍 Filtering holidays with filterClassId:', filterClassId, 'type:', typeof filterClassId);
    console.log('🎉 Sample holiday classIds:', holidays.slice(0, 3).map(h => ({ 
      classId: h.classId, 
      type: typeof h.classId,
      holidayName: h.holidayName,
      className: h.className
    })));
    
    if (filterClassId === 'all') {
      setUpcomingHolidays(holidays);
    } else {
      // Convert both values to the same type for comparison
      const filterValue = parseInt(filterClassId);
      const filtered = holidays.filter(holiday => {
        // Handle cases where classId might be null, undefined, or different types
        if (!holiday.classId && holiday.classId !== 0) {
          // If holiday doesn't have a classId, it might be a global holiday
          // Show it in all class filters
          console.log('🌍 Global holiday found:', holiday.holidayName);
          return true;
        }
        
        const holidayClassId = typeof holiday.classId === 'string' ? parseInt(holiday.classId) : holiday.classId;
        const matches = holidayClassId === filterValue;
        
        if (!matches && holidays.length < 10) { // Only log for debugging when data is small
          console.log('❌ No match:', { holidayClassId, filterValue, holidayName: holiday.holidayName });
        }
        
        return matches;
      });
      console.log('✅ Filtered holidays count:', filtered.length, 'from total:', holidays.length);
      setUpcomingHolidays(filtered);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterClassId) => {
    setHolidayFilter(filterClassId);
    filterHolidays(allUpcomingHolidays, filterClassId);
  };

  useEffect(() => {
    fetchUpcomingHolidays();
  }, [selectedAcademicYear]);

  // Holiday form functions
  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({
      holidayName: '',
      startDate: '',
      endDate: '',
      duration: 'full_day',
      classId: 'all'
    });
    setShowHolidayModal(true);
  };

  const handleEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      holidayName: holiday.holidayName || '',
      startDate: holiday.startDate || '',
      endDate: holiday.endDate || '',
      duration: holiday.duration || 'full_day',
      classId: holiday.classId || 'all'
    });
    setShowHolidayModal(true);
  };

  const handleHolidayFormSubmit = async () => {
    if (!holidayForm.holidayName.trim() || !holidayForm.startDate) {
      alert('Please fill in holiday name and start date.');
      return;
    }

    try {
      setLoading(true);

      // If no end date is provided, use start date
      const endDate = holidayForm.endDate || holidayForm.startDate;

      // If "All Classes" is selected, create holidays for each class
      let holidaysToCreate = [];
      if (holidayForm.classId === 'all') {
        classes.forEach(cls => {
          holidaysToCreate.push({
            ...holidayForm,
            endDate,
            classId: cls.classId,
            academicYear: selectedAcademicYear
          });
        });
      } else {
        holidaysToCreate.push({
          ...holidayForm,
          endDate,
          academicYear: selectedAcademicYear
        });
      }

      console.log('💾 Saving holiday to database:', holidaysToCreate);

      if (editingHoliday) {
        // Update existing holiday
        const response = await apiService.put(`/timemanagement/holiday/${editingHoliday.id}`, {
          ...holidayForm,
          endDate,
          academicYear: selectedAcademicYear
        });
        console.log('✅ Holiday updated successfully:', response);
        alert('Holiday updated successfully!');
      } else {
        // Create new holidays
        const response = await apiService.post('/timemanagement/holidays', {
          holidays: holidaysToCreate
        });
        console.log('✅ Holidays saved successfully:', response);
        alert(`Holiday created successfully for ${holidayForm.classId === 'all' ? 'all classes' : 'selected class'}!`);
      }
      
      // Reset form and close modal
      setShowHolidayModal(false);
      setEditingHoliday(null);
      setHolidayForm({
        holidayName: '',
        startDate: '',
        endDate: '',
        duration: 'full_day',
        classId: 'all'
      });
      
      // Refresh upcoming holidays
      await fetchUpcomingHolidays();
      
    } catch (error) {
      console.error('❌ Error saving holiday:', error);
      alert('Error saving holiday: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.delete(`/timemanagement/holiday/${holidayId}`);
      alert('Holiday deleted successfully!');
      await fetchUpcomingHolidays();
    } catch (error) {
      console.error('❌ Error deleting holiday:', error);
      alert('Error deleting holiday: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="holiday-management">
      <div className="holiday-header">
        <h2>🏖️ Holiday Management</h2>
        <p>Manage holidays for all classes in academic year {selectedAcademicYear}</p>
      </div>

      {/* Holiday Creation Button */}
      <div className="holiday-creation-section">
        <h3>Holiday Management</h3>
        <button
          className="add-holiday-btn"
          onClick={handleAddHoliday}
          disabled={loading}
        >
          <span className="btn-icon">➕</span>
          <span className="btn-text">Add New Holiday</span>
        </button>
      </div>

      {/* Upcoming Holidays Table */}
      <div className="upcoming-holidays-section">
        <div className="section-header">
          <h3>Upcoming Holidays</h3>
          <div className="filter-container">
            <label htmlFor="holiday-filter">Filter by Class:</label>
            <select
              id="holiday-filter"
              value={holidayFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="filter-select"
            >
              <option value="all">🏫 All Classes</option>
              {classes && classes.length > 0 ? classes.map(cls => (
                <option key={cls.classId} value={cls.classId}>
                  Grade {cls.className} {cls.section ? `- Section ${cls.section}` : ''}
                </option>
              )) : (
                <option disabled>Loading classes...</option>
              )}
            </select>
          </div>
        </div>
        {loading && <p>Loading...</p>}
        {upcomingHolidays.length > 0 ? (
          <div className="holidays-table-container">
            <table className="holidays-table">
              <thead>
                <tr>
                  <th>Holiday Name</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Duration</th>
                  <th>Class</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingHolidays.map((holiday, index) => (
                  <tr key={holiday.id || index}>
                    <td className="holiday-name">{holiday.holidayName}</td>
                    <td>{new Date(holiday.startDate).toLocaleDateString('en-GB')}</td>
                    <td>
                      {holiday.endDate && holiday.endDate !== holiday.startDate
                        ? new Date(holiday.endDate).toLocaleDateString('en-GB')
                        : 'Same day'
                      }
                    </td>
                    <td>
                      <span className={`duration-badge ${holiday.duration}`}>
                        {holiday.duration === 'full_day' ? 'Full Day' : 'Half Day'}
                      </span>
                    </td>
                    <td>{holiday.className || 'N/A'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditHoliday(holiday)}
                          disabled={loading}
                          title="Edit Holiday"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          disabled={loading}
                          title="Delete Holiday"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No upcoming holidays scheduled.</p>
        )}
      </div>

      {/* Holiday Form Modal */}
      {showHolidayModal && (
        <div className="modal-overlay">
          <div className="modal-content holiday-modal">
            <h3>
              {editingHoliday ? '✏️ Edit Holiday' : '➕ Add New Holiday'}
            </h3>
            
            <div className="form-group">
              <label>Holiday Name:</label>
              <input
                type="text"
                placeholder="e.g., Independence Day, Summer Break"
                value={holidayForm.holidayName}
                onChange={(e) => setHolidayForm({...holidayForm, holidayName: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Target Classes:</label>
              <select
                value={holidayForm.classId}
                onChange={(e) => setHolidayForm({...holidayForm, classId: e.target.value})}
                disabled={editingHoliday} // Disable class selection when editing
              >
                <option value="all">🏫 All Classes</option>
                {classes.map(cls => (
                  <option key={cls.classId} value={cls.classId}>
                    Grade {cls.className} - Section {cls.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={holidayForm.startDate}
                  onChange={(e) => setHolidayForm({...holidayForm, startDate: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>End Date (Optional):</label>
                <input
                  type="date"
                  value={holidayForm.endDate}
                  onChange={(e) => setHolidayForm({...holidayForm, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Duration:</label>
              <div className="duration-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="duration"
                    value="full_day"
                    checked={holidayForm.duration === 'full_day'}
                    onChange={(e) => setHolidayForm({...holidayForm, duration: e.target.value})}
                  />
                  <span>Full Day Holiday</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="duration"
                    value="half_day"
                    checked={holidayForm.duration === 'half_day'}
                    onChange={(e) => setHolidayForm({...holidayForm, duration: e.target.value})}
                  />
                  <span>Half Day Holiday</span>
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowHolidayModal(false);
                  setEditingHoliday(null);
                  setHolidayForm({
                    holidayName: '',
                    startDate: '',
                    endDate: '',
                    duration: 'full_day',
                    classId: 'all'
                  });
                }}
              >
                Cancel
              </button>
              <button
                className="save-btn"
                onClick={handleHolidayFormSubmit}
                disabled={loading || !holidayForm.holidayName.trim() || !holidayForm.startDate}
              >
                {loading ? 'Saving...' : (editingHoliday ? 'Update Holiday' : 'Save Holiday')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;