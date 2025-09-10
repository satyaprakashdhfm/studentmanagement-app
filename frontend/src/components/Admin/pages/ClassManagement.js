import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import './ClassManagement.css';

const emptyForm = {
    classId: null,
    className: '',
    section: '',
    academicYear: '',
    maxStudents: ''
};

const ClassManagement = () => {
    const { selectedAcademicYear } = useAcademicYear();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // modal/form state
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState(emptyForm);

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

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

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
            maxStudents: cls.maxStudents || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const handleDelete = async (cls) => {
        if (!window.confirm(`Delete class ${cls.className} - ${cls.section}?`)) return;
        try {
            await apiService.deleteClass(cls.classId);
            await fetchClasses();
            alert('Class deleted');
        } catch (err) {
            console.error('Delete error', err);
            alert('Failed to delete class');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                classId: form.classId,
                className: form.className,
                section: form.section,
                academicYear: form.academicYear || selectedAcademicYear,
                maxStudents: form.maxStudents ? parseInt(form.maxStudents, 10) : null
            };

            if (editMode) {
                await apiService.updateClass(form.classId, payload);
                alert('Class updated');
            } else {
                await apiService.createClass(payload);
                alert('Class created');
            }

            setShowModal(false);
            await fetchClasses();
        } catch (err) {
            console.error('Save error', err);
            alert('Failed to save class');
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
                    {Object.entries(groups).map(([grade, clsList]) => (
                        <div key={grade} className="grade-block">
                            <h3>Grade {grade}</h3>
                            <div className="sections">
                                {clsList.map(cls => (
                                    <div key={cls.classId} className="section-card">
                                        <div className="section-info">
                                            <strong>Section {cls.section}</strong>
                                            <div className="meta">Students: {cls._count?.students ?? '-'}</div>
                                            <div className="meta">Teacher: {cls.classTeacher?.name ?? '—'}</div>
                                        </div>
                                        <div className="actions">
                                            <button onClick={() => openEdit(cls)}>Edit</button>
                                            <button onClick={() => handleDelete(cls)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>{editMode ? 'Edit Class' : 'Add Class'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <label>Grade (className)</label>
                                <input value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))} required />
                            </div>
                            <div className="form-row">
                                <label>Section</label>
                                <input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} required />
                            </div>
                            <div className="form-row">
                                <label>Academic Year</label>
                                <input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} required />
                            </div>
                            <div className="form-row">
                                <label>Max Students</label>
                                <input type="number" value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))} />
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
                .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center }
                .modal { background:#fff; padding:20px; border-radius:6px; width:420px; max-width:90% }
                .form-row { margin-bottom:10px; display:flex; flex-direction:column }
                .form-row label { font-size:13px; margin-bottom:6px }
                .form-row input { padding:8px; border:1px solid #ccc; border-radius:4px }
                .form-actions { display:flex; gap:8px; justify-content:flex-end }
            `}</style>
        </div>
    );
};

export default ClassManagement;
