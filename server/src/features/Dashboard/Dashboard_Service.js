import DashboardModel from "./Dashboard_Model.js";

const dashboardModel = new DashboardModel();

export default class DashboardService {
  async getTodayAppointments({ page, limit, search, filters }) {
    return dashboardModel.getTodayAppointments({ page, limit, search, filters });
  }

  async getTodayPayments({ page, limit, search, filters }) {
    return dashboardModel.getTodayPayments({ page, limit, search, filters });
  }

  async getTodayRevenueTransactions({ type, method, search, page, limit }) {
    return dashboardModel.getTodayRevenueTransactions({
      type,
      method,
      search,
      page,
      limit,
    });
  }
}
