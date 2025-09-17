import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/api';
import { useAcademicYear } from '../../../context/AcademicYearContext';

/**
 * StudentClassMarks
 * Shows aggregated marks for all students in a class with an exam type filter.
 * Route: /admin/students/grade/:grade/class/:classId/marks
 */
const StudentClassMarks = () => {
  const { classId, grade } = useParams();
  const navigate = useNavigate();
  const { classes, selectedAcademicYear } = useAcademicYear();

  const [selectedClass, setSelectedClass] = useState(null);
  const [examType, setExamType] = useState(''); // '' => all
  const [marks, setMarks] = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  // Resolve class from context
  useEffect(() => {
    if (!classId) return;
    const cls = classes.find(c => c.classId === parseInt(classId));
    if (cls) setSelectedClass(cls);
  }, [classId, classes]);

  // Fetch marks whenever classId or examType changes
  useEffect(() => {
    const fetchMarks = async () => {
      if (!classId) return;
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ classId });
        if (examType) params.append('examinationType', examType);
        // High limit to fetch all class marks; backend disables pagination for classId queries
        params.append('limit', '1000');
        
        const endpoint = `marks?${params.toString()}`;
        console.log('🔍 Fetching marks from endpoint:', endpoint);
        
        const resp = await apiService.get(endpoint);
        if (resp.marks) {
          setMarks(resp.marks);
          
          // Extract unique exam types from the fetched marks
          const uniqueExamTypes = [...new Set(resp.marks.map(mark => mark.examinationType).filter(Boolean))];
          setAvailableExamTypes(uniqueExamTypes.sort());
        } else {
          setError(resp.message || 'Failed to load marks');
        }
      } catch (err) {
        console.error('Marks fetch error', err);
        setError(err.data?.error || err.message || 'Failed to load marks');
      } finally {
        setLoading(false);
      }
    };
    fetchMarks();
  }, [classId, examType]);

  // Aggregate marks per student
  const studentAggregates = useMemo(() => {
    const map = new Map();
    marks.forEach(record => {
      const sid = record.studentId;
      if (!map.has(sid)) {
        map.set(sid, {
          studentId: sid,
            name: record.student?.name || 'Unknown',
            records: [],
            totalObtained: 0,
            totalMax: 0
        });
      }
      const agg = map.get(sid);
      agg.records.push(record);
      const obtained = Number(record.marksObtained) || 0;
      const max = Number(record.maxMarks) || 100; // fallback
      agg.totalObtained += obtained;
      agg.totalMax += max;
    });
    return Array.from(map.values()).sort((a,b) => {
      // Sort by studentId in descending order (highest first)
      return b.studentId.localeCompare(a.studentId, undefined, { numeric: true });
    });
  }, [marks]);

  const toggleExpand = (studentId) => {
    setExpanded(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleBackToGrade = () => {
    navigate(`/admin/students/grade/${grade}`);
  };

  const handleResetFilters = () => {
    setExamType('');
  };

  return (
    <div className="content-card">
      <div className="class-management-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleBackToGrade}>← Back</button>
          <h2 style={{ margin: 0 }}>Grade {grade} - {selectedClass ? `${selectedClass.className} ${selectedClass.section}` : 'Class'} Marks</h2>
        </div>
        <div className="academic-year-info">Academic Year: {selectedAcademicYear}</div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '15px' }}>
        <div className="form-group" style={{ minWidth: '200px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Exam Type</label>
          <select value={examType} onChange={e => setExamType(e.target.value)} style={{ width: '100%' }}>
            <option value="">All Types</option>
            {availableExamTypes.map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ visibility: 'hidden' }}>Reset</label>
          <button className="btn btn-light btn-sm" onClick={handleResetFilters}>Reset</button>
        </div>
        {loading && <div style={{ fontStyle: 'italic' }}>Loading...</div>}
        {error && <div style={{ color: '#e74c3c' }}>{error}</div>}
      </div>

      {/* Aggregated Table */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Student</th>
              <th>Total Obtained</th>
              <th>Total Max</th>
              <th>Percentage</th>
              <th>Subjects Count</th>
            </tr>
          </thead>
          <tbody>
            {studentAggregates.map((s, idx) => {
              const percent = s.totalMax > 0 ? ((s.totalObtained / s.totalMax) * 100).toFixed(1) : '0.0';
              const isOpen = !!expanded[s.studentId];
              return (
                <React.Fragment key={s.studentId}>
                  <tr className="student-row" onClick={() => toggleExpand(s.studentId)} style={{ cursor: 'pointer' }}>
                    <td>{isOpen ? '▼' : '▶'}</td>
                    <td><strong>{s.name}</strong><div style={{ fontSize: '0.75em', color: '#7f8c8d' }}>{s.studentId}</div></td>
                    <td>{s.totalObtained}</td>
                    <td>{s.totalMax}</td>
                    <td>{percent}%</td>
                    <td>{s.records.length}</td>
                  </tr>
                  {isOpen && s.records.map(r => (
                    <tr key={r.marksId} className="detail-row" style={{ backgroundColor: '#fafafa' }}>
                      <td></td>
                      <td colSpan={2}><strong>{r.subject?.subjectName || r.subjectCode}</strong><div style={{ fontSize: '0.7em', color: '#7f8c8d' }}>{r.subjectCode}</div></td>
                      <td>{r.marksObtained}/{r.maxMarks || 100}</td>
                      <td>{r.examinationType}</td>
                      <td>{new Date(r.entryDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {!loading && studentAggregates.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#7f8c8d' }}>No marks found for this class {examType && `(${examType})`}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .data-table thead th { background: #2c3e50; color: #ecf0f1; text-align: left; }
        .student-row:hover { background: #f0f6fb; }
        .detail-row td { font-size: 0.85em; }
        .academic-year-info { background-color: #3498db; color: white; padding: 6px 12px; border-radius: 4px; font-size: 0.85em; }
      `}</style>
    </div>
  );
};

export default StudentClassMarks;
