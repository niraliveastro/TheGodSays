import axios from 'axios';

// Your working API key
const NASA_API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_NASA_API_BASE_URL;

export class NASAAPIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'NASAAPIError';
    this.status = status;
  }
}

export const nasaAPI = {
  async getNEOData(startDate, endDate) {
    try {
      const url = `${BASE_URL}/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
      const response = await axios.get(url);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        throw new NASAAPIError(`API request failed: ${message} (${status})`, status);
      }
      throw new NASAAPIError(`Failed to fetch NEO data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getNEODetails(neoId) {
    try {
      const url = `${BASE_URL}/neo/${neoId}?api_key=${NASA_API_KEY}`;
      
      const response = await axios.get(url);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        throw new NASAAPIError(`API request failed: ${message} (${status})`, status);
      }
      throw new NASAAPIError(`Failed to fetch NEO details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Helper function to calculate average diameter
  calculateAverageDiameter(neo) {
    const { estimated_diameter_min, estimated_diameter_max } = neo.estimated_diameter.kilometers
    return (estimated_diameter_min + estimated_diameter_max) / 2
  },

  // Helper function to format date
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  },

  // Helper function to get next date range
  getNextDateRange(currentEndDate, daysToAdd = 7) {
    const endDate = new Date(currentEndDate)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() + 1)
    
    const newEndDate = new Date(startDate)
    newEndDate.setDate(newEndDate.getDate() + daysToAdd - 1)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0]
    }
  },

  // Get current week date range
  getCurrentWeekRange() {
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 5) // 6 days total (today + 5)
    
    return {
      startDate,
      endDate: endDate.toISOString().split('T')[0]
    }
  }
}

// Export for backward compatibility
export default nasaAPI
