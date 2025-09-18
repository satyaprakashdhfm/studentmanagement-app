import React, { useState } from 'react';
import apiService from '../../../services/api';

const ComprehensiveAcademicYearForm = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    academicYear: {
      academicYearId: '',
      academicYearDisplay: '',
      startDate: '',
      endDate: '',
      status: 'UPCOMING',
      isCurrent: false,
      termStructure: {
        terms: [
          { name: 'Term 1', startDate: '', endDate: '' },
          { name: 'Term 2', startDate: '', endDate: '' },
          { name: 'Term 3', startDate: '', endDate: '' }
        ]
      }
    },
    classes: [],
    subjects: [],
    syllabus: [],
    holidays: [],
    examSchedule: []
  });

  const grades = [1,2,3,4,5,6,7,8,9,10,11,12];
  const sections = ['A','B','C','D'];

  const subjectsByGrade = {
    1: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art', 'Physical Education'],
    2: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art', 'Physical Education'],
    3: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art', 'Physical Education'],
    4: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art', 'Physical Education'],
    5: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Art', 'Physical Education'],
    6: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit', 'Art', 'Physical Education'],
    7: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit', 'Computer Science', 'Art', 'Physical Education'],
    8: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit', 'Computer Science', 'Art', 'Physical Education'],
    9: ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit', 'Computer Science', 'Art', 'Physical Education'],
    10:['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Sanskrit', 'Computer Science', 'Art', 'Physical Education'],
    11:['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Business Studies', 'Accountancy'],
    12:['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Business Studies', 'Accountancy']
  };

  const generateClassId = (grade, section, yearId) => `${yearId}${grade.toString().padStart(2,'0')}${section}`;

  const generateSubjectCode = (subject, grade, yearId) => {
    const subjectAbbr = subject.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    return `${yearId}_${subjectAbbr}_G${grade}`;
  };

  const setAY = (patch) => setFormData(prev => ({ ...prev, academicYear: { ...prev.academicYear, ...patch } }));

  const handleAcademicYearChange = (field, value) => {
    setAY({ [field]: value });

    if (field === 'startDate' && value) {
      const startYear = new Date(value).getFullYear();
      const endYear = startYear + 1;
      const yearId = `${startYear.toString().slice(-2)}${endYear.toString().slice(-2)}`;
      const display = `${startYear}-${endYear}`;
      setAY({ academicYearId: yearId, academicYearDisplay: display, endDate: `${endYear}-03-31` });
    }
  };

  const handleClassSelection = (grade, selectedSections) => {
    const yearId = formData.academicYear.academicYearId;
    const newClasses = selectedSections.map(section => ({
      classId: generateClassId(grade, section, yearId),
      className: `Grade ${grade}`,
      sectionName: section,
      grade,
      maxStudents: 40,
      roomAssignment: `Room ${grade}${section}`
    }));

    setFormData(prev => ({
      ...prev,
      classes: [
        ...prev.classes.filter(c => c.grade !== grade),
        ...newClasses
      ]
    }));
  };

  const handleSubjectSelection = (grade, selectedSubjects) => {
    const yearId = formData.academicYear.academicYearId;
    const newSubjects = selectedSubjects.map(subject => ({
      subjectCode: generateSubjectCode(subject, grade, yearId),
      subjectName: subject,
      gradeLevel: grade.toString(),
      maxMarksPerExam: 100
    }));

    setFormData(prev => ({
      ...prev,
      subjects: [
        ...prev.subjects.filter(s => parseInt(s.gradeLevel,10) !== grade),
        ...newSubjects
      ]
    }));

    // Auto-generate syllabus entries per selected class of the grade
    const classesForGrade = formData.classes.filter(c => c.grade === grade);
    const syllabusEntries = [];
    selectedSubjects.forEach(subject => {
      classesForGrade.forEach(classData => {
        const subjectCode = generateSubjectCode(subject, grade, yearId);
        const units = [
          'Introduction and Fundamentals',
          'Core Concepts',
          'Advanced Topics',
          'Practical Applications',
          'Review and Assessment'
        ];
        units.forEach((unit, idx) => {
          syllabusEntries.push({
            syllabusId: `${subjectCode}_${classData.classId}_U${idx+1}`,
            subjectCode,
            classId: classData.classId,
            unitName: unit,
            unitOrder: idx+1,
            subTopics: [`${unit} - Topic 1`, `${unit} - Topic 2`, `${unit} - Topic 3`]
          });
        });
      });
    });

    setFormData(prev => ({
      ...prev,
      syllabus: [
        // remove all existing syllabus for this grade's classes (by class prefix match)
        ...prev.syllabus.filter(syl => !classesForGrade.some(c => syl.classId === c.classId)),
        ...syllabusEntries
      ]
    }));
  };

  const addHoliday = () => setFormData(prev => ({ ...prev, holidays: [...prev.holidays, { name: '', date: '', type: 'school' }] }));

  const updateHoliday = (index, field, value) => setFormData(prev => ({
    ...prev,
    holidays: prev.holidays.map((h, i) => i === index ? { ...h, [field]: value } : h)
  }));

  const removeHoliday = (index) => setFormData(prev => ({
    ...prev,
    holidays: prev.holidays.filter((_, i) => i !== index)
  }));

  const validateStep = () => {
    const e = {};
    if (currentStep === 1) {
      if (!formData.academicYear.startDate) e.startDate = 'Start date required';
      if (!formData.academicYear.endDate) e.endDate = 'End date required';
      if (!formData.academicYear.academicYearId) e.academicYearId = 'Year ID not generated';
      if (!formData.academicYear.academicYearDisplay) e.academicYearDisplay = 'Display not generated';
    }
    if (currentStep === 2) {
      if (formData.classes.length === 0) e.classes = 'Select at least one class & section';
    }
    if (currentStep === 3) {
      if (formData.subjects.length === 0) e.subjects = 'Select subjects for at least one grade';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = { ...formData };
      const result = await apiService.createComprehensiveAcademicYear(payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      console.error('Error creating academic year:', err);
      alert('Error creating academic year. Please check inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const next = () => { if (validateStep()) setCurrentStep(s => Math.min(5, s+1)); };
  const prev = () => setCurrentStep(s => Math.max(1, s-1));

  return (
    <div className="comprehensive-form-overlay">
      <div className="comprehensive-form-container">
        <div className="form-header">
          <h2>Comprehensive Academic Year Setup</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="progress-bar">
          {[1,2,3,4,5].map(step => (
            <div key={step} className={`progress-step ${currentStep >= step ? 'active': ''}`}>{step}</div>
          ))}
        </div>

        <div className="form-content">
          {currentStep === 1 && (
            <div className="step-content">
              <h3>Academic Year Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={formData.academicYear.startDate} onChange={(e)=>handleAcademicYearChange('startDate', e.target.value)} />
                  {errors.startDate && <small className="error">{errors.startDate}</small>}
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={formData.academicYear.endDate} onChange={(e)=>handleAcademicYearChange('endDate', e.target.value)} />
                  {errors.endDate && <small className="error">{errors.endDate}</small>}
                </div>
                <div className="form-group">
                  <label>Academic Year ID</label>
                  <input type="text" readOnly placeholder="Auto-generated" value={formData.academicYear.academicYearId} />
                  {errors.academicYearId && <small className="error">{errors.academicYearId}</small>}
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input type="text" readOnly placeholder="Auto-generated" value={formData.academicYear.academicYearDisplay} />
                  {errors.academicYearDisplay && <small className="error">{errors.academicYearDisplay}</small>}
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.academicYear.status} onChange={(e)=>handleAcademicYearChange('status', e.target.value)}>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div className="form-group checkbox-group">
                  <label className="checkbox">
                    <input type="checkbox" checked={formData.academicYear.isCurrent} onChange={(e)=>handleAcademicYearChange('isCurrent', e.target.checked)} />
                    Set as Current Academic Year
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <h3>Classes & Sections</h3>
              <div className="classes-grid">
                {grades.map(grade => {
                  const selectedForGrade = formData.classes.filter(c => c.grade === grade).map(c => c.sectionName);
                  return (
                    <div className="grade-section" key={grade}>
                      <h4>Grade {grade}</h4>
                      <div className="sections-checkboxes">
                        {sections.map(section => (
                          <label key={section}>
                            <input type="checkbox"
                                   checked={selectedForGrade.includes(section)}
                                   onChange={(e)=>{
                                     const newSections = e.target.checked
                                       ? [...selectedForGrade, section]
                                       : selectedForGrade.filter(s => s !== section);
                                     handleClassSelection(grade, newSections);
                                   }} />
                            Section {section}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="selected-classes">
                <h4>Selected Classes: {formData.classes.length}</h4>
                <div className="class-chips">
                  {formData.classes.map(cls => (
                    <span key={cls.classId} className="class-chip">{cls.className} - {cls.sectionName}</span>
                  ))}
                </div>
              </div>
              {errors.classes && <small className="error">{errors.classes}</small>}
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <h3>Subjects by Grade</h3>
              <div className="subjects-grid">
                {grades.map(grade => {
                  const currentSubjects = formData.subjects.filter(s => parseInt(s.gradeLevel,10) === grade).map(s => s.subjectName);
                  return (
                    <div className="grade-subjects" key={grade}>
                      <h4>Grade {grade} Subjects</h4>
                      <div className="subjects-checkboxes">
                        {(subjectsByGrade[grade] || []).map(subject => (
                          <label key={subject}>
                            <input type="checkbox"
                                   checked={currentSubjects.includes(subject)}
                                   onChange={(e)=>{
                                     const newSubs = e.target.checked
                                       ? [...currentSubjects, subject]
                                       : currentSubjects.filter(s => s !== subject);
                                     handleSubjectSelection(grade, newSubs);
                                   }} />
                            {subject}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="selected-subjects">
                <h4>Total Subjects: {formData.subjects.length}</h4>
                <h4>Syllabus Units: {formData.syllabus.length}</h4>
              </div>
              {errors.subjects && <small className="error">{errors.subjects}</small>}
            </div>
          )}

          {currentStep === 4 && (
            <div className="step-content">
              <h3>Holidays & Events</h3>
              <button className="add-holiday-btn" onClick={addHoliday}>+ Add Holiday</button>
              <div className="holidays-list">
                {formData.holidays.map((h, idx) => (
                  <div className="holiday-item" key={idx}>
                    <input type="text" placeholder="Holiday Name" value={h.name} onChange={(e)=>updateHoliday(idx,'name', e.target.value)} />
                    <input type="date" value={h.date} onChange={(e)=>updateHoliday(idx,'date', e.target.value)} />
                    <select value={h.type} onChange={(e)=>updateHoliday(idx,'type', e.target.value)}>
                      <option value="national">National</option>
                      <option value="religious">Religious</option>
                      <option value="school">School Event</option>
                    </select>
                    <button className="remove-btn" onClick={()=>removeHoliday(idx)}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="step-content">
              <h3>Review & Submit</h3>
              <div className="review-summary">
                <div className="summary-card">
                  <h4>Academic Year</h4>
                  <p>{formData.academicYear.academicYearDisplay || '—'}</p>
                  <p>Status: {formData.academicYear.status}</p>
                </div>
                <div className="summary-card">
                  <h4>Classes</h4>
                  <p>{formData.classes.length} classes</p>
                </div>
                <div className="summary-card">
                  <h4>Subjects</h4>
                  <p>{formData.subjects.length} subjects</p>
                </div>
                <div className="summary-card">
                  <h4>Syllabus</h4>
                  <p>{formData.syllabus.length} units</p>
                </div>
                <div className="summary-card">
                  <h4>Holidays</h4>
                  <p>{formData.holidays.length} holidays</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          {currentStep > 1 && (
            <button className="btn btn-secondary" onClick={prev}>← Previous</button>
          )}
          {currentStep < 5 ? (
            <button className="btn btn-primary" onClick={next}>Next →</button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating…' : 'Create Academic Year'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .comprehensive-form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .comprehensive-form-container { background: #fff; border-radius: 14px; width: 92%; max-width: 1000px; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .form-header { background: linear-gradient(135deg,#34495e,#2c3e50); color: #fff; padding: 16px 20px; display:flex; align-items:center; justify-content:space-between; border-radius:14px 14px 0 0; }
        .close-btn { border: none; background: transparent; color: #fff; font-size: 20px; cursor: pointer; }
        .progress-bar { display:flex; justify-content:center; gap: 10px; padding: 16px; background:#f6f7f9; border-bottom:1px solid #e9ecef; }
        .progress-step { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#e9ecef; font-weight:600; }
        .progress-step.active { background:#3498db; color:#fff; }
        .form-content { padding: 20px; }
        .step-content h3 { margin: 0 0 12px 0; color:#2c3e50; }
        .form-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
        .form-group { display:flex; flex-direction:column; }
        .form-group input, .form-group select { padding:10px; border:1.5px solid #e0e0e0; border-radius:8px; font-size:14px; }
        .form-group input:focus, .form-group select:focus { outline:none; border-color:#3498db; }
        .checkbox-group .checkbox { display:flex; align-items:center; gap:10px; margin-top: 8px; }
        .classes-grid, .subjects-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap:14px; }
        .grade-section, .grade-subjects { background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; padding:10px 12px; }
        .sections-checkboxes, .subjects-checkboxes { display:flex; flex-wrap:wrap; gap:8px; }
        .sections-checkboxes label, .subjects-checkboxes label { padding:6px 10px; border:1px solid #e0e0e0; border-radius:6px; cursor:pointer; background:#fff; }
        .selected-classes, .selected-subjects { background:#eef9f1; border:1px solid #d8f3dd; border-radius:8px; padding:10px 12px; margin-top:12px; }
        .class-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
        .class-chip { background:#27ae60; color:#fff; padding:4px 8px; border-radius:999px; font-size:12px; }
        .add-holiday-btn { border:none; background:#3498db; color:#fff; padding:8px 12px; border-radius:6px; cursor:pointer; margin-bottom:10px; }
        .holidays-list { display:flex; flex-direction:column; gap:10px; }
        .holiday-item { display:grid; grid-template-columns: 1fr 180px 160px 40px; gap:8px; align-items:center; }
        .remove-btn { border:none; background:#e74c3c; color:#fff; border-radius:6px; cursor:pointer; padding:6px; }
        .review-summary { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:12px; }
        .summary-card { background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; padding:12px; }
        .form-actions { display:flex; justify-content:flex-end; gap:10px; padding:14px 16px; border-top:1px solid #e9ecef; background:#f6f7f9; border-radius:0 0 14px 14px; }
        .btn { padding:8px 14px; border:none; border-radius:8px; cursor:pointer; font-weight:600; }
        .btn-secondary { background:#95a5a6; color:#fff; }
        .btn-primary { background:#3498db; color:#fff; }
        .btn-success { background:#27ae60; color:#fff; }
        .error { color:#e74c3c; font-size:12px; margin-top:4px; display:block; }
      `}</style>
    </div>
  );
};

export default ComprehensiveAcademicYearForm;
