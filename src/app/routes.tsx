import { createBrowserRouter } from 'react-router';
import { FitnessPage } from '../features/fitness/FitnessPage';
import { HabitsPage } from '../features/habits/HabitsPage';
import { HomePage } from '../features/home/HomePage';
import { LookdevPage } from '../features/lookdev/LookdevPage';
import { PagesPage } from '../features/pages/PagesPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { StudyPage } from '../features/study/StudyPage';
import { SettingsPage } from '../features/places/SettingsPage';
import { VoyagePage } from '../features/voyage/VoyagePage';
import { AppShell } from './AppShell';
import { AppError, PageError } from './PageError';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    // if Compass itself cannot be drawn there is no rail to keep, so this says so on its own
    errorElement: <AppError />,
    children: [
      {
        // A page that fails as it is drawn is replaced by a few words, inside the shell. The rail, the bar and the
        // way to Settings stay, so one bad page can never be the end of the app.
        errorElement: <PageError />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/voyage', element: <VoyagePage /> },
          { path: '/study', element: <StudyPage /> },
          { path: '/study/:subjectId', element: <StudyPage /> },
          { path: '/habits', element: <HabitsPage /> },
          { path: '/review', element: <ReviewPage /> },
          { path: '/pages', element: <PagesPage /> },
          // the saved headlines are kept in My pages, and are not a page: a fixed address is matched before a page's id
          { path: '/pages/headlines', element: <PagesPage headlines /> },
          { path: '/pages/:pageId', element: <PagesPage /> },
          { path: '/fitness', element: <FitnessPage /> },
          { path: '/fitness/:workoutId', element: <FitnessPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  // the boat and sea on their own, for look reviews
  { path: '/lookdev', element: <LookdevPage /> },
]);
