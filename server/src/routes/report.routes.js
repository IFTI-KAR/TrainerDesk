const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const reportController = require('../controllers/report.controller');
const {
  dashboardStatsQuerySchema,
  attendanceReportQuerySchema,
  exportClientsQuerySchema,
  exportSessionsQuerySchema,
} = require('../validators/report.validator');

const router = express.Router();

router.use(protect);

router.get(
  '/dashboard-stats',
  validate(dashboardStatsQuerySchema),
  reportController.getDashboardStats
);

router.get(
  '/attendance',
  validate(attendanceReportQuerySchema),
  reportController.getAttendanceReport
);

router.get(
  '/export/clients.csv',
  validate(exportClientsQuerySchema),
  reportController.exportClientsCsv
);

router.get(
  '/export/sessions.csv',
  validate(exportSessionsQuerySchema),
  reportController.exportSessionsCsv
);

module.exports = router;
