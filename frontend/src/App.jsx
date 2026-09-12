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

const roleLabels = {
  applicant: 'Applicant',
  employer: 'Recruiter',
};

const savedJobs = [
  { company: 'Evergreen Tech', role: 'Full Stack Developer', location: 'Edmonton, AB', type: 'Full time', profile: '/company-profiles/northstar-contact.png' },
  { company: 'Riverbend Studio', role: 'Frontend Engineer', location: 'Remote', type: 'Full time', profile: '/company-profiles/cedar-contact.png' },
  { company: 'Atlas Analytics', role: 'Product Developer', location: 'Calgary, AB', type: 'Hybrid', profile: '/company-profiles/prairie-contact.png' },
];

const navigation = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'messages', label: 'Messages'},
  { id: 'notifications', label: 'Notifications', applicantOnly: true },
  { id: 'resume', label: 'Resume' },
  { id: 'saved', label: 'Saved jobs' },
];

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function ApplicationRow({ application, onSelectJob }) {
  const statusClass = application.status.toLowerCase();

  return (
    <article
      className={`application-row application-${statusClass}`}
      onClick={() => onSelectJob(application)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelectJob(application);
      }}
    >
      {application.profile ? (
        <img
          className="company-profile"
          src={application.profile}
          alt={`Company contact for ${application.company}`}
        />
      ) : (
        <span className="company-mark" aria-hidden="true">
          {application.company.charAt(0)}
        </span>
      )}
      <div className="application-details">
        <strong>{application.role}</strong>
        <span>{application.company}{application.date ? ` • ${application.date}` : ''}</span>
      </div>
      <span className={`status ${statusClass}`}>
        {application.status}
      </span>
    </article>
  );
}

function EmptyApplications() {
  return (
    <section className="empty-applications">
      <div>
        <h2>No outgoing applications</h2>
        <p>Swipe right on a job to send your first application.</p>
        <a className="primary-button button-link swipe-button" href="#swipe">
          <span className="swipe-button-copy">
            <strong>Start swiping</strong>
            <small>Find jobs to apply to</small>
          </span>
          <span className="swipe-button-icon" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

function OverviewPage({ profile, applications, applicationsLoading, onSelectJob }) {
  const applicationStats = [
    { label: 'Applications sent', value: applications.length },
    { label: 'Interviews', value: applications.filter((application) => application.stage === 'interview').length },
    { label: 'Offers', value: applications.filter((application) => application.stage === 'offer').length },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Your job search, organized"
        title={`Good morning, ${profile.name}.`}
        description="Keep moving toward work that fits your life."
        action={<a className="secondary-button button-link" href="#resume">Edit resume</a>}
      />

      <section className="swipe-card" aria-labelledby="swipe-heading">
        <div>
          <p className="eyebrow">More opportunities. More life.</p>
          <h2 id="swipe-heading">Find your next fit.</h2>
          <p>Review roles chosen around your skills and preferences.</p>
        </div>
        <a className="primary-button button-link swipe-button" href="#swipe">
          <span className="swipe-button-copy">
            <strong>Start swiping</strong>
            <small>Find jobs to apply to</small>
          </span>
          <span className="swipe-button-icon" aria-hidden="true">→</span>
        </a>
      </section>

      <section className="stats-grid" aria-label="Application summary">
        {applicationStats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-panel" aria-labelledby="recent-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Stay in the loop</p>
            <h2 id="recent-heading">Recent applications</h2>
          </div>
          <a href="#applications">View all</a>
        </div>
        {applicationsLoading ? null : applications.length === 0 ? (
          <EmptyApplications />
        ) : (
          <div className="application-list">
            {applications.slice(0, 3).map((application) => (
              <ApplicationRow application={application} onSelectJob={onSelectJob} key={application.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

const applicationFilters = ['all', 'applied', 'interview', 'offer', 'rejected'];

function ApplicationsPage({ applications, applicationsLoading, onSelectJob }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const filteredApplications = activeFilter === 'all'
    ? applications
    : applications.filter((application) => application.stage === activeFilter);

  return (
    <>
      <PageHeader
        eyebrow="Track your progress"
        title="Applications"
        description="Every opportunity and update in one place."
      />

      <section className="filter-row" aria-label="Application filters">
        {applicationFilters.map((filter) => (
          <button
            className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveFilter(filter)}
            key={filter}
          >
            {filter === 'all' ? 'All' : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`}
          </button>
        ))}
      </section>

      <section className="content-panel page-panel" aria-labelledby="all-applications-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{filteredApplications.length} shown</p>
            <h2 id="all-applications-heading">
              {activeFilter === 'all' ? 'All applications' : `${activeFilter.charAt(0).toUpperCase()}${activeFilter.slice(1)} applications`}
            </h2>
          </div>
        </div>
        {applicationsLoading ? (
          <p>Loading applications…</p>
        ) : filteredApplications.length === 0 ? (
          <EmptyApplications />
        ) : (
          <div className="application-list">
            {filteredApplications.map((application) => (
              <ApplicationRow application={application} onSelectJob={onSelectJob} key={application.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ResumePage() {
  return (
    <>
      <PageHeader
        eyebrow="Your master profile"
        title="Resume"  
        description="Keep one strong foundation ready to tailor for each role."
        action={<button className="primary-button" type="button">Edit resume</button>}
      />

      <section className="resume-grid">
        <article className="content-panel page-panel resume-preview">
          <div className="resume-nameplate">
            <div>
              <p className="eyebrow">Master resume</p>
              <h2>Chud</h2>
              <span>Software Developer • Edmonton, AB</span>
            </div>
            <span className="completion">85% complete</span>
          </div>

          <div className="resume-section">
            <h3>Summary</h3>
            <p>Computer science student interested in thoughtful software, accessible interfaces, and collaborative teams.</p>
          </div>
          <div className="resume-section">
            <h3>Experience</h3>
            <strong>Software Developer Intern</strong>
            <p>Built and tested web features with a small product team.</p>
          </div>
          <div className="resume-section">
            <h3>Education</h3>
            <strong>University of Alberta</strong>
            <p>BSc, Computing Science</p>
          </div>
        </article>

        <aside className="content-panel page-panel resume-aside">
          <p className="eyebrow">Skills</p>
          <h2>Your strengths</h2>
          <div className="skill-list">
            <span>React</span>
            <span>Python</span>
            <span>Django</span>
            <span>Git</span>
            <span>UI design</span>
          </div>
          <button className="secondary-button" type="button">Manage skills</button>
        </aside>
      </section>
    </>
  );
}

function SavedJobsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Come back anytime"
        title="Saved jobs"
        description="Roles worth a closer look before you apply."
        action={<button className="primary-button" type="button">Find more jobs</button>}
      />

      <section className="saved-grid" aria-label="Saved job listings">
        {savedJobs.map((job) => (
          <article className="saved-card" key={`${job.company}-${job.role}`}>
            <div className="saved-card-top">
              <span className="company-mark" aria-hidden="true">{job.company.charAt(0)}</span>
              <button className="bookmark-button" type="button" aria-label={`Remove ${job.role} from saved jobs`}>
                Saved
              </button>
            </div>
            <div>
              <h2>{job.role}</h2>
              <p>{job.company}</p>
            </div>
            <div className="job-meta">
              <span>{job.location}</span>
              <span>{job.type}</span>
            </div>
            <button className="secondary-button" type="button">View job</button>
          </article>
        ))}
      </section>
    </>
  );
}

const pages = {
  overview: OverviewPage,
  applications: ApplicationsPage,
  messages: DMPage,
  resume: ResumeBuilderPage,
  saved: SavedJobsPage,
  swipe: JobSwiper,
  profile: ProfilePage,
  notifications: NotificationsPage,
};

function getPageFromHash() {
  const page = window.location.hash.slice(1);
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
  const notifications = useNotifications(user.role === 'applicant', user.email);
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

        <nav className="nav-links">
          {navigation.filter((item) => !item.applicantOnly || user.role === 'applicant').map((item) => (
            <a
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              href={`#${item.id}`}
              key={item.id}
            >
              {item.label}
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
