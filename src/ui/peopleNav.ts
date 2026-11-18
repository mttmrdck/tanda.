/**
 * People → profile is a deeper level, so it moves laterally: the profile enters from the right, and the list
 * returns from the left at the scroll position the caregiver left it. Module state, because the two pages are
 * separate routes and never mounted together.
 */
export const peopleNav = { returning: false, scrollY: 0 };
