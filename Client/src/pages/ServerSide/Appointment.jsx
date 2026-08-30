import React, { useState } from "react";

const SERVICES = [
  { id: "grooming", name: "Grooming", color: "bg-blue-600" },
  { id: "consultation", name: "Consultation", color: "bg-slate-500" },
  { id: "operation", name: "Operation", color: "bg-red-600" },
];

function generateTimeSlots({
  startHour = 9,
  endHour = 18, // Clinic closes at 6:00 PM
} = {}) {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const nextHour = hour + 1;

    const startPeriod = hour < 12 ? "AM" : "PM";
    const startDisplayHour = hour % 12 === 0 ? 12 : hour % 12;
    const startLabel = `${String(startDisplayHour).padStart(2, "0")}:00 ${startPeriod}`;

    const endPeriod = nextHour < 12 ? "AM" : "PM";
    const endDisplayHour = nextHour % 12 === 0 ? 12 : nextHour % 12;
    const endLabel = `${String(endDisplayHour).padStart(2, "0")}:00 ${endPeriod}`;

    slots.push({
      id: hour,
      label: `${startLabel} - ${endLabel}`,
      hour,
      minute: 0,
    });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function Appointment() {
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [currentMonthDate, setCurrentMonthDate] = useState(
    new Date(2026, 6, 1),
  );
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);

  // Database store with single transaction blocks
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      service: SERVICES[0],
      date: "Jul 9, 2026",
      time: "09:00 AM - 10:00 AM",
      slotIds: [9],
    },
    {
      id: 2,
      service: SERVICES[1],
      date: "Jul 9, 2026",
      time: "01:00 PM - 04:00 PM", // Saved as single transaction block
      slotIds: [13, 14, 15], // Spans 1pm, 2pm, and 3pm hours
    },
  ]);

  const now = new Date(2026, 6, 9, 15, 43);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(new Date(year, month, d));
  }

  const handlePrevMonth = () =>
    setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () =>
    setCurrentMonthDate(new Date(year, month + 1, 1));

  const isDatePast = (date) => {
    if (!date) return true;
    const compareDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
    );
    return compareDate < now;
  };

  const isTimeSlotPast = (timeSlot) => {
    if (!selectedDate) return false;
    const slotDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      timeSlot.hour,
      timeSlot.minute,
    );
    return slotDateTime < now;
  };

  // Counts total number of unique transactions booked on a specific date calendar day
  const getDayBookingCount = (date) => {
    if (!date) return 0;
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return appointments.filter((app) => app.date === formattedDate).length;
  };

  // Checks how many services are booked during a specific hour ID
  const getSlotBookingStats = (slot) => {
    if (!selectedDate) return { count: 0, isFull: false };

    const formattedTargetDate = selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Check if the individual slot hour ID falls inside any transaction's slotIds block
    const matches = appointments.filter(
      (app) =>
        app.date === formattedTargetDate && app.slotIds.includes(slot.id),
    );

    return {
      count: matches.length,
      isFull: matches.length >= SERVICES.length,
    };
  };

  const handleTimeSlotClick = (slot) => {
    const { isFull } = getSlotBookingStats(slot);
    if (isFull) return;

    if (selectedSlots.length === 0) {
      setSelectedSlots([slot]);
      return;
    }

    const slotIds = selectedSlots.map((s) => s.id);
    const minId = Math.min(...slotIds);
    const maxId = Math.max(...slotIds);

    if (slotIds.includes(slot.id)) {
      if (slot.id === minId || slot.id === maxId) {
        setSelectedSlots(selectedSlots.filter((s) => s.id !== slot.id));
      } else {
        setSelectedSlots([slot]);
      }
      return;
    }

    if (slot.id === minId - 1 || slot.id === maxId + 1) {
      const newSelection = [...selectedSlots, slot].sort((a, b) => a.id - b.id);
      setSelectedSlots(newSelection);
    } else {
      setSelectedSlots([slot]);
    }
  };

  const handleBooking = (e) => {
    e.preventDefault();
    if (!selectedDate || selectedSlots.length === 0) return;

    // 1. Calculate the clean combined time label string
    let finalTimeLabel = "";
    if (selectedSlots.length === 1) {
      finalTimeLabel = selectedSlots[0].label;
    } else {
      const startLabelPart = selectedSlots[0].label.split(" - ")[0];
      const endLabelPart =
        selectedSlots[selectedSlots.length - 1].label.split(" - ")[1];
      finalTimeLabel = `${startLabelPart} - ${endLabelPart}`;
    }

    // 2. Map all targeted slot raw IDs to check against later for capacity calculations
    const assignedSlotIds = selectedSlots.map((slot) => slot.id);

    // 3. Save exactly ONE single item object (1 transaction)
    const newSingleTransaction = {
      id: Date.now(),
      service: selectedService,
      date: selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: finalTimeLabel,
      slotIds: assignedSlotIds, // [13, 14, 15] saved inside a single record entry
    };

    setAppointments([...appointments, newSingleTransaction]);
    setSelectedDate(null);
    setSelectedSlots([]);
  };

  return (
    <div className="w-full flex justify-center items-start">
      <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-xl p-10 mt-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-950 tracking-wide mb-8 dark:text-white">
          Book an Appointment
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleBooking} className="space-y-8">
              {/* 1. Select Service Type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-3 dark:text-slate-400">
                  1. Select Service Type
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {SERVICES.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className={`py-3.5 px-4 rounded-lg border text-center font-medium text-base transition-all ${
                        selectedService.id === service.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700"
                      }`}
                    >
                      {service.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Select Date */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    2. Select Date
                  </label>
                  <div className="flex items-center space-x-3 bg-slate-50 p-1 border border-slate-200 rounded-lg dark:bg-slate-950 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
                    >
                      &larr;
                    </button>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 min-w-[100px] text-center dark:text-slate-200">
                      {currentMonthDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="px-2.5 py-1 text-slate-500 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:text-white"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {daysArray.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;

                    const past = isDatePast(date);
                    const isSelected =
                      selectedDate &&
                      selectedDate.toDateString() === date.toDateString();

                    const dayBookingsCount = getDayBookingCount(date);

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={past}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlots([]);
                        }}
                        className={`flex flex-col items-center justify-between p-2 rounded-lg border transition-all h-16 relative ${
                          past
                            ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed line-through dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-700/60"
                            : isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700"
                        }`}
                      >
                        <span className="text-base font-bold w-full text-center mt-0.5">
                          {date.getDate()}
                        </span>

                        {/* Day level count badge based on transactions */}
                        {!past && dayBookingsCount > 0 && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold tracking-wide uppercase ${
                              isSelected
                                ? "bg-white text-indigo-600"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-800"
                            }`}
                          >
                            {dayBookingsCount} Booked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Available Time Slots */}
              <div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                    3. Available Time Slots (Operating Hours: 09:00 AM - 06:00
                    PM)
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {TIME_SLOTS.map((slot) => {
                    const past = isTimeSlotPast(slot);
                    const isSelected = selectedSlots.some(
                      (s) => s.id === slot.id,
                    );
                    const { count, isFull } = getSlotBookingStats(slot);

                    return (
                      <button
                        key={slot.label}
                        type="button"
                        disabled={past || !selectedDate || isFull}
                        onClick={() => handleTimeSlotClick(slot)}
                        className={`py-3 px-4 rounded-lg border text-sm transition-all flex justify-between items-center ${
                          !selectedDate
                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-950 dark:border-slate-800 dark:text-slate-600"
                            : past
                              ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed line-through dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-700/60"
                              : isFull
                                ? "bg-red-50 border-red-300 text-red-500 cursor-not-allowed dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-400"
                                : isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700"
                        }`}
                      >
                        <span className="font-medium">{slot.label}</span>

                        {/* Time Slot Status Badge */}
                        {selectedDate && !past && (
                          <span
                            className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                              isFull
                                ? "bg-red-500 text-white"
                                : count > 0
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                            }`}
                          >
                            {isFull
                              ? "Fully Booked"
                              : count > 0
                                ? `${count} Booked`
                                : "Available"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedDate || selectedSlots.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-base transition-colors mt-4 tracking-wide shadow-sm dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
              >
                Confirm Appointment
              </button>
            </form>
          </div>

          {/* Right Column: Schedule Container Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-4 dark:bg-slate-950 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-950 mb-4 dark:text-white">
                Your Schedule
              </h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500 italic dark:text-slate-400">
                  No appointments booked yet.
                </p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {appointments.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center space-x-4 p-4 bg-white border border-slate-200 rounded-xl dark:bg-slate-900 dark:border-slate-800"
                    >
                      <div
                        className={`w-1.5 h-12 rounded-full ${app.service.color}`}
                      />
                      <div>
                        <h4 className="font-bold text-base text-slate-950 dark:text-white">
                          {app.service.name}
                        </h4>
                        <p className="text-sm text-slate-600 font-medium dark:text-slate-300">
                          {app.date}
                        </p>
                        <p className="text-sm text-slate-500 font-medium dark:text-slate-400">
                          {app.time}{" "}
                          {/* Displays unified blocks like "01:00 PM - 04:00 PM" as a single card entry */}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
