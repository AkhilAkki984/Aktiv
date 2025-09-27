// Reverse geocoding utility using Nominatim (OpenStreetMap)
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch location data');
    }
    
    const data = await response.json();
    
    if (!data || !data.address) {
      throw new Error('No location data found');
    }
    
    const { address } = data;
    
    return {
      country: address.country || '',
      state: address.state || address.region || address.province || '',
      city: address.city || address.town || address.village || address.municipality || '',
      area: address.suburb || address.neighbourhood || address.locality || address.quarter || '',
      postalCode: address.postcode || ''
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

// Get current location and reverse geocode it
export const getCurrentLocationWithAddress = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const addressData = await reverseGeocode(latitude, longitude);
          resolve({
            coordinates: { latitude, longitude },
            address: addressData
          });
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      }
    );
  });
};
