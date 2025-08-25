import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FileText, ChevronRight, Save, Eye, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import brainIcon from '../assets/images/Brain.png';
import brainAssessIcon from '../assets/images/BrainAssess.png';
import filePlusIcon from '../assets/images/FilePlusCourse.png';
import listPlusIcon from '../assets/images/ListPlus.png';
import assessmentService from '../services/assessmentService';
import { 
  validateAssessment, 
  validateFile, 
  prepareAssessmentData,
  formatValidationErrors,
  getDefaultAssessmentData,
  difficultyLevels,
  assessmentTypes,
  statusOptions
} from '../utils/assessmentValidation';

const CreateAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;
  
  const [activeTab, setActiveTab] = useState('avatar');
  const [enableVideoAvatar, setEnableVideoAvatar] = useState(false);
  const [autoStartAvatar, setAutoStartAvatar] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState(getDefaultAssessmentData());
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFile, setExistingFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // Load assessment data for editing
  useEffect(() => {
    if (isEditMode) {
      loadAssessmentData();
    }
    // Clear any existing validation errors on mount
    setValidationErrors({});
  }, [id]);

  // Clear all validation errors
  const clearValidationErrors = () => {
    setValidationErrors({});
  };



  const loadAssessmentData = async () => {
    try {
      const result = await assessmentService.getAssessmentById(id);
      if (result.success) {
        const assessment = result.data;
        // Parse avatar config if it exists
        let avatarConfig = {};
        if (assessment.avatarConfig) {
          try {
            avatarConfig = typeof assessment.avatarConfig === 'string' 
              ? JSON.parse(assessment.avatarConfig) 
              : assessment.avatarConfig;
          } catch (error) {
            console.error('Error parsing avatar config:', error);
          }
        }

        setFormData({
          title: assessment.title || '',
          description: assessment.description || '',
          category: assessment.category || '',
          difficultyLevel: assessment.difficultyLevel || '',
          estimatedDuration: assessment.estimatedDuration || 20,
          assessmentType: assessment.assessmentType || 'video',
          status: assessment.status || 'draft',
          avatarPersona: avatarConfig.avatarPersona || '',
          voiceTone: avatarConfig.voiceTone || '',
          voiceSpeed: avatarConfig.voiceSpeed || 'normal',
          language: avatarConfig.language || 'english',
          welcomeMessage: avatarConfig.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience."
        });
        
        // Set existing file if available
        if (assessment.questionsFile) {
          setExistingFile(assessment.questionsFile);
        }
      } else {
        toast.error('Failed to load assessment data');
        navigate('/my-assessment');
      }
    } catch (error) {
      toast.error('Failed to load assessment data');
      navigate('/my-assessment');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field immediately
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };



  // Handle file selection and upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileValidation = validateFile(file);
      if (fileValidation.isValid) {
        setSelectedFile(file);
        setFormData(prev => ({
          ...prev,
          questionsFile: file
        }));
        
        // Clear file validation error
        if (validationErrors.questionsFile) {
          setValidationErrors(prev => ({
            ...prev,
            questionsFile: ''
          }));
        }

        // Upload file immediately
        try {
          setUploading(true);
          const formData = new FormData();
          formData.append('file', file);
          
                      const response = await fetch('http://localhost:5000/api/upload/gcp/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            setUploadedFileId(result.fileId);
            setUploadedFileUrl(result.fileUrl);
            toast.success('File uploaded successfully!');
          } else {
            const error = await response.json();
            toast.error(error.error || 'Failed to upload file');
            e.target.value = '';
            setSelectedFile(null);
          }
        } catch (error) {
          console.error('File upload error:', error);
          toast.error('Failed to upload file');
          e.target.value = '';
          setSelectedFile(null);
        } finally {
          setUploading(false);
        }
      } else {
        setValidationErrors(prev => ({
          ...prev,
          questionsFile: Object.values(fileValidation.errors)[0]
        }));
        e.target.value = '';
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Set status to draft automatically
    const formDataWithDraft = {
      ...formData,
      status: 'draft'
    };
    
    // Validate form data (no file required for draft)
    const validation = validateAssessment({
      ...formDataWithDraft,
      questionsFile: selectedFile || existingFile
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please fix the validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const assessmentData = prepareAssessmentData(formDataWithDraft);
      let result;
      
      if (isEditMode) {
        result = await assessmentService.updateAssessment(id, assessmentData, selectedFile);
      } else {
        result = await assessmentService.createAssessment(assessmentData, selectedFile);
      }

      if (result.success) {
        toast.success(isEditMode ? 'Assessment updated successfully!' : 'Assessment saved as draft successfully!');
        navigate('/my-assessment');
      } else {
        if (result.details) {
          const formattedErrors = formatValidationErrors(result.details);
          setValidationErrors(formattedErrors);
          toast.error('Please fix the validation errors');
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update assessment' : 'Failed to save assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle publish assessment
  const handlePublish = async () => {
    if (!uploadedFileId && !existingFile) {
      toast.error('Please upload a file before publishing');
      return;
    }

    // Set status to draft for initial creation
    const formDataWithDraft = {
      ...formData,
      status: 'draft'
    };
    
    // Clear any existing validation errors
    setValidationErrors({});

    setIsSubmitting(true);

    try {
      const assessmentData = prepareAssessmentData(formDataWithDraft);

      let result;
      
      // Prepare publish data with avatar configuration from form
      const publishData = {
        questionsFileId: uploadedFileId || null, // Can be null if using existing file
        avatarConfig: {
          avatarPersona: formData.avatarPersona || '',
          voiceTone: formData.voiceTone || '',
          voiceSpeed: formData.voiceSpeed || 'normal',
          language: formData.language || 'english',
          welcomeMessage: formData.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience.",
          enableVideoAvatar: enableVideoAvatar,
          autoStartAvatar: autoStartAvatar
        },
        assessmentType: formData.assessmentType
      };

      if (isEditMode) {
        // For editing, first update the assessment with draft status, then publish it
        const draftData = { ...assessmentData, status: 'draft' };
        console.log('Updating assessment with:', draftData);
        const updateResult = await assessmentService.updateAssessment(id, draftData);
        if (updateResult.success) {
          console.log('Publishing assessment with:', publishData);
          result = await assessmentService.publishAssessment(id, publishData);
        } else {
          result = updateResult;
        }
      } else {
        // For new assessment, create it first with draft status, then publish
        const draftData = { ...assessmentData, status: 'draft' };
        console.log('Creating assessment with:', draftData);
        const createResult = await assessmentService.createAssessment(draftData);
        if (createResult.success) {
          console.log('Publishing assessment with:', publishData);
          result = await assessmentService.publishAssessment(createResult.data.assessment.id, publishData);
        } else {
          result = createResult;
        }
      }

      if (result.success) {
        toast.success(isEditMode ? 'Assessment published successfully!' : 'Assessment published successfully!');
        navigate('/my-assessment');
      } else {
        console.error('Publish failed:', result);
        if (result.details) {
          const formattedErrors = formatValidationErrors(result.details);
          setValidationErrors(formattedErrors);
          toast.error('Please fix the validation errors');
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(isEditMode ? 'Failed to publish assessment' : 'Failed to publish assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Assessment' : 'Create New Assessment'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode ? 'Update your assessment details and settings.' : 'Build an interactive AI-powered learning experience.'}
          </p>
          
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-500 mt-4">
            <span className="text-purple-600">Aye Assess</span>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-purple-600">My Assessments</span>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span>{isEditMode ? 'Edit Assessment' : 'Create Assessment'}</span>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              <p className="text-gray-600">Set up the basic details for your assessment</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assessment Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Title *
              </label>
                             <input
                 type="text"
                 name="title"
                 value={formData.title}
                 onChange={handleInputChange}
                 placeholder="Enter assessment title..."
                 className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                   validationErrors.title ? 'border-red-300' : 'border-gray-300'
                 }`}
               />
              {validationErrors.title && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
                             <textarea
                 name="description"
                 value={formData.description}
                 onChange={handleInputChange}
                 rows={3}
                 placeholder="Describe what learners will experience..."
                 className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                   validationErrors.description ? 'border-red-300' : 'border-gray-300'
                 }`}
               />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  validationErrors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Category</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="technology">Technology</option>
                <option value="business">Business</option>
                <option value="education">Education</option>
                <option value="marketing">Marketing</option>
              </select>
              {validationErrors.category && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
              )}
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select 
                name="difficultyLevel"
                value={formData.difficultyLevel}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  validationErrors.difficultyLevel ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select Difficulty Level</option>
                {difficultyLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {validationErrors.difficultyLevel && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.difficultyLevel}</p>
              )}
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                name="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={handleInputChange}
                min="1"
                max="480"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  validationErrors.estimatedDuration ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {validationErrors.estimatedDuration && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.estimatedDuration}</p>
              )}
            </div>

            {/* Assessment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Type
              </label>
              <select 
                name="assessmentType"
                value={formData.assessmentType}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  validationErrors.assessmentType ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {assessmentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} Assessment
                  </option>
                ))}
              </select>
              {validationErrors.assessmentType && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.assessmentType}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: AI Conversation Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex flex-col items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <img src={brainIcon} alt="Brain" className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-32 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">AI Conversation Content</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Upload className="h-4 w-4" />
                    <span>Upload files to begin AI processing</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">Configure the AI-powered conversational assessment with avatar, voice, and learning materials</p>
              </div>
            </div>
          </div>

          {/* Tabs Container */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            {/* Tabs Navigation */}
            <nav className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('avatar')}
                className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'avatar'
                    ? 'bg-white text-blue-600 border border-gray-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <img src={brainAssessIcon} alt="Avatar & Voice" className="w-4 h-4" />
                Avatar & Voice
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'content'
                    ? 'bg-white text-blue-600 border border-gray-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <img src={filePlusIcon} alt="Learning Content" className="w-4 h-4" />
                Learning Content
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-white text-blue-600 border border-gray-200 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <img src={listPlusIcon} alt="AI Settings" className="w-4 h-4" />
                AI Settings
              </button>
            </nav>

            {/* Tab Content - Avatar & Voice */}
            {activeTab === 'avatar' && (
              <div className="space-y-6">
                {/* Avatar Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Avatar Configuration</h3>
                  <p className="text-gray-600 text-sm mb-4">Configure the AI avatar persona, voice, and interaction style</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Avatar Persona
                      </label>
                      <select 
                        name="avatarPersona"
                        value={formData.avatarPersona || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select Avatar</option>
                        <option value="dr-jacob-jones">Dr. Jacob Jones - Experienced male doctor</option>
                        <option value="dr-jane-doe">Dr. Jane Doe - Compassionate female doctor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice Tone
                      </label>
                      <select 
                        name="voiceTone"
                        value={formData.voiceTone || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select Tone</option>
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="authoritative">Authoritative</option>
                        <option value="calm">Calm</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice Speed
                      </label>
                      <select 
                        name="voiceSpeed"
                        value={formData.voiceSpeed || 'normal'}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="normal">Normal</option>
                        <option value="slow">Slow</option>
                        <option value="fast">Fast</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select 
                        name="language"
                        value={formData.language || 'english'}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Welcome Message
                    </label>
                    <textarea
                      name="welcomeMessage"
                      value={formData.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience."}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      This message will be spoken by the avatar when learners start the assessment.
                    </p>
                  </div>
                </div>

                {/* Video Avatar Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Avatar Configuration</h3>
                  <p className="text-gray-600 mb-4">Configure video avatar for interactive conversations</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enable Video Avatar
                        </label>
                        <p className="text-sm text-gray-500">Use AI avatar for visual responses</p>
                      </div>
                      <button
                        onClick={() => setEnableVideoAvatar(!enableVideoAvatar)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          enableVideoAvatar ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            enableVideoAvatar ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Avatar Selection
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        <option>Select Avatar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video Quality
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        <option>Medium</option>
                        <option>Low</option>
                        <option>High</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Auto-start Avatar
                        </label>
                        <p className="text-sm text-gray-500">Automatically start avatar when conversation begins</p>
                      </div>
                      <button
                        onClick={() => setAutoStartAvatar(!autoStartAvatar)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoStartAvatar ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoStartAvatar ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content - Learning Content */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Learning Content</h3>
                  <p className="text-gray-600 text-sm mb-4">Upload your learning materials to configure the AI assessment</p>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Learning Content</h3>
                  <p className="text-gray-600 mb-4">Upload your learning materials to configure the AI assessment</p>
                  <p className="text-xs text-gray-500 mb-4">
                    PDF, CSV, Excel files up to 5MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="learning-file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="learning-file-upload"
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      uploading 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      'Choose File'
                    )}
                  </label>
                </div>
                
                {uploading && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Uploading file...</strong> Please wait while we upload your file to the cloud.
                    </p>
                  </div>
                )}
                
                {(uploadedFileId || existingFile) && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Uploaded:</strong> {selectedFile ? selectedFile.name : existingFile} 
                      {selectedFile && ` (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`}
                    </p>
                    {uploadedFileUrl && (
                      <p className="text-xs text-green-600 mt-1">
                        File URL: {uploadedFileUrl}
                      </p>
                    )}
                  </div>
                )}
                
                {validationErrors.questionsFile && (
                  <p className="text-sm text-red-600">{validationErrors.questionsFile}</p>
                )}
              </div>
            )}

            {/* Tab Content - AI Settings */}
            {activeTab === 'settings' && (
              <div className="text-center py-8">
                <img src={brainIcon} alt="Brain" className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Settings</h3>
                <p className="text-gray-600">Configure advanced AI parameters for your assessment</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 space-y-6">
        {/* Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditMode ? 'Update Draft' : 'Save as Draft'}
                </>
              )}
            </button>
                         <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
               <Eye className="h-4 w-4" />
               Preview
             </button>
            <button 
              onClick={handlePublish}
              disabled={(!uploadedFileId && !existingFile) || isSubmitting}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                (uploadedFileId || existingFile) 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditMode ? 'Updating...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {isEditMode ? 'Update & Publish' : 'Publish Assessment'}
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Upload questions files to enable publishing
            </p>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avatar Persona</span>
              <span className="text-sm font-medium text-gray-900">
                {formData.avatarPersona ? 
                  (formData.avatarPersona === 'dr-jacob-jones' ? 'Dr. Jacob Jones' : 
                   formData.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 
                   formData.avatarPersona) : 
                  'Not Selected'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Questions File</span>
              <span className={`text-sm font-medium ${(uploadedFileId || existingFile) ? 'text-green-600' : uploading ? 'text-blue-600' : 'text-red-600'}`}>
                {uploading ? 'Uploading...' : (uploadedFileId || existingFile) ? 'Uploaded' : 'Not Uploaded'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Context File</span>
              <span className="text-sm font-medium text-gray-900">Optional</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className="text-sm font-medium text-gray-900">
                {formData.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssessment;
