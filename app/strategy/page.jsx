import DashboardClient from '../dashboard-client.jsx';
import {dashboardMarkup} from '../dashboard-markup.js';

export const metadata={title:'Strategy control · GridPilot'};

export default function StrategyPage(){
  return <DashboardClient markup={dashboardMarkup()} view="strategy" />;
}
