import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Building2, MapPin } from 'lucide-react';
import DateTabs from './DateTabs.jsx';
import ShowtimeButton from './ShowtimeButton.jsx';
import EmptyState from './EmptyState.jsx';
import { useCity } from '../context/CityContext.jsx';
import { formatToYYYYMMDD } from '../utils/format.js';

export default function ShowtimesSection({ groupedTheatres = [], loading = false }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { selectedCity } = useCity();

  // Extract distinct future dates that actually have shows across all theatres
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    groupedTheatres.forEach((group) => {
      group.shows?.forEach((show) => {
        const d = new Date(show.startTime);
        if (d >= new Date()) {
          datesSet.add(formatToYYYYMMDD(d));
        }
      });
    });
    return Array.from(datesSet).sort();
  }, [groupedTheatres]);

  const [selectedDate, setSelectedDate] = useState(() => availableDates[0] || '');

  // Synchronize initial date when data loads
  React.useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const handleShowtimeSelect = (showId) => {
    if (user) {
      navigate(`/shows/${showId}/seats`);
    } else {
      navigate('/login', { state: { from: `/shows/${showId}/seats` } });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-neutral-900 rounded-xl w-64" />
        <div className="h-32 bg-neutral-900 rounded-2xl w-full" />
      </div>
    );
  }

  if (groupedTheatres.length === 0 || availableDates.length === 0) {
    return (
      <EmptyState
        title="No showtimes available"
        description={
          selectedCity
            ? `There are no scheduled shows in ${selectedCity}. Try selecting another city.`
            : 'No upcoming shows are currently scheduled for this movie.'
        }
      />
    );
  }

  // Filter shows by selected date for each theatre
  const theatresForDate = groupedTheatres
    .map((group) => {
      const filteredShows = (group.shows || []).filter((s) => {
        return formatToYYYYMMDD(s.startTime) === selectedDate;
      });
      return { ...group, shows: filteredShows };
    })
    .filter((group) => group.shows.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <h2 className="text-xl font-bold text-neutral-100">Select Showtimes</h2>
        <DateTabs
          dates={availableDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {theatresForDate.length === 0 ? (
        <EmptyState
          title="No shows on this date"
          description="Please choose another date or city from above."
        />
      ) : (
        <div className="space-y-4">
          {theatresForDate.map((group) => (
            <div
              key={group.theatre._id}
              className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Theatre details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-500 shrink-0" />
                  <h3 className="text-base font-semibold text-neutral-100">
                    {group.theatre.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 pl-6">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {group.theatre.address}, {group.theatre.city}
                  </span>
                </div>
              </div>

              {/* Showtimes buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {group.shows.map((show) => (
                  <ShowtimeButton
                    key={show._id}
                    show={show}
                    onSelect={handleShowtimeSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
