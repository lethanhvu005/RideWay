import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import './styles/theme.css';
import './styles/account.css';
import './styles/motion.css';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
