import { useState } from 'react';

const STORAGE_KEY = 'thefantastic7-resume-builder';

const blankEducation = () => ({ school: '', location: '', degree: '', expectedGraduation: '' });
const blankExperience = () => ({ title: '', company: '', location: '', dates: '', bullets: '' });
const blankProject = () => ({ name: '', stack: '', dates: '', bullets: '' });

const emptyResume = {
  contact: { name: '', phone: '', email: '', linkedin: '', github: '' },
  education: [blankEducation()],
  experience: [blankExperience()],
  projects: [blankProject()],
  skills: { languages: '', frameworks: '', tools: '', libraries: '' },
};

function loadResume() {
  try {
    const savedResume = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (savedResume && typeof savedResume === 'object') {
      return {
        ...emptyResume,
        ...savedResume,
        contact: { ...emptyResume.contact, ...savedResume.contact },
        skills: { ...emptyResume.skills, ...savedResume.skills },
        education: Array.isArray(savedResume.education) ? savedResume.education.map((entry) => ({
          ...entry,
          expectedGraduation: entry.expectedGraduation || entry.dates || '',
        })) : emptyResume.education,
        experience: Array.isArray(savedResume.experience) ? savedResume.experience : emptyResume.experience,
        projects: Array.isArray(savedResume.projects) ? savedResume.projects : emptyResume.projects,
      };
    }
  } catch {
    // A malformed saved draft should not block opening the builder.
  }
  return emptyResume;
}

function Field({ label, value, onChange, multiline = false, placeholder = '' }) {
  const props = { value, onChange: (event) => onChange(event.target.value), placeholder };
  return <label className="field"><span>{label}</span>{multiline ? <textarea {...props} rows="3" /> : <input {...props} />}</label>;
}

export default function ResumeBuilder({ busy, onRender, onClose }) {
  const [resume, setResume] = useState(loadResume);

  function updateContact(key, value) {
    setResume((current) => {
      const nextResume = { ...current, contact: { ...current.contact, [key]: value } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResume));
      return nextResume;
    });
  }

  function updateSkills(key, value) {
    setResume((current) => {
      const nextResume = { ...current, skills: { ...current.skills, [key]: value } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResume));
      return nextResume;
    });
  }

  function updateEntry(section, index, key, value) {
    setResume((current) => {
      const nextResume = {
        ...current,
        [section]: current[section].map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResume));
      return nextResume;
    });
  }

  function addEntry(section, entry) {
    setResume((current) => {
      const nextResume = { ...current, [section]: [...current[section], entry()] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResume));
      return nextResume;
    });
  }

  function removeEntry(section, index) {
    setResume((current) => {
      const nextResume = { ...current, [section]: current[section].filter((_, entryIndex) => entryIndex !== index) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResume));
      return nextResume;
    });
  }

  return <section className="builder" aria-label="Resume builder">
    <div className="builder-heading">
      <div><h2>Build your resume</h2><p>Fields follow Jake’s resume structure. Leave any optional section blank to omit it.</p></div>
      <button className="secondary" onClick={onClose} disabled={busy}>Back</button>
    </div>
    <div className="builder-scroll">
      <section className="builder-section">
        <h3>Contact</h3>
        <div className="field-grid">
          <Field label="Full name" value={resume.contact.name} onChange={(value) => updateContact('name', value)} placeholder="Jane Doe" />
          <Field label="Phone Number" value={resume.contact.phone} onChange={(value) => updateContact('phone', value)} placeholder="123-456-7890" />
          <Field label="Email" value={resume.contact.email} onChange={(value) => updateContact('email', value)} placeholder="jane@email.com" />
          <Field label="LinkedIn" value={resume.contact.linkedin} onChange={(value) => updateContact('linkedin', value)} placeholder="linkedin.com/in/jane" />
          <Field label="GitHub" value={resume.contact.github} onChange={(value) => updateContact('github', value)} placeholder="github.com/jane" />
        </div>
      </section>

      <EntrySection title="Education" entryLabel="Education" entries={resume.education} section="education" addLabel="Add education" onAdd={() => addEntry('education', blankEducation)} onRemove={removeEntry}>
        {(entry, index) => <div className="field-grid">
          <Field label="School" value={entry.school} onChange={(value) => updateEntry('education', index, 'school', value)} />
          <Field label="Location" value={entry.location} onChange={(value) => updateEntry('education', index, 'location', value)} placeholder="Edmonton, AB" />
          <Field label="Degree" value={entry.degree} onChange={(value) => updateEntry('education', index, 'degree', value)} placeholder="BSc in Computing Science" />
          <Field label="Expected Graduation Date" value={entry.expectedGraduation || ''} onChange={(value) => updateEntry('education', index, 'expectedGraduation', value)} placeholder="May 2025" />
        </div>}
      </EntrySection>

      <EntrySection title="Experience" entryLabel="Experience" entries={resume.experience} section="experience" addLabel="Add experience" onAdd={() => addEntry('experience', blankExperience)} onRemove={removeEntry}>
        {(entry, index) => <div className="field-grid">
          <Field label="Job Title" value={entry.title} onChange={(value) => updateEntry('experience', index, 'title', value)} />
          <Field label="Company" value={entry.company} onChange={(value) => updateEntry('experience', index, 'company', value)} />
          <Field label="Location" value={entry.location} onChange={(value) => updateEntry('experience', index, 'location', value)} />
          <Field label="Dates" value={entry.dates} onChange={(value) => updateEntry('experience', index, 'dates', value)} />
          <Field label="Highlights" value={entry.bullets} onChange={(value) => updateEntry('experience', index, 'bullets', value)} multiline placeholder="One achievement per line" />
        </div>}
      </EntrySection>

      <EntrySection title="Projects" entryLabel="Project" entries={resume.projects} section="projects" addLabel="Add project" onAdd={() => addEntry('projects', blankProject)} onRemove={removeEntry}>
        {(entry, index) => <div className="field-grid">
          <Field label="Project Name" value={entry.name} onChange={(value) => updateEntry('projects', index, 'name', value)} />
          <Field label="Tools / Technologies" value={entry.stack} onChange={(value) => updateEntry('projects', index, 'stack', value)} placeholder="React, Django, PostgreSQL" />
          <Field label="Dates" value={entry.dates} onChange={(value) => updateEntry('projects', index, 'dates', value)} />
          <Field label="Highlights" value={entry.bullets} onChange={(value) => updateEntry('projects', index, 'bullets', value)} multiline placeholder="One achievement per line" />
        </div>}
      </EntrySection>

      <section className="builder-section">
        <h3>Technical skills</h3>
        <div className="field-grid">
          <Field label="Languages" value={resume.skills.languages} onChange={(value) => updateSkills('languages', value)} placeholder="Python, JavaScript, SQL" />
          <Field label="Frameworks" value={resume.skills.frameworks} onChange={(value) => updateSkills('frameworks', value)} placeholder="React, Django" />
          <Field label="Developer Tools" value={resume.skills.tools} onChange={(value) => updateSkills('tools', value)} placeholder="Git, Docker, VS Code" />
          <Field label="Libraries" value={resume.skills.libraries} onChange={(value) => updateSkills('libraries', value)} placeholder="pandas, NumPy" />
        </div>
      </section>
    </div>
    <button className="render-button" onClick={() => onRender(resume)} disabled={busy}>{busy ? 'Rendering…' : 'Render resume'}</button>
  </section>;
}

function EntrySection({ title, entryLabel, entries, section, addLabel, onAdd, onRemove, children }) {
  return <section className="builder-section">
    <div className="section-heading"><h3>{title}</h3><button className="secondary small-button" onClick={onAdd}>+ {addLabel}</button></div>
    {entries.map((entry, index) => <div className="resume-entry" key={`${section}-${index}`}>
      <div className="entry-title">{entryLabel} {index + 1}</div>
      {entries.length > 1 && <button className="remove-button" onClick={() => onRemove(section, index)} aria-label={`Remove ${entryLabel} ${index + 1}`}>Remove</button>}
      {children(entry, index)}
    </div>)}
  </section>;
}
