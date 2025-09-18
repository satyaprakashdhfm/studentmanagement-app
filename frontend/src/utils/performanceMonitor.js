// Frontend Performance & Memory Monitor
class PerformanceMonitor {
  constructor() {
    this.apiCallCount = 0;
    this.componentRenderCount = 0;
    this.memoryWarningShown = false;
    
    // Monitor every 30 seconds
    this.monitorInterval = setInterval(() => {
      this.checkPerformance();
    }, 30000);
    
    console.log('📊 Performance Monitor initialized');
  }

  // Track API calls
  trackApiCall() {
    this.apiCallCount++;
    
    // Warn if too many API calls
    if (this.apiCallCount > 1000 && this.apiCallCount % 100 === 0) {
      console.warn(`⚠️ High API usage: ${this.apiCallCount} calls`);
    }
  }

  // Track component renders
  trackRender() {
    this.componentRenderCount++;
  }

  // Check overall performance
  checkPerformance() {
    // Check memory usage (if available)
    if (performance.memory) {
      const memUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      const memLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
      
      console.log(`📊 Frontend Memory: ${memUsed}MB / ${memLimit}MB | API Calls: ${this.apiCallCount} | Renders: ${this.componentRenderCount}`);
      
      // Warn if memory usage is high
      if (memUsed > memLimit * 0.8 && !this.memoryWarningShown) {
        console.warn(`⚠️ HIGH MEMORY USAGE: ${memUsed}MB (${Math.round(memUsed/memLimit*100)}%)`);
        console.warn('💡 Consider refreshing the page to free memory');
        this.memoryWarningShown = true;
        
        // Show user warning
        if (window.confirm('High memory usage detected. Refresh page to improve performance?')) {
          window.location.reload();
        }
      }
    }
    
    // Reset counters periodically
    if (this.apiCallCount > 5000) {
      console.log('🔄 Resetting performance counters');
      this.apiCallCount = 0;
      this.componentRenderCount = 0;
      this.memoryWarningShown = false;
    }
  }

  // Cleanup
  cleanup() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.cleanup();
});

export default performanceMonitor;
