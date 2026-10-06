import { readFileSync } from 'node:fs';
import path from 'node:path';
import DashboardClient from './dashboard-client.jsx';

function dashboardMarkup() {
  const document = readFileSync(path.join(process.cwd(), 'dashboard.html'), 'utf8');
  const markup = document.match(/<body>([\s\S]*?)<script type="module" src="\/app\.js"><\/script><\/body>/)?.[1];
  if (!markup) throw new Error('Dashboard markup was not found');
  return markup;
}

export default function DashboardPage() {
  return <DashboardClient markup={dashboardMarkup()} />;
}
