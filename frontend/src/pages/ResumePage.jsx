import PageHeader from '../Components/PageHeader.jsx';

export default function ResumePage() {
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
