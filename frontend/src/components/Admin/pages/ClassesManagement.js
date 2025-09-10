import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './ClassesManagement.css';

const ClassesManagement = () => {
  const { grade } = useParams();
  const { selectedAcademicYear } = useAcademicYear();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    classId: '',
    className: '',
    section: '',
    classTeacherId: '',
    academicYear: selectedAcademicYear,
    maxStudents: ''
  });
  const [teachers, setTeachers] = useState([]);
  const [addModal, setAddModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  // Fetch classes and teachers
  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [selectedAcademicYear, grade]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('academicYear', selectedAcademicYear);
      if (grade) {
        params.append('search', grade);
      }

      const response = await apiService.request(`/classes?${params}`);
      setClasses(response.classes || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await apiService.getTeachers();
      setTeachers(response.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  useEffect(() => {
    // Initialize Bootstrap modals
    const addModalElement = document.getElementById('addClassModal');
    const editModalElement = document.getElementById('editClassModal');

    if (addModalElement && window.bootstrap) {
      setAddModal(new window.bootstrap.Modal(addModalElement));
    }
    if (editModalElement && window.bootstrap) {
      setEditModal(new window.bootstrap.Modal(editModalElement));
    }
  }, []);

  const handleAddClass = () => {
    setFormData({
      classId: '',
      className: '',
      section: '',
      classTeacherId: '',
      academicYear: selectedAcademicYear,
      maxStudents: ''
    });
    if (addModal) {
      addModal.show();
    }
  };

  const handleEditClass = (classItem) => {
    console.log('Editing class:', classItem);
    setSelectedClass(classItem);
    setFormData({
      classId: classItem.classId.toString(),
      className: classItem.className,
      section: classItem.section,
      classTeacherId: classItem.classTeacherId ? classItem.classTeacherId.toString() : '',
      academicYear: classItem.academicYear,
      maxStudents: classItem.maxStudents ? classItem.maxStudents.toString() : ''
    });
    if (editModal) {
      editModal.show();
    }
  };

  const handleDeleteClass = async (classId) => {
    console.log('Deleting class with ID:', classId);
    if (window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      try {
        console.log('Calling API to delete class:', classId);
        await apiService.deleteClass(classId);
        console.log('Class deleted successfully');
        fetchClasses(); // Refresh the list
        alert('Class deleted successfully');
      } catch (err) {
        console.error('Error deleting class:', err);
        alert('Failed to delete class: ' + err.message);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted, selectedClass:', selectedClass);
    console.log('Form data:', formData);
    
    try {
      const classData = {
        ...formData,
        classId: parseInt(formData.classId),
        classTeacherId: formData.classTeacherId ? parseInt(formData.classTeacherId) : null,
        maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : null
      };

      console.log('Processed class data:', classData);

      if (selectedClass) {
        // Update existing class
        console.log('Updating class with ID:', selectedClass.classId);
        await apiService.updateClass(selectedClass.classId, classData);
        alert('Class updated successfully');
        if (editModal) {
          editModal.hide();
        }
      } else {
        // Create new class
        console.log('Creating new class');
        await apiService.createClass(classData);
        alert('Class created successfully');
        if (addModal) {
          addModal.hide();
        }
      }

      setSelectedClass(null); // Reset selected class
      fetchClasses(); // Refresh the list
    } catch (err) {
      console.error('Error saving class:', err);
      alert('Failed to save class: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Not assigned';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center m-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h4>Error</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchClasses}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="classes-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {grade ? `Grade ${grade} Classes` : 'All Classes'} - {selectedAcademicYear}
        </h2>
        <button
          className="btn btn-primary"
          onClick={handleAddClass}
        >
          <i className="fas fa-plus me-2"></i>Add New Class
        </button>
      </div>

      <div className="row">
        {classes.length > 0 ? (
          classes.map((classItem) => (
            <div key={classItem.classId} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    {classItem.className} - Section {classItem.section}
                  </h5>
                  <div className="dropdown">
                    <button
                      className="btn btn-sm btn-outline-secondary dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                    <ul className="dropdown-menu">
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => handleEditClass(classItem)}
                        >
                          <i className="fas fa-edit me-2"></i>Edit
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item text-danger"
                          onClick={() => handleDeleteClass(classItem.classId)}
                        >
                          <i className="fas fa-trash me-2"></i>Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <p className="card-text">
                    <strong>Class ID:</strong> {classItem.classId}<br/>
                    <strong>Academic Year:</strong> {classItem.academicYear}<br/>
                    <strong>Class Teacher:</strong> {getTeacherName(classItem.classTeacherId)}<br/>
                    <strong>Max Students:</strong> {classItem.maxStudents || 'Not set'}<br/>
                    <strong>Current Students:</strong> {classItem._count?.students || 0}<br/>
                    <strong>Status:</strong>
                    <span className={`badge ms-2 ${classItem.isActive ? 'bg-success' : 'bg-secondary'}`}>
                      {classItem.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
                <div className="card-footer">
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => handleEditClass(classItem)}
                  >
                    <i className="fas fa-edit me-1"></i>Edit Details
                  </button>
                  <button
                    className="btn btn-sm btn-outline-info"
                    onClick={() => {
                      // TODO: Navigate to class schedule
                      console.log('View schedule for class:', classItem.id);
                    }}
                  >
                    <i className="fas fa-calendar me-1"></i>View Schedule
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="alert alert-info text-center">
              <h4>No Classes Found</h4>
              <p>
                {grade
                  ? `No classes found for Grade ${grade} in ${selectedAcademicYear}`
                  : `No classes found for ${selectedAcademicYear}`
                }
              </p>
              <button
                className="btn btn-primary"
                onClick={handleAddClass}
              >
                <i className="fas fa-plus me-2"></i>Add First Class
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <div className="modal fade" id="addClassModal" tabIndex="-1" aria-labelledby="addClassModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="addClassModalLabel">Add New Class</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedClass(null);
                }}
              ></button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Class ID *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="classId"
                      value={formData.classId}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Class Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="className"
                      value={formData.className}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Section *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Academic Year</label>
                    <input
                      type="text"
                      className="form-control"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Class Teacher</label>
                    <select
                      className="form-control"
                      name="classTeacherId"
                      value={formData.classTeacherId}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Max Students</label>
                    <input
                      type="number"
                      className="form-control"
                      name="maxStudents"
                      value={formData.maxStudents}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedClass(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Class Modal */}
      <div className="modal fade" id="editClassModal" tabIndex="-1" aria-labelledby="editClassModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editClassModalLabel">Edit Class: {selectedClass?.className} - {selectedClass?.section}</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClass(null);
                }}
              ></button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Class ID *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="classId"
                      value={formData.classId}
                      onChange={handleInputChange}
                      required
                      disabled
                    />
                    <small className="text-muted">Class ID cannot be changed</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Class Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="className"
                      value={formData.className}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Section *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Academic Year</label>
                    <input
                      type="text"
                      className="form-control"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Class Teacher</label>
                    <select
                      className="form-control"
                      name="classTeacherId"
                      value={formData.classTeacherId}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Max Students</label>
                    <input
                      type="number"
                      className="form-control"
                      name="maxStudents"
                      value={formData.maxStudents}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClass(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Update Class
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassesManagement;
