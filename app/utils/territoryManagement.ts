import {
  Territory,
  SavedTerritoryState,
  PostcodeData,
  COLOR_PALETTE,
} from '../types';

const STORAGE_KEY = 'territory_state';

// Generate a unique ID for new territories
function generateId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get next available color from palette
export function getNextColor(territories: Record<string, Territory>): string {
  const usedColors = new Set(Object.values(territories).map((t) => t.color));
  const availableColor = COLOR_PALETTE.find((c) => !usedColors.has(c));
  return availableColor || COLOR_PALETTE[Object.keys(territories).length % COLOR_PALETTE.length];
}

// Create a new territory
export function createTerritory(
  name: string,
  territories: Record<string, Territory>,
  color?: string
): { territories: Record<string, Territory>; newTerritory: Territory } {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Territory name cannot be empty');
  }

  // Check for duplicate names
  const existingNames = Object.values(territories).map((t) => t.name.toLowerCase());
  if (existingNames.includes(trimmedName.toLowerCase())) {
    throw new Error(`Territory "${trimmedName}" already exists`);
  }

  const id = generateId();
  const territoryColor = color || getNextColor(territories);

  const newTerritory: Territory = {
    id,
    name: trimmedName,
    color: territoryColor,
  };

  return {
    territories: {
      ...territories,
      [id]: newTerritory,
    },
    newTerritory,
  };
}

// Update an existing territory
export function updateTerritory(
  id: string,
  updates: Partial<Pick<Territory, 'name' | 'color'>>,
  territories: Record<string, Territory>,
  postcodes: Record<string, PostcodeData>
): { territories: Record<string, Territory>; postcodes: Record<string, PostcodeData> } {
  const territory = territories[id];
  if (!territory) {
    throw new Error('Territory not found');
  }

  const oldName = territory.name;
  const newName = updates.name?.trim() || oldName;

  // Check for duplicate names (excluding current territory)
  if (updates.name) {
    const existingNames = Object.values(territories)
      .filter((t) => t.id !== id)
      .map((t) => t.name.toLowerCase());
    if (existingNames.includes(newName.toLowerCase())) {
      throw new Error(`Territory "${newName}" already exists`);
    }
  }

  // Update territory
  const updatedTerritory: Territory = {
    ...territory,
    name: newName,
    color: updates.color || territory.color,
  };

  // Update postcodes if name changed
  const updatedPostcodes = { ...postcodes };
  if (oldName !== newName) {
    for (const pc of Object.values(updatedPostcodes)) {
      if (pc.territory === oldName) {
        pc.territory = newName;
      }
    }
  }

  return {
    territories: {
      ...territories,
      [id]: updatedTerritory,
    },
    postcodes: updatedPostcodes,
  };
}

// Delete a territory and unassign all its postcodes
export function deleteTerritory(
  id: string,
  territories: Record<string, Territory>,
  postcodes: Record<string, PostcodeData>
): { territories: Record<string, Territory>; postcodes: Record<string, PostcodeData>; clearedCount: number } {
  const territory = territories[id];
  if (!territory) {
    throw new Error('Territory not found');
  }

  // Count and clear postcodes
  let clearedCount = 0;
  const updatedPostcodes = { ...postcodes };
  for (const pc of Object.values(updatedPostcodes)) {
    if (pc.territory === territory.name) {
      pc.territory = null;
      clearedCount++;
    }
  }

  // Remove territory
  const { [id]: _removed, ...remainingTerritories } = territories;
  void _removed; // Destructure to remove, value not needed

  return {
    territories: remainingTerritories,
    postcodes: updatedPostcodes,
    clearedCount,
  };
}

// Save state to localStorage
export function saveToLocalStorage(
  territories: Record<string, Territory>,
  postcodes: Record<string, PostcodeData>
): void {
  // Build postcode assignments map (only assigned postcodes)
  const postcodeAssignments: Record<string, string> = {};
  for (const [key, pc] of Object.entries(postcodes)) {
    if (pc.territory) {
      postcodeAssignments[key] = pc.territory;
    }
  }

  const state: SavedTerritoryState = {
    territories,
    postcodeAssignments,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load state from localStorage
export function loadFromLocalStorage(): SavedTerritoryState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as SavedTerritoryState;

    // Validate structure
    if (!state.territories || !state.postcodeAssignments) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

// Apply loaded state to postcodes
export function applyLoadedState(
  savedState: SavedTerritoryState,
  postcodes: Record<string, PostcodeData>
): void {
  // First clear all territory assignments
  for (const pc of Object.values(postcodes)) {
    pc.territory = null;
  }

  // Apply saved assignments
  for (const [key, territoryName] of Object.entries(savedState.postcodeAssignments)) {
    if (postcodes[key]) {
      postcodes[key].territory = territoryName;
    }
  }
}

// Clear localStorage
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Export state as JSON file (for manual backup)
export function exportStateJSON(
  territories: Record<string, Territory>,
  postcodes: Record<string, PostcodeData>
): void {
  const postcodeAssignments: Record<string, string> = {};
  for (const [key, pc] of Object.entries(postcodes)) {
    if (pc.territory) {
      postcodeAssignments[key] = pc.territory;
    }
  }

  const state: SavedTerritoryState = {
    territories,
    postcodeAssignments,
  };

  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'territory_state.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import state from JSON file
export function importStateJSON(file: File): Promise<SavedTerritoryState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SavedTerritoryState;

        // Validate structure
        if (!data.territories || !data.postcodeAssignments) {
          throw new Error('Invalid state file format');
        }

        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
