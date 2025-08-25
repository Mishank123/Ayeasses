// Assessment validation utility
export const validateAssessment = (data) => {
  const errors = {};

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters long';
  }

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length < 5) {
    errors.description = 'Description must be at least 5 characters long';
  }

  // Category validation (optional)
  if (data.category && data.category.trim().length === 0) {
    errors.category = 'Category cannot be empty if provided';
  }

  // Difficulty level validation
  if (data.difficultyLevel && !['beginner', 'intermediate', 'advanced', 'expert'].includes(data.difficultyLevel)) {
    errors.difficultyLevel = 'Difficulty level must be one of: beginner, intermediate, advanced, expert';
  }

  // Estimated duration validation
  if (data.estimatedDuration) {
    const duration = parseInt(data.estimatedDuration);
    if (isNaN(duration) || duration < 1 || duration > 480) {
      errors.estimatedDuration = 'Estimated duration must be between 1 and 480 minutes';
    }
  }

  // Assessment type validation
  if (data.assessmentType && !['video', 'text', 'audio'].includes(data.assessmentType)) {
    errors.assessmentType = 'Assessment type must be one of: video, text, audio';
  }

  // Status validation
  if (data.status && !['draft', 'published'].includes(data.status)) {
    errors.status = 'Status must be either draft or published';
  }

  // File validation for published status
  if (data.status === 'published' && !data.questionsFile && !data.existingFile) {
    errors.questionsFile = 'Questions file is required when publishing an assessment';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// File validation
export const validateFile = (file) => {
  const errors = {};

  if (!file) {
    return { isValid: true, errors: {} };
  }

  // File size validation (5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    errors.size = 'File size must be less than 5MB';
  }

  // File type validation
  const allowedTypes = [
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.type = 'Only PDF, CSV, and Excel files are allowed';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Form data preparation
export const prepareAssessmentData = (formData) => {
  return {
    title: formData.title?.trim() || '',
    description: formData.description?.trim() || '',
    category: formData.category?.trim() || '',
    difficultyLevel: formData.difficultyLevel || '',
    estimatedDuration: formData.estimatedDuration || 20,
    assessmentType: formData.assessmentType || 'video',
    status: formData.status || 'draft',
    avatarConfig: {
      avatarPersona: formData.avatarPersona || '',
      voiceTone: formData.voiceTone || '',
      voiceSpeed: formData.voiceSpeed || 'normal',
      language: formData.language || 'english',
      welcomeMessage: formData.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience."
    }
  };
};

// Error message formatting
export const formatValidationErrors = (apiErrors) => {
  const formattedErrors = {};
  
  if (apiErrors && Array.isArray(apiErrors)) {
    apiErrors.forEach(error => {
      const fieldName = error.path || error.field || 'general';
      formattedErrors[fieldName] = error.msg || error.message || 'Validation error';
    });
  }
  
  return formattedErrors;
};

// Default assessment data
export const getDefaultAssessmentData = () => ({
  title: '',
  description: '',
  category: '',
  difficultyLevel: '',
  estimatedDuration: 20,
  assessmentType: 'video',
  status: 'draft',
  questionsFile: null,
  avatarPersona: '',
  voiceTone: '',
  voiceSpeed: 'normal',
  language: 'english',
  welcomeMessage: "Welcome to this assessment! I'm here to guide you through this learning experience."
});

// Difficulty level options
export const difficultyLevels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

// Assessment type options
export const assessmentTypes = [
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Text' },
  { value: 'audio', label: 'Audio' }
];

// Status options
export const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' }
];
