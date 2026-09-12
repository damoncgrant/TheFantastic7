export const profileStorageKey = 'jobbler.profile';

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

export function loadProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(profileStorageKey));
    return Object.fromEntries(Object.entries(defaultProfile).map(([key, fallback]) => [
      key, typeof saved?.[key] === 'string' && (key !== 'name' || saved[key].trim()) ? saved[key] : fallback,
    ]));
  } catch {
    return { ...defaultProfile };
  }
}

export function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : name.trim().slice(0, 2)).toUpperCase() || 'J';
}
