export const roleLabels = {
  applicant: 'Applicant',
  employer: 'Recruiter',
};

export const navigation = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'messages', label: 'Messages'},
  { id: 'notifications', label: 'Notifications', applicantOnly: true },
  { id: 'resume', label: 'Resume' },
];

export const applicationFilters = ['all', 'applied', 'interview', 'offer', 'rejected'];
