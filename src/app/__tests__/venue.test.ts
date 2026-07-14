import venueData from '../../data/venue.json';
import reportsData from '../../data/reports.json';

describe('Stadium Structural Mock Data (venue.json)', () => {
  test('should load correct stadium metadata', () => {
    expect(venueData.stadiumName).toBe("PITCH Arena (Metropolitan Hub)");
    expect(venueData.totalCapacity).toBe(80000);
  });

  test('should contain exactly 6 active gates with valid coordinates', () => {
    expect(venueData.gates).toHaveLength(6);
    venueData.gates.forEach(gate => {
      expect(gate.status).toBe("Active");
      expect(gate.id).toMatch(/^Gate [A-F]$/);
      expect(gate.coordinates.x).toBeGreaterThan(0);
      expect(gate.coordinates.x).toBeLessThan(500);
      expect(gate.coordinates.y).toBeGreaterThan(0);
      expect(gate.coordinates.y).toBeLessThan(500);
      expect(gate.transitConnections.length).toBeGreaterThan(0);
    });
  });

  test('should contain exactly 9 seating section zones with correct level designations', () => {
    expect(venueData.sections).toHaveLength(9);
    venueData.sections.forEach(sec => {
      expect(sec.id).toMatch(/^Sec \d{3}-\d{3}$/);
      expect(sec.capacity).toBeGreaterThan(0);
      expect(sec.baseOccupancyPercent).toBeGreaterThanOrEqual(10);
      expect(sec.baseOccupancyPercent).toBeLessThanOrEqual(100);
      expect(sec.nearestGate).toMatch(/^Gate [A-F]$/);
      expect(sec.amenities).toHaveProperty('restrooms');
      expect(sec.amenities).toHaveProperty('concessions');
    });
  });

  test('should contain details on accessibility services', () => {
    expect(venueData.accessibilityServices).toHaveProperty('wheelchairEscort');
    expect(venueData.accessibilityServices).toHaveProperty('elevators');
    expect(venueData.accessibilityServices).toHaveProperty('sensoryRooms');
    expect(venueData.accessibilityServices.sensoryRooms).toContain("Section 124");
  });
});

describe('Operational Logs Mock Data (reports.json)', () => {
  test('should contain a valid initial set of reports', () => {
    expect(reportsData.length).toBeGreaterThan(0);
    reportsData.forEach(rep => {
      expect(rep).toHaveProperty('id');
      expect(rep).toHaveProperty('timestamp');
      expect(rep).toHaveProperty('source');
      expect(rep).toHaveProperty('text');
      expect(rep).toHaveProperty('status');
      expect(rep).toHaveProperty('category');
    });
  });
});
