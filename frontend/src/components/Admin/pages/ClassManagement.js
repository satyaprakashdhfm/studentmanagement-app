import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await apiService.getClasses();
                if (response.classes) {
                    setClasses(response.classes);
                } else {
                    setError(response.message || 'Failed to fetch classes');
                }
            } catch (error) {
                console.error('Error fetching classes:', error);
                const msg = error.message || String(error);
                if (msg.includes('Access token') || msg.includes('token') || msg.includes('401')) {
                    setError('Not authenticated. Please login as admin to view classes.');
                } else {
                    setError('Failed to load classes');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    return (
        <div>
            <h1>Class Management</h1>
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            <ul>
                {classes.map(cls => (
                    <li key={cls.classId}>{cls.className} - {cls.section}</li>
                ))}
            </ul>
        </div>
    );
};

export default ClassManagement;
