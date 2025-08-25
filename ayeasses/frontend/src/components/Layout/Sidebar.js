import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  FileText, 
  Settings,
  HelpCircle,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

// Import assets for My Assessment and Aye Assess
import myAssessmentIcon from '../../assets/images/Books.png';
import examIcon from '../../assets/images/Exam (1).png';
import examIconColored from '../../assets/images/Exam.png';

const navigation = [
  { name: 'Aye Assess', href: '/aye-assess', icon: examIcon, iconColored: examIconColored, isAsset: true },
  { name: 'My Assessment', href: '/my-assessment', icon: myAssessmentIcon, isAsset: true },
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Report', href: '/report', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = ({ isOpen, onClose, onCollapse }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapse) {
      onCollapse(newCollapsedState);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "fixed top-20 left-0 bottom-0 z-40 bg-gray-50 transform transition-all duration-300 ease-in-out lg:translate-x-0",
        isCollapsed ? "w-20" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Top collapse button */}
          <div className={clsx(
            "flex justify-end",
            isCollapsed ? "p-4" : "p-6"
          )}>
            <button 
              onClick={toggleCollapse}
              className="p-2 rounded-lg text-purple-600 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white transition-all duration-200"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className={clsx(
            "flex-1",
            isCollapsed ? "px-4" : "px-6"
          )}>
            <div className="space-y-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={clsx(
                      "flex items-center text-sm font-medium rounded-lg transition-colors duration-200",
                      isCollapsed 
                        ? "justify-center px-3 py-4" 
                        : "px-4 py-4",
                      isActive
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {item.isAsset ? (
                      <img 
                        src={isActive ? item.icon : (item.iconColored || item.icon)} 
                        alt={item.name}
                        className={clsx(
                          "object-contain",
                          isCollapsed ? "h-7 w-7" : "h-6 w-6 mr-4",
                          isActive ? "opacity-100" : "opacity-100"
                        )}
                      />
                    ) : (
                      <item.icon className={clsx(
                        isCollapsed ? "h-7 w-7" : "h-6 w-6 mr-4",
                        isActive ? "text-white" : "text-purple-600"
                      )} />
                    )}
                    {!isCollapsed && item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
