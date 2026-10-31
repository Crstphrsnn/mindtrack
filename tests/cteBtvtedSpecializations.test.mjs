import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collegePrograms as rawCollegePrograms } from '../src/config/programs.js';

const cteMajors = [
  'Bachelor of Secondary Education - Major in English',
  'Bachelor of Secondary Education - Major in Filipino',
  'Bachelor of Secondary Education - Major in Social Studies',
  'Bachelor of Secondary Education - Major in Science',
  'Bachelor of Technical-Vocational Teacher Education - Major in Garments Fashion and Design',
  'Bachelor of Technical-Vocational Teacher Education - Major in Food Service Management',
  'Bachelor of Technology and Livelihood Education - Major in Home Economics'
];

test('CTE dropdown contains exactly the seven requested majors in order', () => {
  assert.deepEqual(rawCollegePrograms('College of Education'), cteMajors);
  assert.equal(new Set(cteMajors).size, 7);
});

test('Old CTE generic programs and removed BTVTEd majors are not offered', () => {
  const choices = rawCollegePrograms('College of Education');
  for (const old of [
    'Bachelor of Secondary Education',
    'Bachelor of Technical-Vocational Teacher Education',
    'Bachelor of Technology and Livelihood Education',
    'Bachelor of Technical-Vocational Teacher Education - Major in Automotive Technology',
    'Bachelor of Technical-Vocational Teacher Education - Major in Drafting Technology',
    'Bachelor of Technical-Vocational Teacher Education - Major in Electrical Technology',
    'Bachelor of Technical-Vocational Teacher Education - Major in Electronics Technology',
    'Bachelor of Technical-Vocational Teacher Education - Specialization in Automotive Technology'
  ]) {
    assert.ok(!choices.includes(old), `Old CTE choice still present: ${old}`);
  }
});

test('The CTE alias still routes the official college name to the existing catalog', () => {
  const roster = readFileSync(new URL('../src/config/collegeRoster.js', import.meta.url), 'utf8');
  assert.match(roster, /"College of Teacher Education": "College of Education"/);
  assert.match(roster, /existingCollegePrograms\(previousName\)/);
});

test('Registration and referral forms both use the shared catalog', () => {
  const register = readFileSync(new URL('../src/pages/auth/Register.jsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(register, /from "\.\.\/\.\.\/config\/collegeRoster"/);
  assert.match(register, /collegePrograms\(/);
  assert.match(app, /from "\.\/config\/collegeRoster"/);
  assert.match(app, /collegePrograms\(form\.department\)\.includes\(form\.program\)/);
});

test('The seven CTE majors do not appear under other colleges', () => {
  for (const college of [
    'College of Computing Sciences',
    'College of Industrial Technology',
    'College of Arts, Sciences and Letters',
    'College of Business and Public Administration',
    'College of Tourism and Hospitality Management'
  ]) {
    for (const program of cteMajors) {
      assert.ok(!rawCollegePrograms(college).includes(program), `${program} appeared under ${college}`);
    }
  }
});
