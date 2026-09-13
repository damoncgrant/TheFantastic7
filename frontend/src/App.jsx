import { useEffect, useRef, useState } from 'react';
import JobSwiper from './UserJobswiper';
import DMPage from './DMPage.jsx';
import JobDetail from './Components/JobDetail.jsx';
import ProfilePage from './ProfilePage';
import { getInitials, getProfileStorageKey, loadProfile } from './profile';
import ResumeBuilderPage from './resume_builder/ResumePage.jsx';


// For this hackathon API, the active profile is provided explicitly.
// Set VITE_CANDIDATE_ID in frontend/.env.local to a UserProfile primary key.
const candidateId = import.meta.env.VITE_CANDIDATE_ID ?? 1;
import { fetchApplications } from './applications';
import NotificationsPage, { useNotifications } from './NotificationsPage';
import { removeCandidateProfilePhoto, uploadCandidateProfilePhoto } from './api.js';
import { roleLabels, navigation } from './appData.js';
import OverviewPage from './pages/OverviewPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';

const pages = {
  overview: OverviewPage,
  applications: ApplicationsPage,
  messages: DMPage,
  resume: ResumeBuilderPage,
  swipe: JobSwiper,
  profile: ProfilePage,
  notifications: NotificationsPage,
};

function getPageFromHash() {
  const page = window.location.hash.slice(1).split('?')[0];
  return Object.hasOwn(pages, page) ? page : 'overview';
}

export default function App({ user, onLogout }) {
  const candidateId = user.profile_id ?? user.candidateId;
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [profile, setProfile] = useState(() => loadProfile(user.email, user.name, user.picture_url));
  const [selectedJob, setSelectedJob] = useState(null); // NEW
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const legacyPhotoSync = useRef({ source: '', promise: null });
  const notifications = useNotifications(Boolean(user), user.email);
  const ActivePage = activePage === 'notifications' && user.role !== 'applicant' ? OverviewPage : pages[activePage];

  async function saveProfile(nextProfile, pictureChange = {}) {
    let picture = nextProfile.picture;
    if (pictureChange.file) {
      const response = await uploadCandidateProfilePhoto(pictureChange.file);
      picture = response.photo_url;
    } else if (pictureChange.removed) {
      await removeCandidateProfilePhoto();
      picture = '';
    } else if (picture.startsWith('data:image/')) {
      // Profiles saved before server-backed photos used a browser data URL.
      const pictureBlob = await fetch(picture).then((response) => response.blob());
      const response = await uploadCandidateProfilePhoto(pictureBlob);
      picture = response.photo_url;
    }
    const savedProfile = { ...nextProfile, picture };
    setProfile(savedProfile);
    return savedProfile;
  }

  // Move a legacy browser-only picture into the candidate record once, so
  // recruiters can see photos that users saved before database uploads existed.
  useEffect(() => {
    const legacyPicture = profile.picture;
    if (user.role !== 'applicant' || !legacyPicture?.startsWith('data:image/')) return;
    if (legacyPhotoSync.current.source !== legacyPicture) {
      legacyPhotoSync.current = {
        source: legacyPicture,
        promise: fetch(legacyPicture)
          .then((response) => response.blob())
          .then((pictureBlob) => uploadCandidateProfilePhoto(pictureBlob)),
      };
    }
    const syncRequest = legacyPhotoSync.current.promise;
    let active = true;

    async function syncLegacyPicture() {
      try {
        const response = await syncRequest;
        if (!active) return;
        setProfile((current) => {
          if (current.picture !== legacyPicture) return current;
          const syncedProfile = { ...current, picture: response.photo_url };
          window.localStorage.setItem(getProfileStorageKey(user.email), JSON.stringify(syncedProfile));
          return syncedProfile;
        });
      } catch {
        // Leave the browser copy intact so the user does not lose their photo.
      }
    }

    syncLegacyPicture();
    return () => { active = false; };
  }, [profile.picture, user.email, user.role]);

  // Hash navigation keeps this prototype multi-page without adding a router.
  useEffect(() => {
    const updatePage = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  // Refetch whenever the applications list is actually visible, so swiping
  // on a job elsewhere and coming back shows the newly created application.
  useEffect(() => {
    if (user.role !== 'applicant') { setApplicationsLoading(false); return; }
    if (activePage !== 'overview' && activePage !== 'applications') return;

    const controller = new AbortController();

    async function loadApplications() {
      try {
        setApplicationsLoading(true);
        const data = await fetchApplications(candidateId, { signal: controller.signal });
        setApplications(data);
      } catch (error) {
        if (error.name !== 'AbortError') setApplications([]);
      } finally {
        if (!controller.signal.aborted) setApplicationsLoading(false);
      }
    }

    loadApplications();
    return () => controller.abort();
  }, [activePage, candidateId, user.role]);

  // Keep this after all hooks. Returning before the effect changes hook order
  // when a job is opened and causes React to render a blank page.
  if (selectedJob) {
    return <JobDetail job={selectedJob} onBack={() => setSelectedJob(null)} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#overview" aria-label="Jobbler home">
          <span className="brand-mark">J</span>
          <span>jobbler</span>
        </a>

        {user.role === 'applicant' && (
          <a className="sidebar-cta" href="#swipe" aria-label="Find jobs to apply to">
            <span className="sidebar-cta-copy">Find jobs</span>
            <span className="sidebar-cta-icon" aria-hidden="true">→</span>
          </a>
        )}

        <nav className="nav-links">
          {navigation.filter((item) => !item.applicantOnly || user.role === 'applicant').map((item) => (
            <a
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              href={`#${item.id}`}
              key={item.id}
            >
              {item.label}
              {item.id === 'messages' && notifications.unreadMessageCount > 0 && <span className="notification-count" aria-label={`${notifications.unreadMessageCount} unread messages`}>{notifications.unreadMessageCount}</span>}
              {item.id === 'notifications' && notifications.unreadCount > 0 && <span className="notification-count" aria-label={`${notifications.unreadCount} unread notifications`}>{notifications.unreadCount}</span>}
            </a>
          ))}
        </nav>

        <a
          className={`profile ${activePage === 'profile' ? 'active' : ''}`}
          href="#profile"
          aria-label="Edit personal profile"
          aria-current={activePage === 'profile' ? 'page' : undefined}
        >
          <span className="avatar" aria-hidden="true">
            {profile.picture ? <img src={profile.picture} alt="" /> : getInitials(profile.name)}
          </span>
          <span>
            <strong>{profile.name}</strong>
            <small>{roleLabels[user.role] ?? user.role}</small>
          </span>
        </a>
      </aside>

      <main className={`dashboard${activePage === 'resume' ? ' resume-dashboard' : ''}`} key={activePage}>
        <ActivePage
          user={user}
          messagesRoute="messages"
          profile={profile}
          onSave={saveProfile}
          candidateId={candidateId}
          accountEmail={user.email}
          onLogout={onLogout}
          onSelectJob={setSelectedJob}
          applications={applications}
          applicationsLoading={applicationsLoading}
          notifications={notifications}
        />
      </main>
    </div>
  );
}
