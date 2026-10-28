import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Building2, MapPin, Sparkles } from 'lucide-react';
import DateTabs from './DateTabs.jsx';
import ShowtimeButton from './ShowtimeButton.jsx';
import EmptyState from './EmptyState.jsx';
import { useCity } from '../context/CityContext.jsx';
import { formatToYYYYMMDD } from '../utils/format.js';

const STANDARD_AMENITIES = ['Dolby Atmos', '4K Projection', 'Recliner Seats', 'F&B'];

export default function ShowtimesSection({ groupedTheatres = [], loading = false }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { selectedCity, setSelectedCity } = useCity();

  // Extract distinct future dates that actually have shows
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    const now = new Date();
    groupedTheatres.forEach((group) => {
      group.shows?.forEach((show) => {
        const d = new Date(show.startTime);
        if (d >= now) {
          datesSet.add(formatToYYYYMMDD(d));
        }
      });
    });
    return Array.from(datesSet).sort();
  }, [groupedTheatres]);

  const [selectedDate, setSelectedDate] = useState(() => availableDates[0] || '');

  // Synchronize initial date when data loads
  useEffect(() => {
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
        <div className="h-12 bg-[#18181c] border border-[#2a2a30] rounded-lg w-72" />
        <div className="h-40 bg-[#18181c] border border-[#2a2a30] rounded-lg w-full" />
        <div className="h-40 bg-[#18181c] border border-[#2a2a30] rounded-lg w-full" />
      </div>
    );
  }

  if (groupedTheatres.length === 0 || availableDates.length === 0) {
    return (
      <EmptyState
        title="No showtimes available"
        description={
          selectedCity
            ? `There are no scheduled shows for this movie in ${selectedCity}. Try viewing all cities or checking upcoming releases.`
            : 'No upcoming shows are currently scheduled for this movie.'
        }
        action={
          selectedCity && (
            <button
              type="button"
              onClick={() => setSelectedCity('')}
              className="px-4 py-2 rounded-md bg-[#e50914] hover:bg-[#c80812] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              View in All Cities
            </button>
          )
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
      {/* Date Strip Across the Top & Availability Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2a30] pb-4">
        <div>
          <h2 className="font-['Outfit'] text-xl font-bold text-[#f4f4f6]">
            Select Showtimes
          </h2>
          <p className="text-xs text-[#92929e] mt-0.5">
            {selectedCity ? `Cinemas in ${selectedCity}` : 'All participating theatres'}
          </p>
        </div>

        {/* Date Strip */}
        <div className="overflow-x-auto no-scrollbar">
          <DateTabs
            dates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>

      {/* Availability Status Legend */}
      <div className="flex items-center gap-4 text-xs text-[#92929e] pt-1">
        <span className="font-medium text-[#f4f4f6]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Filling Fast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Almost Full</span>
        </div>
      </div>

      {/* Grouped Theatres List */}
      {theatresForDate.length === 0 ? (
        <EmptyState
          title="No shows on this date"
          description="Please choose another date from the strip above."
        />
      ) : (
        <div className="space-y-4">
          {theatresForDate.map((group) => {
            const cleanAddress = (group.theatre.address || '')
              .replace('(Sample Address)', '')
              .trim();
            const amenities = group.theatre.amenities?.length > 0
              ? group.theatre.amenities
              : STANDARD_AMENITIES;

            return (
              <div
                key={group.theatre._id}
                className="p-5 rounded-lg bg-[#18181c] border border-[#2a2a30] flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Theatre details (Name, Area/Locality, Amenities) */}
                <div className="space-y-2 lg:max-w-md">
                  <div>
                    <h3 className="font-['Outfit'] text-base font-bold text-[#f4f4f6]">
                      {group.theatre.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#92929e] mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                      <span className="truncate">
                        {cleanAddress || group.theatre.city}
                      </span>
                    </div>
                  </div>

                  {/* Amenities Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a30] text-[10px] font-medium text-[#92929e]"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Showtimes Buttons Grid */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {group.shows.map((show) => (
                    <ShowtimeButton
                      key={show._id}
                      show={show}
                      onSelect={handleShowtimeSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
