import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { theatreApi } from '../api/theatreApi.js';

const CityContext = createContext();

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('imovies_city') || '';
  });
  const [rawCities, setRawCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    theatreApi
      .getCities()
      .then((res) => {
        if (isMounted && res.success) {
          setRawCities(res.data || []);
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
    const value = typeof city === 'string' ? city.trim() : (city?.city || '');
    setSelectedCity(value);
    if (value) {
      localStorage.setItem('imovies_city', value);
    } else {
      localStorage.removeItem('imovies_city');
    }
  };

  // Normalized arrays
  const { popularCities, otherCities, cityNames } = useMemo(() => {
    const popular = [];
    const others = [];
    const names = [];

    rawCities.forEach((item) => {
      const cityObj = typeof item === 'string'
        ? { city: item, state: '', theatreCount: 1, isPopular: false }
        : item;

      names.push(cityObj.city);
      if (cityObj.isPopular) {
        popular.push(cityObj);
      } else {
        others.push(cityObj);
      }
    });

    return { popularCities: popular, otherCities: others, cityNames: names };
  }, [rawCities]);

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity: changeCity,
        clearCity: () => changeCity(''),
        cities: cityNames,
        popularCities,
        otherCities,
        rawCities,
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
