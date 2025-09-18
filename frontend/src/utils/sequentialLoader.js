// Sequential API Loader - Prevents concurrent API overload
class SequentialLoader {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.activeRequests = new Set();
  }

  // Add API call to queue
  async enqueue(apiCall, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const request = {
        apiCall,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Add to queue based on priority
      if (priority === 'high') {
        this.queue.unshift(request);
      } else {
        this.queue.push(request);
      }

      console.log(`📋 Queued API call (${priority} priority). Queue size: ${this.queue.length}`);
      
      // Start processing if not already running
      this.processQueue();
    });
  }

  // Process queue sequentially
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing API queue (${this.queue.length} items)`);

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      
      try {
        console.log(`⚡ Executing API call...`);
        const result = await request.apiCall();
        request.resolve(result);
        
        // Small delay between requests to prevent overload
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ API call failed:`, error);
        request.reject(error);
      }
    }

    this.isProcessing = false;
    console.log(`✅ Queue processing complete`);
  }

  // Get queue status
  getStatus() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      activeRequests: this.activeRequests.size
    };
  }

  // Clear queue (emergency)
  clearQueue() {
    console.log(`🧹 Clearing API queue (${this.queue.length} items)`);
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.isProcessing = false;
  }
}

// Create singleton instance
const sequentialLoader = new SequentialLoader();

// Helper function to wrap API calls
export const queueApiCall = (apiCall, priority = 'normal') => {
  return sequentialLoader.enqueue(apiCall, priority);
};

// Helper function to get status
export const getLoaderStatus = () => {
  return sequentialLoader.getStatus();
};

// Helper function to clear queue
export const clearApiQueue = () => {
  sequentialLoader.clearQueue();
};

export default sequentialLoader;
