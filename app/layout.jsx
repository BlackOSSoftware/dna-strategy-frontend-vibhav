import { DM_Sans, Manrope } from 'next/font/google';
import './style.css';
import './light.css';
import './broker.css';
import './ui.css';

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
const display = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });

export const metadata = {
  title: 'GridPilot · Sharekhan Strategy Console',
  description: '15-minute SMA grid paper trading dashboard',
};

export default function RootLayout({ children }) {
  return <html lang="en" className={`${sans.variable} ${display.variable}`}><body>{children}</body></html>;
}
