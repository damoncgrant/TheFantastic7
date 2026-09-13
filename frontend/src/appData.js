export const roleLabels = {
  applicant: 'Applicant',
  employer: 'Recruiter',
};

export const savedJobs = [
  { company: 'Evergreen Tech', role: 'Full Stack Developer', location: 'Edmonton, AB', type: 'Full time', profile: '/company-profiles/northstar-contact.png' },
  { company: 'Riverbend Studio', role: 'Frontend Engineer', location: 'Remote', type: 'Full time', profile: '/company-profiles/cedar-contact.png' },
  { company: 'Atlas Analytics', role: 'Product Developer', location: 'Calgary, AB', type: 'Hybrid', profile: '/company-profiles/prairie-contact.png' },
];

export const navigation = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'messages', label: 'Messages'},
  { id: 'notifications', label: 'Notifications', applicantOnly: true },
  { id: 'resume', label: 'Resume' },
  { id: 'saved', label: 'Saved jobs' },
];

export const applicationFilters = ['all', 'applied', 'interview', 'offer', 'rejected'];
