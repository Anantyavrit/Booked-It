import React, { createContext, useContext, useState, useEffect } from 'react';
import { theatreApi } from '../api/theatreApi.js';

const CityContext = createContext();

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('imovies_city') || '';
  });
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    theatreApi
      .getCities()
      .then((res) => {
        if (isMounted && res.success) {
          setCities(res.data || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load cities:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const changeCity = (city) => {
    setSelectedCity(city);
    if (city) {
      localStorage.setItem('imovies_city', city);
    } else {
      localStorage.removeItem('imovies_city');
    }
  };

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity: changeCity,
        cities,
        loading,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
