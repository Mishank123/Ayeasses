import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AyeAssess from './pages/AyeAssess';
import MyAssessment from './pages/MyAssessment';
import CreateAssessment from './pages/CreateAssessment';
import AvatarPersonalization from './components/AvatarPersonalization';
import AssessmentModeSelection from './components/AssessmentModeSelection';
import AssessmentProgress from './components/AssessmentProgress';
import VideoChatAssessment from './components/VideoChatAssessment';
import TextAssessment from './components/TextAssessment';
import Layout from './components/Layout/Layout';
import './index.css';

// Import test utility for debugging
import './utils/testHeygenAPI';
import './utils/simpleHeygenTest';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main App Routes
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <AyeAssess />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/aye-assess"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-assessment"
        element={
          <ProtectedRoute>
            <Layout>
              <MyAssessment />
            </Layout>
          </ProtectedRoute>
        }
      />
             <Route
         path="/create-assessment"
         element={
           <ProtectedRoute>
             <Layout>
               <CreateAssessment />
             </Layout>
           </ProtectedRoute>
         }
       />
       <Route
         path="/edit-assessment/:id"
         element={
           <ProtectedRoute>
             <Layout>
               <CreateAssessment />
             </Layout>
           </ProtectedRoute>
         }
       />
               <Route
          path="/assessment/:uuid/personalize"
          element={
            <ProtectedRoute>
              <AvatarPersonalization />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessment/:uuid"
          element={
            <ProtectedRoute>
              <AssessmentModeSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/:uuid/mode"
          element={
            <ProtectedRoute>
              <AssessmentModeSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/:uuid/progress"
          element={
            <ProtectedRoute>
              <AssessmentProgress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/:uuid/session"
          element={
            <ProtectedRoute>
              <VideoChatAssessment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/:uuid/text"
          element={
            <ProtectedRoute>
              <TextAssessment />
            </ProtectedRoute>
          }
        />
       
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">Help</h1>
                <p className="text-gray-600">Help and support page - developer will provide</p>
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">Report</h1>
                <p className="text-gray-600">Report and analytics page - developer will provide</p>
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Settings page - developer will provide</p>
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600">User profile page - developer will provide</p>
              </div>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/aye-assess" replace />} />
    </Routes>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
};

export default App;
