// Scoped per account so different logins on the same browser don't share
// or overwrite each other's saved profile.
export function getProfileStorageKey(accountEmail) {
  return `jobbler.profile.${accountEmail}`;
}

export const defaultProfile = {
  name: 'Chud',
  headline: 'Software Developer',
  email: '',
  phone: '',
  location: 'Edmonton, AB',
  bio: 'Computer science student interested in thoughtful software, accessible interfaces, and collaborative teams.',
  linkedin: '',
  website: '',
};

export function loadProfile(accountEmail, accountName) {
  const fallback = {
    ...defaultProfile,
    email: accountEmail || defaultProfile.email,
    name: accountName || defaultProfile.name,
  };
  try {
    const saved = JSON.parse(window.localStorage.getItem(getProfileStorageKey(accountEmail)));
    return Object.fromEntries(Object.entries(fallback).map(([key, value]) => [
      key, typeof saved?.[key] === 'string' && (key !== 'name' || saved[key].trim()) ? saved[key] : value,
    ]));
  } catch {
    return fallback;
  }
}

export function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : name.trim().slice(0, 2)).toUpperCase() || 'J';
}
