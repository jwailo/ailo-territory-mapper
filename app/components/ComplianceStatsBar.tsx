'use client';

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { CompanyData, ComplianceZone, ComplianceStats } from '../types';

interface ComplianceStatsBarProps {
  companies: CompanyData[];
  zones: ComplianceZone[];
  visible: boolean;
}

function isInComplianceZone(
  company: CompanyData,
  zones: ComplianceZone[]
): boolean {
  if (!company.lat || !company.long) return false;

  const point = turf.point([company.long, company.lat]);

  for (const zone of zones) {
    try {
      // Ensure polygon is properly closed
      const coords = [...zone.polygon];
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first]);
        }
      }

      const turfPolygon = turf.polygon([coords]);
      if (turf.booleanPointInPolygon(point, turfPolygon)) {
        return true;
      }
    } catch (e) {
      console.warn('Error checking point in polygon:', e);
    }
  }

  return false;
}

export default function ComplianceStatsBar({
  companies,
  zones,
  visible,
}: ComplianceStatsBarProps) {
  const stats: ComplianceStats = useMemo(() => {
    if (!visible || zones.length === 0) {
      return { companyCount: 0, totalPUM: 0 };
    }

    let companyCount = 0;
    let totalPUM = 0;

    for (const company of companies) {
      if (isInComplianceZone(company, zones)) {
        companyCount++;
        totalPUM += company.pum || 0;
      }
    }

    return { companyCount, totalPUM };
  }, [companies, zones, visible]);

  if (!visible || zones.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-50 border-t-2 border-blue-400 px-4 py-2 z-[1000]">
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: '#3B82F6', opacity: 0.6 }}
          />
          <span className="font-semibold text-blue-800">Compliance Zone:</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-700">
            <span className="font-bold text-blue-900">{stats.companyCount.toLocaleString()}</span>
            {' '}
            {stats.companyCount === 1 ? 'company' : 'companies'}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-blue-700">
            <span className="font-bold text-blue-900">{stats.totalPUM.toLocaleString()}</span>
            {' '}
            PUM
          </span>
          <span className="text-xs text-gray-500">(filtered by selected owner/s)</span>
        </div>
      </div>
    </div>
  );
}
