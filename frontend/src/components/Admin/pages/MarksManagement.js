import React, { useState, useEffect } from 'react';
import apiService from '../../../services/api';

const MarksManagement = () => {
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMarks = async () => {
            try {
                const response = await apiService.getMarks();
                if (response.marks) {
                    setMarks(response.marks);
                } else {
                    setError(response.message || 'Failed to fetch marks');
                }
            } catch (error) {
                console.error('Error fetching marks:', error);
                const msg = error.message || String(error);
                if (msg.includes('Access token') || msg.includes('token') || msg.includes('401')) {
                    setError('Not authenticated. Please login as admin to view marks.');
                } else {
                    setError('Failed to load marks');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchMarks();
    }, []);

    return (
        <div>
            <h1>Marks Management</h1>
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            <ul>
                {marks.map(mark => (
                    <li key={mark.marksId}>Student ID: {mark.studentId}, Marks: {mark.marksObtained}/{mark.maxMarks}</li>
                ))}
            </ul>
        </div>
    );
};

export default MarksManagement;
