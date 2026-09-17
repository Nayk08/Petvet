import AnalyticsModel from "./Analytics_Model.js";

const analyticsModel = new AnalyticsModel();

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

// Defaults to the last 30 days (inclusive of today) when the caller doesn't
// supply an explicit range, and validates whatever IS supplied.
function resolveDateRange({ start_date, end_date }) {
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 29);

  const startDate = start_date || toDateString(defaultStart);
  const endDate = end_date || toDateString(today);

  if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
    const err = new Error("Invalid start_date or end_date");
    err.statusCode = 400;
    throw err;
  }

  if (startDate > endDate) {
    const err = new Error("start_date must be on or before end_date");
    err.statusCode = 400;
    throw err;
  }

  return { startDate, endDate };
}

export default class AnalyticsService {
  async getRevenueTrend({ start_date, end_date }) {
    const { startDate, endDate } = resolveDateRange({ start_date, end_date });
    return analyticsModel.getRevenueTrend({ startDate, endDate });
  }

  async getAppointmentsBreakdown({ start_date, end_date }) {
    const { startDate, endDate } = resolveDateRange({ start_date, end_date });
    return analyticsModel.getAppointmentsBreakdown({ startDate, endDate });
  }

  async getTopProducts({ start_date, end_date, limit }) {
    const { startDate, endDate } = resolveDateRange({ start_date, end_date });
    const parsedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    return analyticsModel.getTopProducts({
      startDate,
      endDate,
      limit: parsedLimit,
    });
  }

  async getClientGrowth({ start_date, end_date }) {
    const { startDate, endDate } = resolveDateRange({ start_date, end_date });
    return analyticsModel.getClientGrowth({ startDate, endDate });
  }
}
