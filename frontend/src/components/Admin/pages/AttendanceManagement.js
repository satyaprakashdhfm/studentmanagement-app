import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const AttendanceManagement = () => {
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const response = await apiService.getAttendance();
                if (response.attendance) {
                    setAttendanceRecords(response.attendance);
                } else {
                    setError(response.message || 'Failed to fetch attendance records');
                }
            } catch (error) {
                console.error('Error fetching attendance:', error);
                const msg = error.message || String(error);
                if (msg.includes('Access token') || msg.includes('token') || msg.includes('401')) {
                    setError('Not authenticated. Please login as admin to view attendance records.');
                } else {
                    setError('Failed to load attendance records');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, []);

    return (
        <div>
            <h1>Attendance Management</h1>
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            <ul>
                {attendanceRecords.map(record => (
                    <li key={record.attendanceId}>Student ID: {record.studentId}, Status: {record.status}</li>
                ))}
            </ul>
        </div>
    );
};

export default AttendanceManagement;
