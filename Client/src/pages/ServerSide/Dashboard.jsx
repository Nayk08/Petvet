import React, { useState } from "react";

// Mock Data matching the PetVet aesthetic
const STATS = [
  {
    id: 1,
    name: "Total Appointments",
    value: "142",
    change: "+12% this week",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: 2,
    name: "Active Consultations",
    value: "12",
    change: "3 currently in queue",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    id: 3,
    name: "Completed Grooming",
    value: "68",
    change: "Target 80% reached",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: 4,
    name: "Critical Operations",
    value: "3",
    change: "Scheduled for today",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
];

const RECENT_PATIENTS = [
  {
    id: "PET-9021",
    name: "Max (Golden Retriever)",
    owner: "Alice Johnson",
    service: "Grooming",
    status: "Completed",
    time: "09:00 AM",
  },
  {
    id: "PET-4412",
    name: "Luna (Siamese Cat)",
    owner: "Robert Smith",
    service: "Consultation",
    status: "In Progress",
    time: "10:30 AM",
  },
  {
    id: "PET-1092",
    name: "Rocky (German Shepherd)",
    owner: "Charlie Brown",
    service: "Operation",
    status: "Pending",
    time: "01:00 PM",
  },
  {
    id: "PET-7721",
    name: "Bella (Persian Cat)",
    owner: "Diana Prince",
    service: "Grooming",
    status: "Pending",
    time: "02:30 PM",
  },
];

export default function Dashboard() {
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredPatients =
    filterStatus === "All"
      ? RECENT_PATIENTS
      : RECENT_PATIENTS.filter((p) => p.status === filterStatus);

  return (
    <div className="min-h-screen bg-[#070911] text-slate-100 font-sans flex">
      {/* Main Content Area */}
      <div className="flex-1 p-8 max-w-7xl mx-auto space-y-8 w-full">
        {/* Header section */}
        <div className="flex justify-between items-center border-b border-[#161b2c] pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide">
              Welcome Back, Admin
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Here is what's happening at PetVet clinic today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-teal-400">
              Clinic Status: Open
            </p>
            <p className="text-xs text-slate-500">Hours: 09:00 AM - 06:00 PM</p>
          </div>
        </div>

        {/* Analytics/Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.id}
              className="bg-[#0b0e17] border border-[#161b2c] rounded-xl p-6 transition-all hover:border-[#1e253a]"
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-slate-400">
                  {stat.name}
                </p>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${stat.color.replace("text", "bg")}`}
                />
              </div>
              <p className="text-3xl font-extrabold text-white mt-4 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Dynamic Grid Section */}
        <div className="bg-[#0b0e17] border border-[#161b2c] rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#161b2c] gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">
                Today's Live Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time status tracking for checked-in patients.
              </p>
            </div>

            {/* Control Filters matching your Dynamic Grid style */}
            <div className="flex items-center space-x-2">
              {["All", "Pending", "In Progress", "Completed"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    filterStatus === status
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-[#070911] text-slate-400 border-[#1e253a] hover:bg-[#121627] hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#161b2c] text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#070911]/50">
                  <th className="py-4 px-4">Pet ID</th>
                  <th className="py-4 px-4">Patient Name</th>
                  <th className="py-4 px-4">Owner</th>
                  <th className="py-4 px-4">Service Type</th>
                  <th className="py-4 px-4">Appointment Time</th>
                  <th className="py-4 px-4 text-right">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161b2c]/60 text-sm">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-8 text-center text-slate-500 italic"
                    >
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-[#111627]/40 transition-colors group"
                    >
                      <td className="py-4 px-4 font-mono text-xs text-slate-400 font-bold">
                        {patient.id}
                      </td>
                      <td className="py-4 px-4 font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {patient.name}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {patient.owner}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 text-xs rounded-md bg-[#161b2c] text-slate-300 font-medium">
                          {patient.service}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {patient.time}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wide ${
                            patient.status === "Completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : patient.status === "In Progress"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
