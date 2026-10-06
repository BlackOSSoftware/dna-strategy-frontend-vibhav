import './style.css';
import './light.css';
import './broker.css';

export const metadata = {
  title: 'GridPilot · Sharekhan Strategy Console',
  description: '15-minute SMA grid paper trading dashboard',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
