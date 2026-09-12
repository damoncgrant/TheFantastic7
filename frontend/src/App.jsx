import { useEffect, useState } from 'react';
import JobSwiper from './UserJobswiper';
import ProfilePage from './ProfilePage';
import { getInitials, loadProfile } from './profile';

// For this hackathon API, the active profile is provided explicitly.
// Set VITE_CANDIDATE_ID in frontend/.env.local to a UserProfile primary key.
const candidateId = import.meta.env.VITE_CANDIDATE_ID ?? 1;

// Temporary display data. These records can be replaced with Django API data later.
const applicationStats = [
  { label: 'Applications sent', value: '12' },
  { label: 'Interviews', value: '3' },
  { label: 'Offers', value: '1' },
];

const applications = [
  { company: 'Northstar Labs', role: 'Frontend Developer', date: 'Sep 10', status: 'Interview' },
  { company: 'Cedar Systems', role: 'Software Developer', date: 'Sep 8', status: 'Applied' },
  { company: 'Prairie Digital', role: 'UX Engineer', date: 'Sep 5', status: 'Applied' },
  { company: 'Aurora Health', role: 'Product Designer', date: 'Aug 29', status: 'Offer' },
  { company: 'Summit AI', role: 'Junior Developer', date: 'Aug 24', status: 'Rejected' },
];

const savedJobs = [
  { company: 'Evergreen Tech', role: 'Full Stack Developer', location: 'Edmonton, AB', type: 'Full time' },
  { company: 'Riverbend Studio', role: 'Frontend Engineer', location: 'Remote', type: 'Full time' },
  { company: 'Atlas Analytics', role: 'Product Developer', location: 'Calgary, AB', type: 'Hybrid' },
];

const navigation = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
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

function ApplicationRow({ application }) {
  return (
    <article className="application-row">
      <span className="company-mark" aria-hidden="true">
        {application.company.charAt(0)}
      </span>
      <div className="application-details">
        <strong>{application.role}</strong>
        <span>{application.company}{application.date ? ` • ${application.date}` : ''}</span>
      </div>
      <span className={`status ${application.status.toLowerCase()}`}>
        {application.status}
      </span>
    </article>
  );
}

function OverviewPage({ profile }) {
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
        <a className="primary-button button-link" href="#swipe">
          Start swiping <span aria-hidden="true">→</span>
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
        <div className="application-list">
          {applications.slice(0, 3).map((application) => (
            <ApplicationRow application={application} key={`${application.company}-${application.role}`} />
          ))}
        </div>
      </section>
    </>
  );
}

function ApplicationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Track your progress"
        title="Applications"
        description="Every opportunity and update in one place."
        action={<button className="primary-button" type="button">Add application</button>}
      />

      <section className="filter-row" aria-label="Application filters">
        <button className="filter-chip active" type="button">All</button>
        <button className="filter-chip" type="button">Applied</button>
        <button className="filter-chip" type="button">Interview</button>
        <button className="filter-chip" type="button">Offer</button>
      </section>

      <section className="content-panel page-panel" aria-labelledby="all-applications-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">12 total</p>
            <h2 id="all-applications-heading">All applications</h2>
          </div>
        </div>
        <div className="application-list">
          {applications.map((application) => (
            <ApplicationRow application={application} key={`${application.company}-${application.role}`} />
          ))}
        </div>
      </section>
    </>
  );
}

function ResumePage({ profile }) {
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
              <h2>{profile.name}</h2>
              <span>{[profile.headline, profile.location].filter(Boolean).join(' • ')}</span>
            </div>
            <span className="completion">85% complete</span>
          </div>

          <div className="resume-section">
            <h3>Summary</h3>
            <p>{profile.bio}</p>
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
  resume: ResumePage,
  saved: SavedJobsPage,
  swipe: JobSwiper,
  profile: ProfilePage,
};

function getPageFromHash() {
  const page = window.location.hash.slice(1);
  return Object.hasOwn(pages, page) ? page : 'overview';
}

export default function App() {
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [profile, setProfile] = useState(loadProfile);
  const ActivePage = pages[activePage];

  // Hash navigation keeps this prototype multi-page without adding a router.
  useEffect(() => {
    const updatePage = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', updatePage);
    return () => window.removeEventListener('hashchange', updatePage);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#overview" aria-label="Jobbler home">
          <span className="brand-mark">J</span>
          <span>jobbler</span>
        </a>

        <nav className="nav-links">
          {navigation.map((item) => (
            <a
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              href={`#${item.id}`}
              aria-current={activePage === item.id ? 'page' : undefined}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a className={`profile ${activePage === 'profile' ? 'active' : ''}`} href="#profile" aria-label="Edit personal profile" aria-current={activePage === 'profile' ? 'page' : undefined}>
          <span className="avatar" aria-hidden="true">{getInitials(profile.name)}</span>
          <span>
            <strong>{profile.name}</strong>
            <small>Job seeker</small>
          </span>
        </a>
      </aside>

      <main className="dashboard" key={activePage}>
        <ActivePage profile={profile} onSave={setProfile} candidateId={candidateId} />
      </main>
    </div>
  );
}
