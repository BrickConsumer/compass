import { LazyMotion, MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { router } from './routes';

/** The animation engine arrives after the first paint. Nothing animates on load, so nothing waits for it. */
const features = () => import('../design/motionFeatures').then((m) => m.default);

export function App() {
  // with reduced motion asked for, nothing slides or scales: changes cross-fade instead
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user"><RouterProvider router={router} /></MotionConfig>
    </LazyMotion>
  );
}
