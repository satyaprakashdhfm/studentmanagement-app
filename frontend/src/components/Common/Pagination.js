import React from 'react';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalRecords, 
  onPageChange, 
  recordsPerPage = 50,
  className = '' 
}) => {
  if (!totalPages || totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination for large page counts
      if (currentPage <= 4) {
        // Near beginning: 1 2 3 4 5 ... last
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near end: 1 ... last-4 last-3 last-2 last-1 last
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // In middle: 1 ... current-1 current current+1 ... last
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && page !== '...' && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const pageNumbers = getPageNumbers();
  const startRecord = ((currentPage - 1) * recordsPerPage) + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className={`pagination-container ${className}`}>
      <div className="pagination-info">
        <span>
          Showing {startRecord}-{endRecord} of {totalRecords} records
        </span>
      </div>
      
      <div className="pagination-controls">
        {/* First Page */}
        <button 
          className="pagination-btn"
          onClick={() => handlePageClick(1)}
          disabled={currentPage === 1}
          title="First Page"
        >
          ⏮️
        </button>
        
        {/* Previous Page */}
        <button 
          className="pagination-btn"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous Page"
        >
          ⏪
        </button>
        
        {/* Page Numbers */}
        {pageNumbers.map((page, index) => (
          <button
            key={index}
            className={`pagination-btn ${
              page === currentPage ? 'active' : ''
            } ${page === '...' ? 'ellipsis' : ''}`}
            onClick={() => handlePageClick(page)}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}
        
        {/* Next Page */}
        <button 
          className="pagination-btn"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next Page"
        >
          ⏩
        </button>
        
        {/* Last Page */}
        <button 
          className="pagination-btn"
          onClick={() => handlePageClick(totalPages)}
          disabled={currentPage === totalPages}
          title="Last Page"
        >
          ⏭️
        </button>
      </div>
    </div>
  );
};

export default Pagination;