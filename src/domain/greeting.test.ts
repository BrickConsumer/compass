import { describe, expect, it } from 'vitest';
import { greeting } from './greeting';

describe('the greeting', () => {
  it('greets by the hour, and only once there is a name', () => {
    expect([4, 5, 11, 12, 17, 18, 23].map((h) => greeting(h, 'Aditya'))).toEqual(['Good evening, Aditya', 'Good morning, Aditya', 'Good morning, Aditya', 'Good afternoon, Aditya', 'Good afternoon, Aditya', 'Good evening, Aditya', 'Good evening, Aditya']);
    expect(greeting(9, undefined)).toBeNull();
  });
});
