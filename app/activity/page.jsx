import DashboardClient from '../dashboard-client.jsx';
import {dashboardMarkup} from '../dashboard-markup.js';

export const metadata={title:'Activity log · GridPilot'};

export default function ActivityPage(){
  return <DashboardClient markup={dashboardMarkup()} view="activity" />;
}
