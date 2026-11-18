import { createBrowserRouter } from 'react-router';
import { HabitsPage } from '../features/habits/HabitsPage';
import { HomePage } from '../features/home/HomePage';
import { LookdevPage } from '../features/lookdev/LookdevPage';
import { PagesPage } from '../features/pages/PagesPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { StudyPage } from '../features/study/StudyPage';
import { SettingsPage } from '../features/places/SettingsPage';
import { VoyagePage } from '../features/voyage/VoyagePage';
import { AppShell } from './AppShell';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/voyage', element: <VoyagePage /> },
      { path: '/study', element: <StudyPage /> },
      { path: '/study/:subjectId', element: <StudyPage /> },
      { path: '/habits', element: <HabitsPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/pages', element: <PagesPage /> },
      { path: '/pages/:pageId', element: <PagesPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  // the boat and sea on their own, for look reviews
  { path: '/lookdev', element: <LookdevPage /> },
]);
