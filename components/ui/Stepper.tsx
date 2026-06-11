import React from 'react';

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, totalSteps, labels = [] }) => {
  return (
    <div className="w-full flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isPast = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div className="flex flex-col items-center relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 z-10 ${
                  isActive 
                    ? 'bg-[#ff6600] text-white shadow-lg shadow-orange-500/30 scale-110' 
                    : isPast 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {isPast ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              {labels[index] && (
                <span className={`absolute -bottom-6 text-xs whitespace-nowrap font-medium ${
                  isActive ? 'text-[#ff6600]' : 'text-gray-500'
                }`}>
                  {labels[index]}
                </span>
              )}
            </div>
            
            {stepNum < totalSteps && (
              <div 
                className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                  isPast ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                }`} 
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
