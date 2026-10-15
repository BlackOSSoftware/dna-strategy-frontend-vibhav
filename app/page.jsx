import DashboardClient from './dashboard-client.jsx';
import {dashboardMarkup} from './dashboard-markup.js';

export const metadata={title:'Trading dashboard · GridPilot'};

export default function DashboardPage() {
  return <DashboardClient markup={dashboardMarkup()} view="dashboard" />;
}
