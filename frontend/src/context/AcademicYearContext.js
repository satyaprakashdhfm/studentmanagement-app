import React, { createContext, useContext, useState } from 'react';

const AcademicYearContext = createContext();

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};

export const AcademicYearProvider = ({ children }) => {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-2025');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  const value = {
    selectedAcademicYear,
    setSelectedAcademicYear,
    classes,
    setClasses,
    loading,
    setLoading
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export default AcademicYearContext;
