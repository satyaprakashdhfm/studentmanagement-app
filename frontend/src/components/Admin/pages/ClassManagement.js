import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './ClassManagement.css';

const emptyForm = {
    classId: null,
    className: '',
    section: '',
    academicYear: '',
    maxStudents: '',
    classTeacherId: ''
};

const ClassManagement = () => {
    const { selectedAcademicYear } = useAcademicYear();
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // modal/form state
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState(emptyForm);

    // Grade options for dropdown
    const gradeOptions = [
        { value: '1', label: '1st Grade' },
        { value: '2', label: '2nd Grade' },
        { value: '3', label: '3rd Grade' },
        { value: '4', label: '4th Grade' },
        { value: '5', label: '5th Grade' },
        { value: '6', label: '6th Grade' },
        { value: '7', label: '7th Grade' },
        { value: '8', label: '8th Grade' },
        { value: '9', label: '9th Grade' },
        { value: '10', label: '10th Grade' }
    ];

    // Academic year options (previous, current, and future years)
    const currentYear = new Date().getFullYear();
    const academicYearOptions = [
        `${currentYear - 2}-${currentYear - 1}`, // 2023-2024
        `${currentYear - 1}-${currentYear}`,     // 2024-2025 (current)
        `${currentYear}-${currentYear + 1}`,     // 2025-2026
        `${currentYear + 1}-${currentYear + 2}`, // 2026-2027
        `${currentYear + 2}-${currentYear + 3}`  // 2027-2028
    ];

    // Get available sections based on selected grade and academic year
    const getAvailableSections = () => {
        const allSections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        
        if (!form.className) return allSections;
        
        // Use the selected academic year from the form, or fall back to global selection
        const targetAcademicYear = form.academicYear || selectedAcademicYear;
        
        if (!targetAcademicYear) return allSections;
        
        // Find existing sections for the EXACT combination of grade + academic year
        const existingSections = classes
            .filter(cls => 
                cls.className === form.className && 
                cls.academicYear === targetAcademicYear
            )
            .map(cls => cls.section);
        
        console.log(`Checking Grade ${form.className}, Academic Year ${targetAcademicYear}`);
        console.log('Existing sections:', existingSections);
        
        // Return only available (unused) sections
        if (editMode && form.section) {
            // If editing, include current section even if it exists
            const availableSections = allSections.filter(section => 
                !existingSections.includes(section) || section === form.section
            );
            console.log('Available sections (edit mode):', availableSections);
            return availableSections;
        } else {
            // If adding new, only show truly available sections
            const availableSections = allSections.filter(section => !existingSections.includes(section));
            console.log('Available sections (add mode):', availableSections);
            return availableSections;
        }
    };

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await apiService.getClasses();
            if (resp && resp.classes) {
                const filtered = resp.classes.filter(c => !selectedAcademicYear || c.academicYear === selectedAcademicYear);
                setClasses(filtered);
            } else {
                setError(resp.message || 'Failed to fetch classes');
            }
        } catch (err) {
            const msg = err.message || String(err);
            if (msg.includes('Access token') || msg.includes('401') || msg.includes('token')) {
                setError('Not authenticated. Please login as admin.');
            } else {
                setError('Failed to load classes');
            }
        } finally {
            setLoading(false);
        }
    }, [selectedAcademicYear]);

    const fetchTeachers = useCallback(async () => {
        try {
            const resp = await apiService.getTeachers();
            if (resp && resp.teachers) {
                setTeachers(resp.teachers);
            }
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
            // Don't set error state for teachers, just log it
        }
    }, []);

    useEffect(() => {
        fetchClasses();
        fetchTeachers();
    }, [fetchClasses, fetchTeachers]);

    const groups = classes.reduce((acc, cls) => {
        const grade = cls.className || 'Ungraded';
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(cls);
        return acc;
    }, {});

    const openAdd = () => {
        setForm({ ...emptyForm, academicYear: selectedAcademicYear || '' });
        setEditMode(false);
        setShowModal(true);
    };

    const openEdit = (cls) => {
        setForm({
            classId: cls.classId,
            className: cls.className,
            section: cls.section,
            academicYear: cls.academicYear,
            maxStudents: cls.maxStudents || '',
            classTeacherId: cls.classTeacherId || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const handleDelete = async (cls) => {
        // This is now just for backwards compatibility - redirects to soft delete
        return handleSoftDeleteClass(cls);
    };

    const handleSoftDeleteClass = async (cls) => {
        const studentCount = cls.students?.length || 0;
        const warningMessage = studentCount > 0 
            ? `⚠️ This will DEACTIVATE class ${cls.className} - ${cls.section}.\n\n🚨 WARNING: ALL ${studentCount} ACTIVE STUDENTS in this class will also be deactivated!\n\nThis action will:\n- Deactivate the class\n- Deactivate all ${studentCount} students in this class\n- Deactivate their user accounts\n- Preserve all data for history\n\nTo confirm SOFT deletion, please type "class" (without quotes):`
            : `⚠️ This will DEACTIVATE class ${cls.className} - ${cls.section}.\n\nThis class has no active students.\n\nTo confirm SOFT deletion, please type "class" (without quotes):`;
        
        const confirmText = prompt(warningMessage);
        if (confirmText !== 'class') return;
        
        try {
            const response = await apiService.deleteClass(cls.classId);
            await fetchClasses();
            
            const message = response?.message || 'Class deactivated successfully (data preserved for history)';
            alert(message);
        } catch (err) {
            console.error('Soft delete error', err);
            const errorMessage = err.response?.data?.error || 'Failed to deactivate class';
            alert(errorMessage);
        }
    };

    const handleHardDeleteClass = async (cls) => {
        const finalConfirm = window.confirm(
            `⚠️⚠️ PERMANENT HARD DELETE ⚠️⚠️\n\nThis will PERMANENTLY DELETE class "${cls.className} - ${cls.section}" and ALL its data from the database.\n\n🚨 This action CANNOT be undone!\n🚨 All student records, attendance, marks, and fees data will be LOST FOREVER!\n\nAre you absolutely sure you want to HARD DELETE this class?`
        );
        
        if (!finalConfirm) return;
        
        const typeConfirm = prompt('Type "HARD DELETE" to confirm permanent deletion:');
        if (typeConfirm !== 'HARD DELETE') return;
        
        try {
            const response = await apiService.request(`/classes/${cls.classId}/hard-delete`, {
                method: 'DELETE'
            });
            await fetchClasses();
            alert('Class permanently deleted from database');
        } catch (err) {
            console.error('Hard delete error', err);
            const errorMessage = err.response?.data?.error || 'Failed to hard delete class';
            alert(errorMessage);
        }
    };

    const handleReactivateClass = async (cls) => {
        const studentCount = cls.students?.length || 0;
        const activeStudentCount = cls.students?.filter(s => s.status === 'active').length || 0;
        const inactiveStudentCount = studentCount - activeStudentCount;
        
        let message = `🔄 This class "${cls.className} - ${cls.section}" is currently DEACTIVATED.\n\n`;
        
        if (inactiveStudentCount > 0) {
            message += `📚 This class has ${inactiveStudentCount} deactivated student(s) that can also be reactivated.\n\n`;
        }
        
        message += `Do you want to REACTIVATE this class?`;
        
        const confirmed = window.confirm(message);
        if (!confirmed) return;
        
        try {
            const response = await apiService.post(`/reactivation/class/${cls.classId}`, {
                includeStudents: inactiveStudentCount > 0
            });
            
            // Refresh the classes list
            await fetchClasses();
            
            const successMessage = response?.message || 
                `✅ Class "${cls.className} - ${cls.section}" has been reactivated successfully!`;
            alert(successMessage);
            
        } catch (err) {
            console.error('Reactivation error:', err);
            const errorMessage = err.response?.data?.error || 'Failed to reactivate class';
            alert(`❌ Error: ${errorMessage}`);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        
        setForm(prev => {
            const newData = {
                ...prev,
                [name]: value
            };
            
            // Auto-suggest next available section when grade OR academic year changes
            if ((name === 'className' || name === 'academicYear') && newData.className && newData.academicYear && !editMode) {
                const existingSections = classes
                    .filter(cls => cls.className === newData.className && cls.academicYear === newData.academicYear)
                    .map(cls => cls.section)
                    .sort();
                
                // Find the first available section
                const allSections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                const nextSection = allSections.find(section => !existingSections.includes(section));
                
                if (nextSection && (name === 'className' || name === 'academicYear')) {
                    newData.section = nextSection;
                }
            }
            
            // Clear section if grade is cleared
            if (name === 'className' && !value) {
                newData.section = '';
            }
            
            // Clear section if academic year is cleared
            if (name === 'academicYear' && !value) {
                newData.section = '';
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                className: form.className,
                section: form.section,
                academicYear: form.academicYear || selectedAcademicYear,
                maxStudents: form.maxStudents ? parseInt(form.maxStudents, 10) : null,
                classTeacherId: form.classTeacherId || null
            };

            if (editMode) {
                // For updates, include the classId
                payload.classId = form.classId;
                await apiService.updateClass(form.classId, payload);
                alert('Class updated');
            } else {
                // For creation, don't include classId (it will be auto-generated)
                await apiService.createClass(payload);
                alert('Class created');
            }

            setShowModal(false);
            await fetchClasses();
        } catch (err) {
            console.error('Save error', err);
            
            // Show more specific error messages
            if (err.response?.data?.error) {
                alert(err.response.data.error);
            } else {
                alert('Failed to save class');
            }
        }
    };

    return (
        <div className="content-area">
            <div className="content-header">
                <h2>Class Management</h2>
                <div>
                    <button onClick={openAdd}>+ Add Class</button>
                </div>
            </div>

            {loading && <p>Loading classes...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!loading && !error && (
                <div className="grades-list">
                    {Object.keys(groups).length === 0 && <p>No classes found for the selected academic year.</p>}
                    {Object.entries(groups).map(([grade, clsList]) => {
                        // Clean up grade display - handle existing data format
                        const cleanGrade = grade.toString().trim();
                        let displayGrade = cleanGrade;
                        
                        // If grade already contains "Grade" (like "10 Grade"), format it properly
                        if (cleanGrade.toLowerCase().includes('grade')) {
                            // Extract number and format properly (e.g., "10 Grade" -> "10th Grade")
                            const number = cleanGrade.replace(/\s*grade\s*/i, '').trim();
                            displayGrade = number === '1' ? '1st Grade' : 
                                          number === '2' ? '2nd Grade' : 
                                          number === '3' ? '3rd Grade' : 
                                          number === '21' ? '21st Grade' :
                                          number === '22' ? '22nd Grade' :
                                          number === '23' ? '23rd Grade' :
                                          number.endsWith('1') && number !== '11' ? `${number}st Grade` :
                                          number.endsWith('2') && number !== '12' ? `${number}nd Grade` :
                                          number.endsWith('3') && number !== '13' ? `${number}rd Grade` :
                                          `${number}th Grade`;
                        } else {
                            // Handle pure number format
                            displayGrade = cleanGrade === '1' ? '1st Grade' : 
                                          cleanGrade === '2' ? '2nd Grade' : 
                                          cleanGrade === '3' ? '3rd Grade' : 
                                          cleanGrade === '4' ? '4th Grade' :
                                          cleanGrade === '5' ? '5th Grade' :
                                          cleanGrade === '6' ? '6th Grade' :
                                          cleanGrade === '7' ? '7th Grade' :
                                          cleanGrade === '8' ? '8th Grade' :
                                          cleanGrade === '9' ? '9th Grade' :
                                          cleanGrade === '10' ? '10th Grade' :
                                          `${cleanGrade}th Grade`;
                        }
                        
                        return (
                        <div key={grade} className="grade-block">
                            <h3>{displayGrade}</h3>
                            <div className="sections">
                                {clsList.map(cls => (
                                    <div 
                                        key={cls.classId} 
                                        className={`section-card ${!cls.active ? 'deactivated' : ''}`}
                                    >
                                        <div className="section-info">
                                            <strong>
                                                Section {cls.section}
                                                {!cls.active && <span className="deactivated-badge">DEACTIVATED</span>}
                                            </strong>
                                            <div className="meta">Students: {cls._count?.students ?? 0}</div>
                                            <div className="meta">Teacher: {cls.classTeacher?.name ?? 'Not Assigned'}</div>
                                            <div className="meta">Marks: {cls._count?.marks ?? 0}</div>
                                        </div>
                                        <div className="actions">
                                            <button 
                                                onClick={() => {
                                                    window.location.href = `/admin/students/grade/${cls.className}?section=${cls.section}&classId=${cls.classId}`;
                                                }}
                                                className="btn-view-students"
                                            >
                                                📚 View Students
                                            </button>
                                            
                                            {cls.active ? (
                                                <>
                                                    <button 
                                                        onClick={() => openEdit(cls)}
                                                        className="btn-edit"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSoftDeleteClass(cls)}
                                                        className="btn-soft-delete"
                                                    >
                                                        🗑️ Soft Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => handleReactivateClass(cls)}
                                                        className="btn-reactivate"
                                                    >
                                                        🔄 Reactivate
                                                    </button>
                                                    <button 
                                                        onClick={() => handleHardDeleteClass(cls)}
                                                        className="btn-hard-delete"
                                                    >
                                                        💀 Hard Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>{editMode ? 'Edit Class' : 'Add Class'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <label>Grade</label>
                                <select 
                                    value={form.className} 
                                    onChange={handleFormChange} 
                                    name="className"
                                    required
                                >
                                    <option value="">Select Grade</option>
                                    {gradeOptions.map(grade => (
                                        <option key={grade.value} value={grade.value}>
                                            {grade.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>Section</label>
                                <select 
                                    value={form.section} 
                                    onChange={handleFormChange}
                                    name="section" 
                                    required
                                    disabled={!form.className}
                                >
                                    <option value="">
                                        {!form.className ? 'Select Grade First' : 'Select Section'}
                                    </option>
                                    {form.className && getAvailableSections().map(section => (
                                        <option 
                                            key={section} 
                                            value={section}
                                        >
                                            {section}
                                        </option>
                                    ))}
                                </select>
                                {form.className && getAvailableSections().length === 0 && (
                                    <small style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px' }}>
                                        All sections for Grade {form.className} are already created
                                    </small>
                                )}
                                {form.className && getAvailableSections().length > 0 && (
                                    <small style={{ fontSize: '11px', color: '#27ae60', marginTop: '4px' }}>
                                        {getAvailableSections().length} section(s) available for Grade {form.className}
                                    </small>
                                )}
                            </div>
                            <div className="form-row">
                                <label>Academic Year</label>
                                <select 
                                    value={form.academicYear} 
                                    onChange={handleFormChange}
                                    name="academicYear" 
                                    required
                                >
                                    <option value="">Select Academic Year</option>
                                    {academicYearOptions.map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>Class Teacher</label>
                                <select 
                                    value={form.classTeacherId} 
                                    onChange={handleFormChange}
                                    name="classTeacherId"
                                >
                                    <option value="">Select Teacher (Optional)</option>
                                    {teachers.map(teacher => (
                                        <option key={teacher.teacherId} value={teacher.teacherId}>
                                            {teacher.firstName} {teacher.lastName} - {teacher.subject || 'No Subject'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <label>Max Students</label>
                                <input 
                                    type="number" 
                                    value={form.maxStudents} 
                                    onChange={handleFormChange}
                                    name="maxStudents"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit">Save</button>
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .content-area { padding: 20px; }
                .content-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px }
                .grades-list { display:flex; flex-direction:column; gap:16px }
                .grade-block { background:#fff; padding:12px; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.06) }
                .sections { display:flex; gap:12px; flex-wrap:wrap }
                .section-card { border:1px solid #eee; padding:10px; border-radius:6px; min-width:180px; display:flex; justify-content:space-between; align-items:center }
                .meta { font-size:12px; color:#666 }
                .actions button { margin-left:6px }
                .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index: 1000; }
                .modal { background:#fff; padding:20px; border-radius:8px; width:450px; max-width:90%; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
                .modal h3 { margin-top: 0; color: #2c3e50; font-size: 1.4rem; margin-bottom: 20px; }
                .form-row { margin-bottom:15px; display:flex; flex-direction:column }
                .form-row label { font-size:13px; margin-bottom:6px; font-weight: 600; color: #2c3e50; }
                .form-row input, .form-row select { padding:10px 12px; border:2px solid #e9ecef; border-radius:6px; font-size: 14px; transition: border-color 0.3s ease; }
                .form-row input:focus, .form-row select:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
                .form-row select:disabled { background-color: #f8f9fa; color: #6c757d; cursor: not-allowed; }
                .form-row select option:disabled { color: #999 !important; font-style: italic; }
                .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top: 20px; }
                .form-actions button { padding: 10px 20px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
                .form-actions button[type="submit"] { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                .form-actions button[type="submit"]:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); }
                .form-actions button[type="button"] { background: #6c757d; color: white; }
                .form-actions button[type="button"]:hover { background: #545b62; transform: translateY(-2px); }
            `}</style>
        </div>
    );
};

export default ClassManagement;
