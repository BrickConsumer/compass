import { createBrowserRouter } from 'react-router';
import { HabitsPage } from '../features/habits/HabitsPage';
import { HomePage } from '../features/home/HomePage';
import { LookdevPage } from '../features/lookdev/LookdevPage';
import { PlacePage } from '../features/places/Places';
import { SettingsPage } from '../features/places/SettingsPage';
import { VoyagePage } from '../features/voyage/VoyagePage';
import { AppShell } from './AppShell';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/voyage', element: <VoyagePage /> },
      { path: '/study', element: <PlacePage place="study" /> },
      { path: '/habits', element: <HabitsPage /> },
      { path: '/review', element: <PlacePage place="review" /> },
      { path: '/pages', element: <PlacePage place="pages" /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  // the boat and sea on their own, for look reviews
  { path: '/lookdev', element: <LookdevPage /> },
]);
