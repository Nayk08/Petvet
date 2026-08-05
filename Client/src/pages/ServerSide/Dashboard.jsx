import React, { useState } from "react";

// Mock Data matching the PetVet aesthetic
const STATS = [
  {
    id: 1,
    name: "Total Appointments",
    value: "142",
    change: "+12% this week",
    color: "text-blue-600",
    dotBg: "bg-blue-500",
  },
  {
    id: 2,
    name: "Active Consultations",
    value: "12",
    change: "3 currently in queue",
    color: "text-amber-600",
    dotBg: "bg-amber-500",
  },
  {
    id: 3,
    name: "Completed Grooming",
    value: "68",
    change: "Target 80% reached",
    color: "text-emerald-600",
    dotBg: "bg-emerald-500",
  },
  {
    id: 4,
    name: "Critical Operations",
    value: "3",
    change: "Scheduled for today",
    color: "text-rose-600",
    dotBg: "bg-rose-500",
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
    <div className="bg-slate-50 text-slate-800 font-sans min-h-screen flex">
      {/* Main Content Area */}
      <div className="flex-1 p-8 max-w-7xl mx-auto space-y-8 w-full">
        {/* Header section */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-wide">
              Welcome Back, Admin
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here is what's happening at PetVet clinic today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-teal-600">
              Clinic Status: Open
            </p>
            <p className="text-xs text-slate-400">Hours: 09:00 AM - 06:00 PM</p>
          </div>
        </div>

        {/* Analytics/Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-slate-500">
                  {stat.name}
                </p>
                <span className={`w-2.5 h-2.5 rounded-full ${stat.dotBg}`} />
              </div>
              <p className="text-3xl font-extrabold text-slate-900 mt-4 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Dynamic Grid Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Today's Live Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time status tracking for checked-in patients.
              </p>
            </div>

            {/* Control Filters */}
            <div className="flex items-center space-x-2">
              {["All", "Pending", "In Progress", "Completed"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    filterStatus === status
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
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
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="py-4 px-4">Pet ID</th>
                  <th className="py-4 px-4">Patient Name</th>
                  <th className="py-4 px-4">Owner</th>
                  <th className="py-4 px-4">Service Type</th>
                  <th className="py-4 px-4">Appointment Time</th>
                  <th className="py-4 px-4 text-right">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-12 text-center text-sm text-slate-400 italic"
                    >
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">
                        {patient.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                        {patient.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {patient.owner}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                          {patient.service}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {patient.time}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded tracking-wide border ${
                            patient.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : patient.status === "In Progress"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
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
