'use client';

import { AssignmentMode, ASSIGNMENT_MODES } from '../types';

interface AssignmentModeSelectorProps {
  mode: AssignmentMode;
  onModeChange: (mode: AssignmentMode) => void;
}

export default function AssignmentModeSelector({
  mode,
  onModeChange,
}: AssignmentModeSelectorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="bg-purple-600 px-3 py-2 rounded-t-lg">
        <h3 className="text-white font-semibold text-sm">Assignment Mode</h3>
      </div>
      <div className="p-3 space-y-2">
        {ASSIGNMENT_MODES.map((option) => {
          const isSelected = mode === option.value;
          return (
            <label
              key={option.value}
              className={`
                flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors
                ${isSelected
                  ? 'bg-purple-50 border border-purple-200'
                  : 'hover:bg-gray-50 border border-transparent'}
              `}
            >
              <input
                type="radio"
                name="assignmentMode"
                value={option.value}
                checked={isSelected}
                onChange={() => onModeChange(option.value)}
                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isSelected ? 'text-purple-800' : 'text-gray-800'}`}>
                  {option.label}
                </p>
                <p className={`text-xs ${isSelected ? 'text-purple-600' : 'text-gray-500'}`}>
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
