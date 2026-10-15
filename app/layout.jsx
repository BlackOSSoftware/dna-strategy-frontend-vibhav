import './style.css';
import './light.css';
import './broker.css';
import './ui.css';


export const metadata = {
  title: 'GridPilot Trading Console',
  description: '15-minute SMA grid paper trading dashboard',
};

export default function RootLayout({ children }) {
  return <html lang="en" style={{'--font-sans':'"DM Sans", "Segoe UI", sans-serif','--font-display':'Manrope, "Segoe UI", sans-serif'}}><body>{children}</body></html>;
}
