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

// Defaults to the current calendar month when no valid "YYYY-MM" is
// supplied, and resolves it to the first/last day for the underlying query.
function resolveMonthRange({ month }) {
  const now = new Date();
  const isValidMonth = /^\d{4}-\d{2}$/.test(month || "");
  const [year, monthNum] = isValidMonth
    ? month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const resolvedMonth = `${year}-${String(monthNum).padStart(2, "0")}`;
  const startDate = `${resolvedMonth}-01`;
  const endDate = toDateString(new Date(year, monthNum, 0));

  return { month: resolvedMonth, startDate, endDate };
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

  // Top 5 fastest-moving products by units sold, and the bottom 5 among
  // products that sold at least once that month (a product with zero sales
  // never appears in the underlying query, so it's excluded automatically).
  // The bottom 5 are drawn from what's left AFTER the top 5 so the two
  // lists never overlap.
  async getProductMovers({ month }) {
    const { month: resolvedMonth, startDate, endDate } = resolveMonthRange({
      month,
    });
    const rows = await analyticsModel.getProductMovers({ startDate, endDate });

    const fastMoving = rows.slice(0, 5);
    const remaining = rows.slice(5);
    const slowMoving = remaining.length > 0 ? remaining.slice(-5).reverse() : [];

    return {
      month: resolvedMonth,
      fastMoving,
      slowMoving,
      totalProducts: rows.length,
    };
  }

  async getCriticalStock() {
    return analyticsModel.getCriticalStock();
  }

  // Fills in every bookable hour (9 AM-5 PM start, matching the fixed
  // one-hour slot rule in appointmentSchema.js) and every day of the week
  // with a 0 count when nothing was booked then — a bar chart with a gap
  // reads as missing data, not "zero," so this fills the gap explicitly
  // instead of only returning whatever GROUP BY happened to find rows for.
  async getPeakTimes({ start_date, end_date }) {
    const { startDate, endDate } = resolveDateRange({ start_date, end_date });
    const { byHour, byDay } = await analyticsModel.getPeakTimes({
      startDate,
      endDate,
    });

    const hourCounts = new Map(byHour.map((r) => [r.hour, r.count]));
    const filledByHour = Array.from({ length: 9 }, (_, i) => {
      const hour = 9 + i; // 9 AM through 5 PM (the last bookable start hour)
      return { hour, count: hourCounts.get(hour) ?? 0 };
    });

    const DAY_NAMES = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayCounts = new Map(byDay.map((r) => [r.day_of_week, r.count]));
    const filledByDay = DAY_NAMES.map((day_name, day_of_week) => ({
      day_of_week,
      day_name,
      count: dayCounts.get(day_of_week) ?? 0,
    }));

    const peakHour = filledByHour.reduce(
      (max, r) => (r.count > max.count ? r : max),
      filledByHour[0],
    );
    const peakDay = filledByDay.reduce(
      (max, r) => (r.count > max.count ? r : max),
      filledByDay[0],
    );

    return {
      byHour: filledByHour,
      byDay: filledByDay,
      peakHour: peakHour.count > 0 ? peakHour : null,
      peakDay: peakDay.count > 0 ? peakDay : null,
    };
  }
}
